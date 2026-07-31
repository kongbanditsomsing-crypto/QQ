# -*- coding: utf-8 -*-
import discord
from discord import app_commands
from discord.ext import commands
import aiohttp
from aiohttp import web
import asyncio
import json
import os
import time
import urllib.parse

# ================== CONFIGURATION ==================
# Recommend setting these as Environment Variables on Render
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
CLIENT_ID = os.getenv("CLIENT_ID", "YOUR_CLIENT_ID_HERE")
CLIENT_SECRET = os.getenv("CLIENT_SECRET", "YOUR_CLIENT_SECRET_HERE")
REDIRECT_URI = os.getenv("REDIRECT_URI", "https://your-render-app.onrender.com/callback")
PORT = int(os.getenv("PORT", 8080))

# Allowed User IDs for administrative commands (/join, /check)
AUTHORIZED_USERS = [1127935823195668480, 1488103702488154173]

DATA_FILE = "user_tokens.json"

OAUTH_URL = (
    f"https://discord.com/oauth2/authorize"
    f"?client_id={CLIENT_ID}"
    f"&response_type=code"
    f"&redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
    f"&scope=identify+guilds.join"
)

# ================== DATA MANAGEMENT ==================
def load_tokens():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[!] Error loading tokens file: {e}")
            return {}
    return {}

def save_tokens(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[!] Error saving tokens file: {e}")

# ================== TOKEN REFRESH LOGIC ==================
async def refresh_access_token(user_id: str, refresh_token: str):
    """Refreshes an expired access_token using refresh_token."""
    url = "https://discord.com/api/v10/oauth2/token"
    data = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=data, headers=headers) as resp:
            if resp.status == 200:
                token_data = await resp.json()
                tokens = load_tokens()
                if user_id in tokens:
                    tokens[user_id].update({
                        'access_token': token_data['access_token'],
                        'refresh_token': token_data['refresh_token'],
                        'expires_at': time.time() + token_data.get('expires_in', 604800) - 300
                    })
                    save_tokens(tokens)
                    print(f"[+] Token refreshed successfully for user: {user_id}")
                    return token_data['access_token']
            else:
                print(f"[-] Token refresh failed for user: {user_id} (Status: {resp.status})")
                return None

async def get_valid_access_token(user_id: str):
    """Retrieves access_token, automatically renewing if expired."""
    tokens = load_tokens()
    user_data = tokens.get(user_id)
    if not user_data:
        return None
    
    # Check token expiration
    if time.time() >= user_data.get('expires_at', 0):
        refresh_token = user_data.get('refresh_token')
        if refresh_token:
            return await refresh_access_token(user_id, refresh_token)
        return None
    
    return user_data.get('access_token')

async def add_member_to_guild(guild_id: str, user_id: str, access_token: str):
    """Invokes Discord API to add user to the target guild via OAuth2."""
    url = f"https://discord.com/api/v10/guilds/{guild_id}/members/{user_id}"
    headers = {
        "Authorization": f"Bot {BOT_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {"access_token": access_token}
    
    async with aiohttp.ClientSession() as session:
        async with session.put(url, headers=headers, json=payload) as resp:
            if resp.status == 201:
                return True, "joined"
            elif resp.status == 204:
                return True, "already_in"
            else:
                err_body = await resp.text()
                return False, f"HTTP {resp.status}: {err_body}"

# ================== BOT SETUP ==================
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# ================== WEB SERVER (Keep-Alive & OAuth2 Callback) ==================
async def handle_health_check(request):
    """Endpoint for uptime monitor services (e.g., UptimeRobot) to prevent sleeping."""
    return web.Response(text="Bot is running 24/7", status=200)

async def handle_callback(request):
    code = request.query.get('code')
    if not code:
        return web.Response(text="Missing authorization code.", status=400)

    # 1. Exchange code for Access & Refresh Tokens
    token_url = "https://discord.com/api/v10/oauth2/token"
    data = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    
    async with aiohttp.ClientSession() as session:
        async with session.post(token_url, data=data, headers=headers) as resp:
            if resp.status != 200:
                return web.Response(text="Failed to exchange authorization code.", status=400)
            token_data = await resp.json()

        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token')
        expires_in = token_data.get('expires_in', 604800)

        # 2. Fetch User Profile Info
        user_headers = {'Authorization': f'Bearer {access_token}'}
        async with session.get('https://discord.com/api/v10/users/@me', headers=user_headers) as resp:
            if resp.status != 200:
                return web.Response(text="Failed to retrieve user profile.", status=400)
            user_info = await resp.json()
            user_id = user_info['id']

    # 3. Save to database
    tokens = load_tokens()
    tokens[user_id] = {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_at': time.time() + expires_in - 300,
        'username': user_info.get('username')
    }
    save_tokens(tokens)

    return web.Response(
        text="<html><body style='background:#121212;color:#fff;font-family:sans-serif;text-align:center;padding-top:50px;'><h1>✅ Authorization Successful!</h1><p>You can close this tab now.</p></body></html>",
        content_type="text/html",
        status=200
    )

async def start_webserver():
    app = web.Application()
    app.router.add_get('/', handle_health_check)
    app.router.add_get('/callback', handle_callback)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', PORT)
    await site.start()
    print(f"[+] Web Server active on port {PORT}")

# ================== UI COMPONENTS ==================
class OAuthButtonView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(discord.ui.Button(
            label="🔑 ให้สิทธิ์ระบบ (Authorize)",
            style=discord.ButtonStyle.link,
            url=OAUTH_URL
        ))

# ================== SLASH COMMANDS ==================

# 1. /settoken (Public Access)
@bot.tree.command(name="settoken", description="ระบบยืนยันสิทธิ์ OAuth2 เพื่อเข้าสู่ระบบ")
async def settoken_cmd(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🛡️ ระบบยืนยันตัวตน และให้สิทธิ์เข้าใช้งาน",
        description=(
            "กรุณากดปุ่มด้านล่างเพื่ออนุญาตให้สิทธิ์บอทเข้าถึงข้อมูลโปรไฟล์พื้นฐาน\n\n"
            "**สิทธิ์ที่ต้องการ:**\n"
            "• `identify` : อ่านข้อมูลโปรไฟล์สาธารณะ รูปประจำตัว และแบนเนอร์\n"
            "• `guilds.join` : อนุญาตให้เพิ่มคุณเข้าสู่เซิร์ฟเวอร์ที่เลือกได้โดยตรง"
        ),
        color=discord.Color.blue()
    )
    embed.set_footer(text="ข้อมูลของคุณจะถูกเก็บรักษาอย่างปลอดภัยในระบบ")
    await interaction.response.send_message(embed=embed, view=OAuthButtonView())

# 2. /join (Restricted Access)
@bot.tree.command(name="join", description="ดึงสมาชิกที่บันทึกไว้เข้าเซิร์ฟเวอร์เป้าหมาย")
@app_commands.describe(guild_id="ID ของเซิร์ฟเวอร์เป้าหมาย", count="จำนวนสมาชิกที่ต้องการดึงเข้า")
async def join_cmd(interaction: discord.Interaction, guild_id: str, count: int):
    if interaction.user.id not in AUTHORIZED_USERS:
        await interaction.response.send_message("❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้", ephemeral=True)
        return

    tokens = load_tokens()
    if not tokens:
        await interaction.response.send_message("❌ ไม่พบข้อมูลโทเค็นในระบบ", ephemeral=True)
        return

    user_ids = list(tokens.keys())
    target_count = min(count, len(user_ids))

    await interaction.response.send_message(
        f"🔄 กำลังดำเนินการเพิ่มสมาชิกจำนวน **{target_count}** คน เข้าสู่ Guild ID: `{guild_id}`...",
        ephemeral=True
    )

    success_count = 0
    already_count = 0
    fail_count = 0

    for user_id in user_ids[:target_count]:
        access_token = await get_valid_access_token(user_id)
        if not access_token:
            fail_count += 1
            continue

        success, status = await add_member_to_guild(guild_id, user_id, access_token)
        if success:
            if status == "joined":
                success_count += 1
            elif status == "already_in":
                already_count += 1
        else:
            fail_count += 1

        await asyncio.sleep(1.0)  # Delay between requests to prevent Discord API rate limits

    # Query Guild details for summary
    guild_name = "Unknown Guild"
    try:
        guild = bot.get_guild(int(guild_id)) or await bot.fetch_guild(int(guild_id))
        if guild:
            guild_name = guild.name
    except Exception:
        pass

    summary_embed = discord.Embed(
        title="📊 สรุปการเพิ่มสมาชิก (Join Summary)",
        color=discord.Color.green()
    )
    summary_embed.add_field(name="🏰 เซิร์ฟเวอร์เป้าหมาย", value=f"`{guild_name}` (`{guild_id}`)", inline=False)
    summary_embed.add_field(name="✅ เข้าร่วมสำเร็จ", value=f"`{success_count}` คน", inline=True)
    summary_embed.add_field(name="ℹ️ อยู่ในเซิร์ฟเวอร์แล้ว", value=f"`{already_count}` คน", inline=True)
    summary_embed.add_field(name="❌ ล้มเหลว", value=f"`{fail_count}` คน", inline=True)
    summary_embed.add_field(name="👥 รวมที่ดำเนินการทั้งหมด", value=f"`{target_count}` คน", inline=False)
    summary_embed.set_footer(text="ระบบทำงานเสร็จสมบูรณ์")

    await interaction.followup.send(embed=summary_embed, ephemeral=True)

# 3. /check (Restricted Access)
@bot.tree.command(name="check", description="ตรวจสอบจำนวนและรายชื่อผู้ที่ให้สิทธิ์ OAuth2")
async def check_cmd(interaction: discord.Interaction):
    if interaction.user.id not in AUTHORIZED_USERS:
        await interaction.response.send_message("❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้", ephemeral=True)
        return

    tokens = load_tokens()
    total_users = len(tokens)

    embed = discord.Embed(
        title="🔍 ตรวจสอบฐานข้อมูล OAuth2 Tokens",
        description=f"ปัจจุบันมีผู้ให้สิทธิ์ใช้งานทั้งหมด: **{total_users}** บัญชี",
        color=discord.Color.gold()
    )

    if total_users > 0:
        user_list_str = ""
        for i, (uid, uinfo) in enumerate(tokens.items(), 1):
            uname = uinfo.get("username", "Unknown")
            user_list_str += f"`{i}.` **{uname}** (`{uid}`)\n"
            if len(user_list_str) > 3800:
                user_list_str += "...และบัญชีอื่น ๆ เพิ่มเติม"
                break
        embed.add_field(name="📋 รายชื่อบัญชีที่บันทึกไว้", value=user_list_str, inline=False)

    await interaction.response.send_message(embed=embed, ephemeral=True)

# ================== STARTUP ==================
@bot.event
async def on_ready():
    print(f"✅ Bot initialized as {bot.user} (ID: {bot.user.id})")
    try:
        synced = await bot.tree.sync()
        print(f"✅ Synced {len(synced)} slash commands.")
    except Exception as e:
        print(f"❌ Failed to sync slash commands: {e}")

async def main():
    asyncio.create_task(start_webserver())
    await bot.start(BOT_TOKEN)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[!] Bot shutting down...")
