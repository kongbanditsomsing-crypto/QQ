import os
import json
import asyncio
import aiohttp
import discord
from discord.ext import commands
from discord.ui import Button, View, Select, Modal, TextInput

# ตั้งค่าเบอร์รับเงินทรูมันนี่และแอดมิน
TARGET_PHONE = "0837751528"
ADMIN_IDS = [int(os.getenv("ADMIN_ID", "1489527387183120505"))]
LOG_CHANNEL_ID = 1489527387183120505
DB_FILE = "database.json"

# ----------------- ระบบ Database ป้องกันข้อมูลเสียหาย (Atomic Write) -----------------
def load_db():
    default_data = {
        "stock": [],
        "sold_count": 0,
        "users": {},
        "rate": 0.8
    }
    if not os.path.exists(DB_FILE):
        save_db(default_data)
        return default_data
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default_data

def save_db(data):
    temp_file = DB_FILE + ".tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    os.replace(temp_file, DB_FILE)

# ----------------- ตั้งค่าบอท Discord -----------------
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

# ----------------- Modal สำหรับใส่จำนวนตอนซื้อ Token -----------------
class BuyModal(Modal, title="Buy Token"):
    amount_input = TextInput(
        label="ระบุจำนวนสินค้าที่ต้องการ (1-1000)",
        placeholder="กรอกตัวเลข เช่น 5",
        min_length=1,
        max_length=4,
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        raw_val = self.amount_input.value.strip()

        if not raw_val.isdigit():
            err_embed = discord.Embed(
                description="<a:1000029618:1542493395400925226> ไม่สามารถทำการได้ เนื่องจากกรอกข้อมูลไม่ถูกต้อง (ต้องเป็นตัวเลขเท่านั้น)",
                color=discord.Color.red()
            )
            return await interaction.followup.send(embed=err_embed, ephemeral=True)

        amount = int(raw_val)

        if amount < 1 or amount > 1000:
            load_embed = discord.Embed(
                description="<a:1000029614:1542490868731224166> กำลังตรวจสอบข้อมูล...",
                color=discord.Color.yellow()
            )
            msg = await interaction.followup.send(embed=load_embed, ephemeral=True)
            await asyncio.sleep(2)
            err_embed = discord.Embed(
                description="<a:1000029618:1542493395400925226> ไม่สามารถทำการได้ (จำนวนต้องอยู่ระหว่าง 1 ถึง 1000)",
                color=discord.Color.red()
            )
            return await msg.edit(embed=err_embed)

        db = load_db()
        if len(db["stock"]) < amount:
            err_embed = discord.Embed(
                description=f"<a:1000029618:1542493395400925226> สินค้าในสต็อกไม่เพียงพอ! (เหลือ {len(db['stock'])} ชิ้น)",
                color=discord.Color.red()
            )
            return await interaction.followup.send(embed=err_embed, ephemeral=True)

        total_price = amount * db["rate"]

        user_id_str = str(interaction.user.id)
        if user_id_str not in db["users"]:
            db["users"][user_id_str] = {"money": 0.0, "total_bought": 0, "total_topup": 0}

        user_money = db["users"][user_id_str]["money"]

        load_embed = discord.Embed(
            description="<a:1000029614:1542490868731224166> กำลังตรวจสอบยอดเงินและสต็อก...",
            color=discord.Color.yellow()
        )
        msg = await interaction.followup.send(embed=load_embed, ephemeral=True)
        await asyncio.sleep(2)

        if user_money < total_price:
            err_embed = discord.Embed(
                description=f"<a:1000029618:1542493395400925226> เงินของคุณไม่เพียงพอ! ต้องการ {total_price} บาท แต่คุณมี {user_money} บาท",
                color=discord.Color.red()
            )
            return await msg.edit(embed=err_embed)

        db["users"][user_id_str]["money"] -= total_price
        db["users"][user_id_str]["total_bought"] += amount
        db["sold_count"] += amount

        tokens_to_send = [db["stock"].pop(0) for _ in range(amount)]
        save_db(db)

        file_content = "\n".join(tokens_to_send)
        file_path = f"token_{interaction.user.id}.txt"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(file_content)

        success_embed = discord.Embed(
            description=f"<a:1000029620:1542494056070914109> สำเร็จ จำนวน {amount} ชิ้น | เงินที่ต้องชำระ {total_price} บาท",
            color=discord.Color.green()
        )
        await msg.edit(embed=success_embed)

        try:
            dm_embed = discord.Embed(
                description=f"<a:1000029602:1542200491981938698> คำสั่งซื้อสำเร็จ\nจำนวนสินค้า: {amount}\nจำนวนเงิน: {total_price} บาท",
                color=discord.Color.green()
            )
            await interaction.user.send(embed=dm_embed, file=discord.File(file_path))
        except Exception:
            pass
        
        if os.path.exists(file_path):
            os.remove(file_path)

        log_channel = bot.get_channel(LOG_CHANNEL_ID)
        if log_channel:
            log_embed = discord.Embed(
                title="📦 มีการซื้อสินค้าสำเร็จ",
                description=f"**ผู้ซื้อ:** {interaction.user} (`{interaction.user.id}`)\n**จำนวน:** {amount} ชิ้น\n**ยอดเงิน:** {total_price} บาท",
                color=discord.Color.blue()
            )
            await log_channel.send(embed=log_embed)


# ----------------- Modal สำหรับเติมเงิน (Top Up) -----------------
class TopUpModal(Modal, title="Top Up (ซองของขวัญ TrueMoney)"):
    link_input = TextInput(
        label="ใส่ลิ้งค์ซองทรูมันนี่",
        placeholder="https://gift.truemoney.com/campaign/?v=...",
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        gift_link = self.link_input.value.strip()

        load_embed = discord.Embed(
            description="<a:1000029614:1542490868731224166> กำลังทำรายการเติมเงิน กรุณารอสักครู่...",
            color=discord.Color.yellow()
        )
        msg = await interaction.followup.send(embed=load_embed, ephemeral=True)

        try:
            async with aiohttp.ClientSession() as session:
                payload = {"link": gift_link, "phone": TARGET_PHONE}
                async with session.post("https://api.example.com/redeem", json=payload, timeout=10) as resp:
                    if resp.status != 200:
                        raise Exception("Network or API Error")
                    res_data = await resp.json()
                    amount_topup = float(res_data.get("amount", 0))
        except asyncio.TimeoutError:
            err_embed = discord.Embed(
                description="<a:1000029618:1542493395400925226> ไม่สามารถทำการได้: ซองผิดหรือระบบใช้เวลาตอบสนองนานเกินไป (Timeout)",
                color=discord.Color.red()
            )
            return await msg.edit(embed=err_embed)
        except Exception:
            err_embed = discord.Embed(
                description="<a:1000029618:1542493395400925226> ไม่สามารถทำการได้: ซองอาจผิด ถูกใช้ไปแล้ว หมดอายุ หรือมีปัญหาทางระบบ",
                color=discord.Color.red()
            )
            return await msg.edit(embed=err_embed)

        db = load_db()
        user_id_str = str(interaction.user.id)
        if user_id_str not in db["users"]:
            db["users"][user_id_str] = {"money": 0.0, "total_bought": 0, "total_topup": 0}

        db["users"][user_id_str]["money"] += amount_topup
        db["users"][user_id_str]["total_topup"] += amount_topup
        save_db(db)

        success_embed = discord.Embed(
            description=f"<a:1000029620:1542494056070914109> สำเร็จ เงินจำนวน {amount_topup} บาท ถูกเพิ่มเข้าสู่บัญชีของคุณแล้ว",
            color=discord.Color.green()
        )
        await msg.edit(embed=success_embed)


# ----------------- Modal สำหรับคำนวณเงิน (Calculate) -----------------
class CalcModal(Modal, title="Calculate Rates"):
    money_input = TextInput(
        label="ระบุจำนวนเงินที่ต้องการคำนวณ",
        placeholder="กรอกตัวเลข เช่น 50",
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        raw_val = self.money_input.value.strip()
        if not raw_val.replace('.', '', 1).isdigit():
            err_embed = discord.Embed(description="กรุณากรอกตัวเลขที่ถูกต้องเท่านั้น", color=discord.Color.red())
            return await interaction.response.send_message(embed=err_embed, ephemeral=True)

        money = float(raw_val)
        db = load_db()
        rate = db["rate"]
        can_buy = int(money / rate)

        calc_embed = discord.Embed(
            description=f"<a:1000029597:1542198336369598555> จำนวนเงิน: {money} บาท\nจำนวนสินค้าที่สามารถซื้อได้: {can_buy} ชิ้น (เรท {rate})",
            color=discord.Color.blue()
        )
        await interaction.response.send_message(embed=calc_embed, ephemeral=True)


# ----------------- Select Menu สำหรับปุ่มเลือกด้านล่าง -----------------
class ShopSelect(Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="Buy Token", value="buy", description="ซื้อโทเค็นอัตโนมัติ", emoji="<a:1000029591:1542196467740053754>"),
            discord.SelectOption(label="Check Money", value="check", description="เช็คยอดเงินและโปรไฟล์ของคุณ", emoji="<a:1000029613:1542489732641198180>"),
            discord.SelectOption(label="Top Up", value="topup", description="เติมเงินด้วยซองวอเลท", emoji="<a:1000029595:1542197141701791804>"),
            discord.SelectOption(label="Calculate", value="calc", description="คำนวณเรทราคาสินค้า", emoji="<a:1000029614:1542490868731224166>")
        ]
        super().__init__(placeholder="คลิกเมนูเพื่อเลือกใช้งาน", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction):
        val = self.values[0]
        if val == "buy":
            await interaction.response.send_modal(BuyModal())
        elif val == "check":
            db = load_db()
            user_id_str = str(interaction.user.id)
            u_data = db["users"].get(user_id_str, {"money": 0.0, "total_bought": 0, "total_topup": 0})
            
            load_embed = discord.Embed(description="<a:1000029614:1542490868731224166> กำลังโหลดข้อมูลของคุณ...", color=discord.Color.yellow())
            await interaction.response.send_message(embed=load_embed, ephemeral=True)
            await asyncio.sleep(2)

            profile_embed = discord.Embed(
                title=f"โปรไฟล์ของคุณ: {interaction.user.name}",
                description=f"💰 **เงินคงเหลือ:** {u_data['money']} บาท\n🛒 **จำนวนที่เคยซื้อ:** {u_data['total_bought']} ชิ้น\n💳 **ยอดเติมเงินสะสม:** {u_data['total_topup']} บาท",
                color=discord.Color.blue()
            )
            await interaction.edit_original_response(embed=profile_embed)

        elif val == "topup":
            await interaction.response.send_modal(TopUpModal())
        elif val == "calc":
            await interaction.response.send_modal(CalcModal())

class ShopView(View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(ShopSelect())


# ----------------- คำสั่ง /open สำหรับเปิด Embed ขายสินค้า -----------------
@bot.command()
async def open(ctx):
    if ctx.author.id not in ADMIN_IDS:
        return await ctx.send("ชนชั้นต่ำอย่าใช้คำสั่งชั้นสูง")

    db = load_db()
    stock_count = len(db["stock"])
    sold_count = db["sold_count"]
    rate = db["rate"]

    embed = discord.Embed(
        title="Sell Token",
        description=(
            "• โปรเปิดDmให้บอทสามารถส่งสินค้าให้ได้ <a:1000029591:1542196467740053754>\n"
            "• หากบอทเสียหรือระบบบัคโปรดเปิดticket 24/7 <a:1000029601:1542200094177362030>\n"
            "• ทางเราไม่มีนโยบายคืนเงินหลังซื้อสินค้า <a:1000029589:1542192271468929084>\n"
            "• ตอนนี้ทางร้านยังรับเเค่ซองทรูมันนี่ <a:1000029599:1542199194754883604>\n\n"
            f"<a:1000029595:1542197141701791804>  __Sold__ ``({sold_count})``  "
            f"<a:1000029613:1542489732641198180> __Rates__ ``({rate}ต่อ1)`` "
            f"<a:1000029614:1542490868731224166> __Stock__ ``({stock_count})``\n\n"
            "• token ทางร้านเป็นแบบภาษาไทย \n"
            "• token มีโปรไฟล์มีประวัติ คือมีครบอะ\n"
            "• เป็นโทเค่นใหม่ตลอดวันอาจจะไม่นานมาก\n\n"
            "•ทางร้านมีบัญชีม้า หากคนกดรับตังชื่อต่างกันไม่ต้องสงสัย"
        ),
        color=discord.Color.blue()
    )
    embed.set_image(url="https://cdn.discordapp.com/attachments/1502986327367487539/1542491126089523271/e6ebeffd2a63d00a7a1f6c94fdc90977.gif?ex=6a916c4e&is=6a901ace&hm=66311a78271497772d785a59ca0447cc39373caf66cb5c330ab829ad23eb5b9c&")

    await ctx.message.delete()
    await ctx.send(embed=embed, view=ShopView())


# ----------------- คำสั่งเติมสต็อกสินค้าแบบทีละ 1 ชิ้น (/add) -----------------
@bot.command()
async def add(ctx, *, token_text: str = None):
    if ctx.author.id not in ADMIN_IDS:
        return await ctx.send("ชนชั้นต่ำอย่าใช้คำสั่งชั้นสูง")
    if not token_text:
        return await ctx.send("กรุณาใส่ข้อมูล Token ตามหลังคำสั่ง เช่น !add (token)")

    db = load_db()
    db["stock"].append(token_text.strip())
    save_db(db)

    await ctx.send(f"<a:1000029620:1542494056070914109> เพิ่มสินค้าเข้าสต็อกสำเร็จ! (ตอนนี้มี {len(db['stock'])} ชิ้น)")


# ----------------- คำสั่งเพิ่มเงินให้ยูสเซอร์ด้วยคำสั่ง !add [id] [จำนวนเงิน] -----------------
@bot.command(name="add1022")
async def add1022(ctx, target_user: discord.User = None, amount: float = None):
    if ctx.author.id not in ADMIN_IDS:
        return await ctx.send("ชนชั้นต่ำอย่าใช้คำสั่งชั้นสูง")
    if not target_user or amount is None:
        return await ctx.send("รูปแบบคำสั่งไม่ถูกต้อง: `!add1022 @user จำนวนเงิน`")

    db = load_db()
    user_id_str = str(target_user.id)
    if user_id_str not in db["users"]:
        db["users"][user_id_str] = {"money": 0.0, "total_bought": 0, "total_topup": 0}

    db["users"][user_id_str]["money"] += amount
    save_db(db)

    await ctx.send(f"<a:1000029620:1542494056070914109> เพิ่มเงินให้ {target_user.mention} จำนวน {amount} บาท สำเร็จ!")


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name} (ID: {bot.user.id})")
    print("Bot is ready and running!")

bot.run(os.getenv("DISCORD_TOKEN"))
