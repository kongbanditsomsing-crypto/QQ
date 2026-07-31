import os
import json
import time
import threading
import requests
import aiohttp
import discord
from discord import app_commands
from discord.ext import commands, tasks
from flask import Flask, request

# --- CONFIGURATION ---
ADMIN_IDS = [1127935823195668480, 1488103702488154173]
DB_FILE = "users.json"

# อ่านค่าจาก Environment Variables บน Render
BOT_TOKEN = os.getenv("BOT_TOKEN")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI") # เช่น https://your-app.onrender.com/callback

# --- DATABASE MANAGEMENT ---
def load_db():
    if not os.path.exists(DB_FILE):
        return {}
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading DB: {e}")
        return {}

def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# --- REFRESH TOKEN LOGIC ---
async def refresh_oauth_token(user_id, refresh_token):
    url = "https://discord.com/api/v10/oauth2/token"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=data, headers=headers) as resp:
            if resp.status == 200:
                res_data = await resp.json()
                db = load_db()
                db[str(user_id)]["access_token"] = res_data["access_token"]
                db[str(user_id)]["refresh_token"] = res_data["refresh_token"]
                db[str(user_id)]["expires_at"] = time.time() + res_data["expires_in"]
                save_db(db)
                return res_data["access_token"]
            else:
                print(f"Failed to refresh token for {user_id}: {resp.status}")
                return None

async def get_valid_access_token(user_id, user_info):
    # ถ้า Token หมดอายุหรือกำลังจะหมดใน 5 นาที ให้ Refresh
    if time.time() >= user_info.get("expires_at", 0) - 300:
        return await refresh_oauth_token(user_id, user_info["refresh_token"])
    return user_info["access_token"]

# --- FLASK WEB SERVER (OAuth2 Callback & Keep Alive 24/7) ---
app = Flask(__name__)

@app.route("/")
def home():
    return "Bot status: ONLINE 24/7", 200

@app.route("/callback")
def callback():
    code = request.args.get("code")
    if not code:
        return "Authorization failed. No code provided.", 400

    url = "https://discord.com/api/v10/oauth2/token"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    res = requests.post(url, data=data, headers=headers)
    if res.status_code != 200:
        return "Failed to exchange code for token.", 400

    token_data = res.json()
    access_token = token_data["access_token"]
    refresh_token = token_data["refresh_token"]
    expires_at = time.time() + token_data["expires_in"]

    # ดึงข้อมูลผู้ใช้ที่ยินยอม
    user_res = requests.get(
        "https://discord.com/api/v10/users/@me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    if user_res.status_code != 200:
        return "Failed to fetch user profile.", 400

    user_info = user_res.json()
    user_id = str(user_info["id"])
    username = user_info["username"]

    # บันทึกเข้า Database
    db = load_db()
    db[user_id] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at,
        "username": username
    }
    save_db(db)

    return """
    <html>
        <head><title>Success</title></head>
        <body style="background-color: #2c2f33; color: white; font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h1>ยืนยันตัวตนสำเร็จแล้ว</h1>
            <p>คุณสามารถปิดหน้าได้เเล้ว</p>
        </body>
    </html>
    """, 200

def run_flask():
    port = int(os.getenv("PORT", 10000))
    app.run(host="0.0.0.0", port=port)

# --- DISCORD BOT SETUP ---
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"Error syncing commands: {e}")
    
    auto_refresh_loop.start()

# Loop ตรวจสอบและ Refresh Token ทุกๆ 12 ชั่วโมงอัตโนมัติ
@tasks.loop(hours=12)
async def auto_refresh_loop():
    db = load_db()
    print("Running scheduled token refresh...")
    for uid, udata in list(db.items()):
        await get_valid_access_token(uid, udata)

# --- COMMAND 1: /settoken (สำหรับสมาชิกทุกคน) ---
@bot.tree.command(name="settoken", description="รับลิงก์เฉยๆ")
async def settoken(interaction: discord.Interaction):
    oauth_url = (
        f"https://discord.com/oauth2/authorize?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}&response_type=code"
        f"&scope=identify%20guilds.join"
    )

    embed = discord.Embed(
        title="ระบบยืนยันตัวตนเข้าร่วมสมาชิก🪽་༘",
        description=(
            "กรุณากดปุ่ม **'ยืนยันตัวตน'** ด้านล่างเพื่อมอบสิทธิ์\n\n"
            "**สิทธิ์ที่ระบบขอ:**\n"
            "• เข้าถึงข้อมูลโปรไฟล์พื้นฐานของคุณ\n"
            "• ดึงคุณเข้าร่วมเซิร์ฟเวอร์ในเครืออัตโนมัติ\n\n"
            "*ข้อมูล Refresh Token ของคุณจะถูกบันทึกไว้อย่างปลอดภัย*"
        ),
        color=discord.Color.blue()
    )
    embed.set_thumbnail(url=bot.user.display_avatar.url)
    embed.set_footer(text="ระบบยืนยันตัวตนอัตโนมัติ 24/7")

    view = discord.ui.View()
    button = discord.ui.Button(label="ยืนยันตัวตนที่นี่.☘︎ ݁˖", url=oauth_url, style=discord.ButtonStyle.link)
    view.add_item(button)

    await interaction.response.send_message(embed=embed, view=view)

# --- COMMAND 2: /check (เฉพาะ 2 คนที่กำหนด) ---
@bot.tree.command(name="check", description="ตรวจสอบจำนวนบัญชีทั้งหมดที่ให้สิทธิ์ไว้ (Admin Only)")
async def check(interaction: discord.Interaction):
    if interaction.user.id not in ADMIN_IDS:
        await interaction.response.send_message("มึงไม่มีสิทธิ์ใช้คำสั่งนี้˙𐃷˙", ephemeral=True)
        return

    db = load_db()
    total_users = len(db)

    embed = discord.Embed(
        title="รายงานระบบฐานข้อมูลสมาชิก𝜗ৎ",
        description=f"ปัจจุบันมีผู้ให้สิทธิ์บอททั้งหมด **{total_users}** บัญชี",
        color=discord.Color.green()
    )
    
    # ดึงตัวอย่างรายชื่อ 10 คนแรก
    user_list = []
    for uid, udata in list(db.items())[15]:
        user_list.append(f"• <@{uid}> (`{udata.get('username', 'N/A')}`)")
    
    if user_list:
        embed.add_field(name="ตัวอย่างบัญชีในระบบ", value="\n".join(user_list), inline=False)
    
    embed.set_footer(text="ข้อมูลบางส่วน")
    await interaction.response.send_message(embed=embed, ephemeral=True)

# --- COMMAND 3: /join (เฉพาะ 2 คนที่กำหนด) ---
@bot.tree.command(name="join", description="ดึงคนเข้าเซิร์ฟ (Admin Only)")
@app_commands.describe(guild_id="ID ของเซิร์ฟเวอร์", amount="จำนวนคนที่ต้องการดึง")
async def join(interaction: discord.Interaction, guild_id: str, amount: int):
    if interaction.user.id not in ADMIN_IDS:
        await interaction.response.send_message("มึงไม่มีสิทธิ์ใช้คำสั่งนี้˙𐃷˙", ephemeral=True)
        return

    await interaction.response.defer(ephemeral=True)

    try:
        target_guild = await bot.fetch_guild(int(guild_id))
        guild_name = target_guild.name
    except Exception:
        guild_name = "ไม่เจอเซิร์ฟเวอร์ บอทอาจไม่อยู่ในเซิร์ฟนีִ้ ࣪𖤐"

    db = load_db()
    user_ids = list(db.keys())[:amount]

    success = 0
    failed = 0
    already_in = 0

    async with aiohttp.ClientSession() as session:
        for uid in user_ids:
            udata = db[uid]
            access_token = await get_valid_access_token(uid, udata)

            if not access_token:
                failed += 1
                continue

            # API ยิงดึงสมาชิกเข้า Guild
            url = f"https://discord.com/api/v10/guilds/{guild_id}/members/{uid}"
            headers = {
                "Authorization": f"Bot {BOT_TOKEN}",
                "Content-Type": "application/json"
            }
            json_payload = {"access_token": access_token}

            async with session.put(url, headers=headers, json=json_payload) as resp:
                if resp.status == 201:
                    success += 1
                elif resp.status == 204:
                    already_in += 1
                else:
                    failed += 1

    embed = discord.Embed(
        title="สรุปการดึงสมาชิกเข้าเซิร์ฟเวอร์𓈒𓍼𓏸",
        color=discord.Color.gold()
    )
    embed.add_field(name="เซิร์ฟเวอร์⊹ ࣪ ˖", value=f"**{guild_name}**\n(`{guild_id}`)", inline=False)
    embed.add_field(name="จำนวนที่ดึงสำเร็จ˙ᵕ˙", value=f"```yaml\n{success} คน\n```", inline=True)
    embed.add_field(name="อยู่ในเซิร์ฟอยู่แล้ว𝜗ৎ", value=f"```yaml\n{already_in} คน\n```", inline=True)
    embed.add_field(name="ไม่สำเร็จ𓂃 𓈒𓏸", value=f"```yaml\n{failed} คน\n```", inline=True)
    embed.add_field(name="บัญชีทั้งหมดที่มีในระบบ.𖥔 ݁ ˖", value=f"{len(db)} บัญชี", inline=False)
    embed.set_footer(text="all")

    await interaction.followup.send(embed=embed, ephemeral=True)

# --- START APPLICATION ---
if __name__ == "__main__":
    # รัน Web Server บนอีก Thread
    threading.Thread(target=run_flask, daemon=True).start()
    
    # รัน Discord Bot
    bot.run(BOT_TOKEN)
