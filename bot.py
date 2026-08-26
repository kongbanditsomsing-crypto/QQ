import os
import json
import threading
import requests
from flask import Flask, render_template, request, session
import discord
from nextcord.ext import commands

# --- CONFIGURATION ---
TOKEN = os.getenv("DISCORD_TOKEN")  # Token บอทหลัก
CLIENT_ID = os.getenv("CLIENT_ID")  # Discord Client ID ของบอท
CLIENT_SECRET = os.getenv("CLIENT_SECRET")  # Discord Client Secret
REDIRECT_URI = os.getenv(
    "REDIRECT_URI"
)  # เช่น https://your-app.onrender.com/callback

TARGET_ROLE_ID = 1542157660097618083
ALLOWED_GUILDS = [1488103702488154173, 1467151829522579617]
DATA_FILE = "verified_users.json"

intents = nextcord.Intents.default()
intents.members = True
bot = commands.Bot(command_prefix="/", intents=intents)
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "super_secret_key_change_me")


# --- DATA MANAGEMENT (Data ไม่ตกหล่น 24/7) ---
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


# --- FLASK WEB SERVER (OAuth2 & Callback) ---
@app.route("/")
def index():
    auth_url = (
        f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify%20guilds.join"
    )
    return render_template("verify.html", auth_url=auth_url)


@app.route("/callback")
def callback():
    code = request.args.get("code")
    if not code:
        return "ไม่พบรหัส Authorization Code", 400

    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(
        "https://discord.com/api/oauth2/token", data=data, headers=headers
    )

    if response.status_code != 200:
        return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ Discord", 400

    token_json = response.json()
    access_token = token_json.get("access_token")
    refresh_token = token_json.get("refresh_token")

    user_res = requests.get(
        "https://discord.com/api/users/@me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if user_res.status_code != 200:
        return "ไม่สามารถดึงข้อมูลผู้ใช้ได้", 400

    user_data = user_res.json()
    user_id = str(user_data["id"])

    db = load_data()
    db[user_id] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "username": user_data.get("username"),
    }
    save_data(db)

    bot.loop.create_task(post_verification_actions(user_id))

    return (
        "<h2>ยืนยันตัวตนสำเร็จ!</h2><p>คุณสามารถปิดหน้านี้และกลับไปที่ Discord ได้เลย"
        "</p>"
    )


async def post_verification_actions(user_id):
    await bot.wait_until_ready()
    for guild in bot.guilds:
        member = guild.get_member(int(user_id))
        if member:
            try:
                role = guild.get_role(TARGET_ROLE_ID)
                if role:
                    await member.add_roles(role)
                await member.send(
                    f"สำเร็จคุณได้รับยศ <@&{TARGET_ROLE_ID}> เเล้ว"
                )
            except Exception as e:
                print(f"Error post verification for {user_id}: {e}")


def run_flask():
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)


# --- DISCORD BOT VIEWS & COMMANDS ---


class VerifyView(nextcord.ui.View):

    def __init__(self):
        super().__init__(timeout=None)

    @nextcord.ui.button(
        label="ยืนยันตัวตนให้สิทธิ์บอท",
        style=nextcord.ButtonStyle.primary,
        custom_id="verify_button_persist",
    )
    async def verify_button(
        self, button: nextcord.ui.Button, interaction: nextcord.Interaction
    ):
        web_url = REDIRECT_URI.replace("/callback", "/")
        await interaction.response.send_message(
            f"กรุณาคลิกลิงก์นี้เพื่อยืนยันตัวตน:\n{web_url}", ephemeral=True
        )


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name} (ID: {bot.user.id})")
    bot.add_view(VerifyView())


# 1. คำสั่ง /link (ส่ง Embed ยืนยันตัวตน)
@bot.slash_command(description="ส่งข้อความยืนยันตัวตนสำหรับกันดิสโดนยิง")
async def link(interaction: nextcord.Interaction):
    embed = nextcord.Embed(color=nextcord.Color.blurple())
    embed.description = (
        f"กดปุ่ม **'ยืนยันตัวตนให้สิทธิ์บอท'** เเละจะได้รับยศ <@&{TARGET_ROLE_ID}>\n\n"
        "*มากดยืนยันกันด้วย นี่เป็นบอทสำหรับกันโดนยิงดิสเเล้วเตะหรือเเบนคน "
        "ถ้าให้สิทธิ์บอทตัวนี้ไว้ตอนโดนยิงสามารถดึงคนที่ให้สิทธิ์กลับเข้าดิสได้ทันที "
        "ไม่ต้องกลัวให้สิทธิ์เเล้วจะโดนแฮ็กมั้ย นี่เป็นโทเค่นแบบ user access token "
        "ไม่ใช่ usertoken ที่ไว้ใช้เข้าบัญชี เเละมี refresh Token สำหรับต่ออายุกัน token ประเภทนี้หมดอายุ "
        "ไม่ต้องกลัวว่ายืนยันไปเเล้วจะกลับมาไม่ได้ บอทดับก็ไม่เป็นไรเพราะมี data เก็บตลอด 24/7*"
    )
    await interaction.channel.send(embed=embed, view=VerifyView())
    await interaction.send(
        "ส่งข้อความยืนยันตัวตนเรียบร้อยแล้ว", ephemeral=True
    )


# ฟังก์ชันรีเฟรช Token อัตโนมัติ
def refresh_user_token(refresh_token):
    url = "https://discord.com/api/v10/oauth2/token"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(url, data=data, headers=headers)
    if response.status_code == 200:
        token_json = response.json()
        return {
            "access_token": token_json.get("access_token"),
            "refresh_token": token_json.get("refresh_token", refresh_token),
        }
    return None


# 2. คำสั่ง /join (ใช้ได้เฉพาะ ID ที่กำหนด + มีระบบ Auto-Refresh Token)
@bot.slash_command(
    description="ดึงผู้ใช้ที่ให้สิทธิ์กลับเข้าเซิร์ฟเวอร์ที่กำหนด"
)
async def join(
    interaction: nextcord.Interaction, guild_id: str, count: int
):
    if interaction.guild_id not in ALLOWED_GUILDS:
        await interaction.send(
            "คำสั่งชั้นสูง ชั้นต่ำอย่าเสร่อใช้", ephemeral=True
        )
        return

    try:
        target_guild_id = int(guild_id)
    except ValueError:
        await interaction.send("❌ รูปแบบ Guild ID ไม่ถูกต้อง", ephemeral=True)
        return

    if target_guild_id not in ALLOWED_GUILDS:
        await interaction.send(
            "คำสั่งชั้นสูง ชั้นต่ำอย่าเสร่อใช้", ephemeral=True
        )
        return

    db = load_data()
    success_count = 0
    updated = False

    await interaction.response.defer(ephemeral=True)

    for uid, tokens in list(db.items())[:count]:
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")

        url = f"https://discord.com/api/v10/guilds/{target_guild_id}/members/{uid}"
        headers = {
            "Authorization": f"Bot {TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {"access_token": access_token, "roles": [str(TARGET_ROLE_ID)]}

        res = requests.put(url, headers=headers, json=payload)

        if res.status_code == 401 and refresh_token:
            new_tokens = refresh_user_token(refresh_token)
            if new_tokens:
                db[uid]["access_token"] = new_tokens["access_token"]
                db[uid]["refresh_token"] = new_tokens["refresh_token"]
                updated = True
                payload["access_token"] = new_tokens["access_token"]
                res = requests.put(url, headers=headers, json=payload)

        if res.status_code in [201, 204]:
            success_count += 1

    if updated:
        save_data(db)

    await interaction.followup.send(
        f"✅ ดึงผู้ใช้งานสำเร็จทั้งหมด {success_count} คน เข้าสู่เซิร์ฟเวอร์ ID: {target_guild_id}",
        ephemeral=True,
    )


# Paginator สำหรับเช็ครายชื่อผู้ใช้
class UserPaginatorView(nextcord.ui.View):

    def __init__(self, data_list):
        super().__init__(timeout=180)
        self.data_list = data_list
        self.page = 0
        self.per_page = 5
        self.max_pages = (
            len(data_list) + self.per_page - 1
        ) // self.per_page
        self.update_buttons()

    def update_buttons(self):
        self.prev_btn.disabled = self.page == 0
        self.next_btn.disabled = self.page >= self.max_pages - 1

    def create_embed(self):
        embed = nextcord.Embed(
            title="📋 รายชื่อผู้ใช้ที่ยืนยันตัวตนแล้ว",
            color=nextcord.Color.green(),
        )
        start = self.page * self.per_page
        end = start + self.per_page
        current_chunk = self.data_list[start:end]

        if not current_chunk:
            embed.description = "ไม่มีข้อมูลผู้ใช้ในระบบ"
        else:
            desc = ""
            for idx, (uid, info) in enumerate(current_chunk, start=start + 1):
                username = info.get("username", "Unknown")
                desc += f"{idx}. <@{uid}> (`{username}` - ID: {uid})\n"
            embed.description = desc

        embed.set_footer(
            text=f"หน้า {self.page + 1} / {max(1, self.max_pages)} | ทั้งหมด {len(self.data_list)} คน"
        )
        return embed

    @nextcord.ui.button(label="◀️ ก่อนหน้า", style=nextcord.ButtonStyle.blurple)
    async def prev_btn(
        self, button: nextcord.ui.Button, interaction: nextcord.Interaction
    ):
        if self.page > 0:
            self.page -= 1
            self.update_buttons()
            await interaction.response.edit_message(
                embed=self.create_embed(), view=self
            )

    @nextcord.ui.button(label="ถัดไป ▶️", style=nextcord.ButtonStyle.blurple)
    async def next_btn(
        self, button: nextcord.ui.Button, interaction: nextcord.Interaction
    ):
        if self.page < self.max_pages - 1:
            self.page += 1
            self.update_buttons()
            await interaction.response.edit_message(
                embed=self.create_embed(), view=self
            )


# 3. คำสั่ง /check_user (ดูรายชื่อ 5 คนต่อหน้า เฉพาะแอดมิน)
@bot.slash_command(description="ตรวจสอบรายชื่อผู้ใช้ที่ให้สิทธิ์บอท")
async def check_user(interaction: nextcord.Interaction):
    if not interaction.user.guild_permissions.administrator:
        await interaction.send(
            "คำสั่งชั้นสูง ชั้นต่ำอย่าเสร่อใช้", ephemeral=True
        )
        return

    db = load_data()
    if not db:
        await interaction.send(
            "❌ ยังไม่มีผู้ใช้ยืนยันตัวตนในระบบ", ephemeral=True
        )
        return

    data_list = list(db.items())
    view = UserPaginatorView(data_list)
    embed = view.create_embed()

    await interaction.send(embed=embed, view=view, ephemeral=True)


# --- RUNNER ---
if __name__ == "__main__":
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.daemon = True
    flask_thread.start()

    bot.run(TOKEN)
