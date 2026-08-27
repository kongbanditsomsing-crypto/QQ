import os
import json
import asyncio
import threading
import requests
from flask import Flask
import discord
from discord.ext import commands

# --- CONFIGURATION & WEB SERVER FOR RENDER ---
TOKEN = os.getenv("DISCORD_TOKEN", "ใส่_Token_บอทของคุณตรงนี้")
ADMIN_IDS = [1489527387183120505]  # เปลี่ยนเป็น Discord ID ของแอดมิน
RECEIVE_PHONE = "1488103702488154173"
LOG_CHANNEL_ID = 1489527387183120505
RATE = 0.8

app = Flask('')

@app.route('/')
def home():
    return "Bot is running and alive!"

def run_web_server():
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)))

# --- DATABASE MANAGEMENT ---
DB_FILE = "database.json"
db_lock = threading.Lock()

def load_db():
    with db_lock:
        if not os.path.exists(DB_FILE):
            default_data = {"stock": [], "sold_count": 0, "users": {}}
            save_db(default_data)
            return default_data
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"stock": [], "sold_count": 0, "users": {}}

def save_db(data):
    with db_lock:
        temp_file = DB_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        os.replace(temp_file, DB_FILE)

# --- BOT SETUP ---
intents = discord.Intents.default()
intents.message_content = True
client = commands.Bot(command_prefix="!", intents=intents)

# --- PERSISTENT VIEW (MENU) ---
class ShopSelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="Buy Token", description="ซื้อ Token อัตโนมัติ", emoji="🛒"),
            discord.SelectOption(label="Check Money", description="ตรวจสอบยอดเงินและประวัติของคุณ", emoji="💰"),
            discord.SelectOption(label="Top Up", description="เติมเงินด้วยซองของขวัญ TrueMoney", emoji="🧧"),
            discord.SelectOption(label="Calculate", description="คำนวณราคาตามจำนวนเงินหรือสินค้า", emoji="🔢"),
        ]
        super().__init__(placeholder="คลิกเมนูเพื่อเลือกใช้งาน", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction):
        val = self.values[0]
        if val == "Buy Token":
            await interaction.response.send_modal(BuyModal())
        elif val == "Check Money":
            await check_money_process(interaction)
        elif val == "Top Up":
            await interaction.response.send_modal(TopUpModal())
        elif val == "Calculate":
            await interaction.response.send_modal(CalcModal())

class ShopView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(ShopSelect())

# --- MODALS & PROCESSES ---

class BuyModal(discord.ui.Modal, title="Buy Token"):
    amount = discord.ui.TextInput(label="จำนวนสินค้าที่ต้องการ (1-1000)", placeholder="ใส่ตัวเลขเท่านั้น...", min_length=1, max_length=4)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        raw_val = self.amount.value.strip()
        
        if not raw_val.isdigit():
            embed = discord.Embed(title="Error", description="❌ ไม่สามารถทำการได้ (กรุณากรอกเฉพาะตัวเลขจำนวนเต็มบวก)", color=discord.Color.red())
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        qty = int(raw_val)
        if qty < 1 or qty > 1000:
            embed = discord.Embed(title="Error", description="❌ ไม่สามารถทำการได้ (จำนวนต้องอยู่ระหว่าง 1 ถึง 1000)", color=discord.Color.red())
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        total_cost = round(qty * RATE, 2)
        db = load_db()
        user_id_str = str(interaction.user.id)
        if user_id_str not in db["users"]:
            db["users"][user_id_str] = {"balance": 0.0, "total_spent": 0.0, "total_topup": 0.0, "orders_count": 0}

        user_bal = db["users"][user_id_str]["balance"]
        stock_len = len(db["stock"])

        if stock_len < qty:
            embed = discord.Embed(title="Error", description=f"❌ ไม่สามารถทำการได้ (สินค้าในสต็อกไม่พอ มีเหลือเพียง {stock_len} ชิ้น)", color=discord.Color.red())
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        if user_bal < total_cost:
            embed = discord.Embed(title="Error", description=f"❌ ไม่สามารถทำการได้ (ยอดเงินของคุณไม่พอ ต้องใช้ {total_cost} บาท มีอยู่ {user_bal} บาท)", color=discord.Color.red())
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        purchased_tokens = db["stock"][:qty]
        db["stock"] = db["stock"][qty:]
        db["sold_count"] += qty
        db["users"][user_id_str]["balance"] = round(user_bal - total_cost, 2)
        db["users"][user_id_str]["total_spent"] = round(db["users"][user_id_str]["total_spent"] + total_cost, 2)
        db["users"][user_id_str]["orders_count"] += 1
        save_db(db)

        success_embed = discord.Embed(title="Success", description=f"✅ สำเร็จ\nจำนวนสินค้า: {qty} ชิ้น\nเงินที่ต้องชำระ: {total_cost} บาท", color=discord.Color.green())
        await interaction.followup.send(embed=success_embed, ephemeral=True)

        file_content = "\n".join(purchased_tokens)
        file_bytes = discord.File(fp=__import__('io').BytesIO(file_content.encode('utf-8')), filename=f"token({qty}).txt")
        
        try:
            dm_channel = await interaction.user.create_dm()
            dm_embed = discord.Embed(title="Order Complete", description=f"📦 คำสั่งซื้อสำเร็จ\nจำนวนสินค้า: {qty}\nจำนวนเงิน: {total_cost} บาท", color=discord.Color.blue())
            await dm_channel.send(embed=dm_embed, file=file_bytes)
        except Exception:
            pass

        log_channel = client.get_channel(LOG_CHANNEL_ID)
        if log_channel:
            log_embed = discord.Embed(title="New Sale Notification", description=f"**ผู้ซื้อ:** {interaction.user} (`{interaction.user.id}`)\n**จำนวน:** {qty} ชิ้น\n**ยอดรวม:** {total_cost} บาท", color=discord.Color.gold())
            await log_channel.send(embed=log_embed)

async def check_money_process(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    db = load_db()
    user_id_str = str(interaction.user.id)
    u_data = db["users"].get(user_id_str, {"balance": 0.0, "total_spent": 0.0, "total_topup": 0.0, "orders_count": 0})

    embed = discord.Embed(title="Profile & Balance", color=discord.Color.blue())
    embed.add_field(name="ผู้ใช้งาน", value=interaction.user.mention, inline=False)
    embed.add_field(name="เงินคงเหลือ", value=f"{u_data['balance']} บาท", inline=True)
    embed.add_field(name="จำนวนครั้งที่สั่งซื้อ", value=f"{u_data['orders_count']} ครั้ง", inline=True)
    embed.add_field(name="ยอดเงินที่เคยเติมทั้งหมด", value=f"{u_data['total_topup']} บาท", inline=True)
    
    await interaction.followup.send(embed=embed, ephemeral=True)

class TopUpModal(discord.ui.Modal, title="Top Up TrueMoney"):
    link = discord.ui.TextInput(label="ลิ้งก์ซองของขวัญ TrueMoney", placeholder="https://gift.truemoney.com/campaign/?v=...", min_length=10, max_length=150)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        voucher_link = self.link.value.strip()

        if "?v=" in voucher_link:
            voucher_hash = voucher_link.split("?v=")[1].split("&")[0]
        else:
            voucher_hash = voucher_link.split("/")[-1]

        topup_success = False
        amount_added = 0.0
        error_reason = "ซองผิดหรือเป็นที่ระบบ"

        try:
            response = requests.post(f"https://gift.truemoney.com/campaign/vouchers/{voucher_hash}/redeem", json={"mobile": RECEIVE_PHONE}, timeout=10)
            data = response.json()

            if data.get("status", {}).get("code") == "SUCCESS":
                topup_success = True
                amount_added = float(data["status"]["data"]["amount"])
            else:
                code = data.get("status", {}).get("code")
                if code == "VOUCHER_NOT_FOUND": error_reason = "ไม่พบซองของขวัญนี้ในระบบ"
                elif code == "VOUCHER_EXPIRED": error_reason = "ซองของขวัญหมดอายุแล้ว"
                elif code == "CANNOT_GET_OWN_VOUCHER": error_reason = "ไม่สามารถเติมซองของตัวเองได้"
                elif code == "VOUCHER_OUT_OF_STOCK": error_reason = "ซองนี้ถูกใช้งานไปแล้วเต็มจำนวน"
                else: error_reason = f"ซองผิดหรือเกิดข้อผิดพลาด (Code: {code})"
        except requests.exceptions.Timeout:
            error_reason = "ระบบเชื่อมต่อใช้เวลานานเกินไป (Timeout) กรุณาลองใหม่อีกครั้ง"
        except Exception:
            error_reason = "ซองผิดหรือเป็นที่ระบบ ขัดข้องชั่วคราว"

        if topup_success:
            db = load_db()
            user_id_str = str(interaction.user.id)
            if user_id_str not in db["users"]:
                db["users"][user_id_str] = {"balance": 0.0, "total_spent": 0.0, "total_topup": 0.0, "orders_count": 0}
            
            db["users"][user_id_str]["balance"] = round(db["users"][user_id_str]["balance"] + amount_added, 2)
            db["users"][user_id_str]["total_topup"] = round(db["users"][user_id_str]["total_topup"] + amount_added, 2)
            save_db(db)

            embed = discord.Embed(title="Success", description=f"✅ สำเร็จ\nเติมเงินสำเร็จจำนวน: {amount_added} บาท", color=discord.Color.green())
            await interaction.followup.send(embed=embed, ephemeral=True)
        else:
            embed = discord.Embed(title="Error", description=f"❌ ไม่สามารถทำการได้\n{error_reason} หากมีข้อสอบถามกด ticket ได้เลย", color=discord.Color.red())
            await interaction.followup.send(embed=embed, ephemeral=True)

class CalcModal(discord.ui.Modal, title="Calculate Token"):
    money = discord.ui.TextInput(label="จำนวนเงินที่ต้องการคำนวณ", placeholder="ใส่ตัวเลขเงิน...", min_length=1, max_length=10)

    async def on_submit(self, interaction: discord.Interaction):
        raw_val = self.money.value.strip()
        if not raw_val.replace('.', '', 1).isdigit():
            await interaction.response.send_message("กรุณากรอกตัวเลขที่ถูกต้องเท่านั้น", ephemeral=True)
            return

        amt = float(raw_val)
        can_buy = int(amt // RATE)
        embed = discord.Embed(title="Calculate Result", description=f"🔢 จำนวนเงิน: {amt} บาท\nจำนวนสินค้าที่สามารถซื้อได้: {can_buy} ชิ้น", color=discord.Color.blue())
        await interaction.response.send_message(embed=embed, ephemeral=True)

@client.tree.command(name="open", description="เปิดหน้าร้านขาย Token หลัก")
async def open_shop(interaction: discord.Interaction):
    if interaction.user.id not in ADMIN_IDS:
        await interaction.response.send_message("ชนชั้นต่ำอย่าใช้คำสั่งชั้นสูง", ephemeral=True)
        return

    await interaction.response.send_message("กำลังสร้างหน้าร้าน...", ephemeral=True)
    await interaction.delete_original_response()
    
    db = load_db()
    embed = discord.Embed(title="Sell Token", color=discord.Color.blue())
    embed.set_image(url="https://cdn.discordapp.com/attachments/1502986327367487539/1542491126089523271/e6ebeffd2a63d00a7a1f6c94fdc90977.gif")
    embed.add_field(name="", value="• โปรเปิดDmให้บอทสามารถส่งสินค้าให้ได้\n• หากบอทเสียหรือระบบบัคโปรดเปิดticket 24/7\n• ทางเราไม่มีนโยบายคืนเงินหลังซื้อสินค้า\n• ตอนนี้ทางร้านยังรับเเค่ซองทรูมันนี่", inline=False)
    embed.add_field(name="", value=f"🛒 Sold: `{db['sold_count']}` | 💰 Rates: `{RATE}ต่อ1` | 📦 Stock: `{len(db['stock'])}`", inline=False)
    
    await interaction.channel.send(embed=embed, view=ShopView())

@client.tree.command(name="add", description="เพิ่ม Token ทีละ 1 ชิ้นเข้าสต็อก")
async def add_stock(interaction: discord.Interaction, token: str):
    if interaction.user.id not in ADMIN_IDS:
        await interaction.response.send_message("ชนชั้นต่ำอย่าใช้คำสั่งชั้นสูง", ephemeral=True)
        return

    db = load_db()
    db["stock"].append(token)
    save_db(db)
    await interaction.response.send_message(f"✅ เพิ่ม Token เข้าสต็อกสำเร็จ! (สต็อกคงเหลือ: {len(db['stock'])} ชิ้น)", ephemeral=True)

@client.event
async def on_message(message):
    if message.author.bot:
        return

    if message.content.startswith("!add1022"):
        if message.author.id not in ADMIN_IDS:
            await message.channel.send("ชนชั้นต่ำอย่าใช้คำสั่งชั้นสูง")
            return

        parts = message.content.split()
        if len(parts) != 3:
            await message.channel.send("รูปแบบคำสั่งไม่ถูกต้อง! ตัวอย่าง: `!add1022 <idคน> <จำนวนเงิน>`")
            return

        try:
            target_id = str(parts[1])
            amount = float(parts[2])
            
            db = load_db()
            if target_id not in db["users"]:
                db["users"][target_id] = {"balance": 0.0, "total_spent": 0.0, "total_topup": 0.0, "orders_count": 0}
            
            db["users"][target_id]["balance"] = round(db["users"][target_id]["balance"] + amount, 2)
            save_db(db)

            await message.channel.send(f"✅ เพิ่มเงินจำนวน {amount} บาท ให้กับยูสเซอร์ `{target_id}` เรียบร้อยแล้ว!")
        except Exception:
            await message.channel.send("เกิดข้อผิดพลาดในการประมวลผลคำสั่ง กรุณาตรวจสอบ ID หรือตัวเลขอีกครั้ง")

    await client.process_commands(message)

@client.event
async def on_ready():
    print(f"Logged in as {client.user} (ID: {client.user.id})")
    try:
        synced = await client.tree.sync()
        print(f"Synced {len(synced)} command(s).")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    server_thread = threading.Thread(target=run_web_server)
    server_thread.daemon = True
    server_thread.start()
    client.run(TOKEN)
