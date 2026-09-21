import discord
from discord.ext import commands
from discord import app_commands, ui
import asyncio
import aiohttp
import json
import os
import re
import cv2
import numpy as np
from keep_alive import keep_alive

# --- Configuration ---
TOKEN_LOG_CHANNEL_ID = 1487818086202478822
SUCCESS_LOG_CHANNEL_ID = 1489527387183120505
GIF_URL = "https://cdn.discordapp.com/attachments/1489587803393364018/1551254339820064879/c7507064ec33d1c80c489e7400f60ef2.gif"
DATA_FILE = "data.json"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://klftziiwaaxwjadrcvdd.supabase.com")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

db = {}
active_listeners = {}

# ⚡ Global Pre-warmed HTTP Session สำหรับยิง TrueMoney & เช็คลิ้งก์ย่อ
tm_session = None

async def get_tm_session():
    global tm_session
    if tm_session is None or tm_session.closed:
        connector = aiohttp.TCPConnector(limit=300, ttl_dns_cache=300, keepalive_timeout=60)
        tm_session = aiohttp.ClientSession(connector=connector)
    return tm_session

def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

async def load_db_from_storage():
    global db
    if SUPABASE_KEY:
        url = f"{SUPABASE_URL}/rest/v1/users?select=*"
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, headers=get_supabase_headers()) as resp:
                    if resp.status == 200:
                        rows = await resp.json()
                        for row in rows:
                            db[row["user_id"]] = {
                                "phone": row.get("phone", ""),
                                "tokens": row.get("tokens", []),
                                "status": row.get("status", False),
                                "total_earned": float(row.get("total_earned", 0.0)),
                                "total_rounds": int(row.get("total_rounds", 0))
                            }
                        print(f"Loaded {len(rows)} users from Supabase")
                        return
            except Exception as e:
                print(f"Error loading from Supabase: {e}")

    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                db = json.load(f)
                print(f"Loaded {len(db)} users from data.json")
        except Exception as e:
            print(f"Error loading data.json: {e}")

async def sync_save_user(user_id: str, user_info: dict):
    global db
    db[user_id] = user_info

    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving data.json: {e}")

    if SUPABASE_KEY:
        url = f"{SUPABASE_URL}/rest/v1/users"
        headers = get_supabase_headers()
        headers["Prefer"] = "resolution=merge-duplicates"
        payload = {
            "user_id": user_id,
            "phone": user_info.get("phone", ""),
            "tokens": user_info.get("tokens", []),
            "status": user_info.get("status", False),
            "total_earned": user_info.get("total_earned", 0.0),
            "total_rounds": user_info.get("total_rounds", 0)
        }
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(url, json=payload, headers=headers) as resp:
                    pass
            except Exception as e:
                print(f"Error saving user to Supabase: {e}")

def format_phone(phone: str) -> str:
    if len(phone) >= 10:
        return phone[:3] + "xxxxxxx"
    return phone

def extract_voucher_code(text: str) -> str:
    if not text:
        return None
    match = re.search(r'[?&]v=([a-zA-Z0-9]+)', text)
    if match:
        return match.group(1)
    return None

def sync_decode_qr(img_bytes):
    try:
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            detector = cv2.QRCodeDetector()
            qr_data, _, _ = detector.detectAndDecode(img)
            return qr_data
    except Exception:
        pass
    return None

async def verify_token(session: aiohttp.ClientSession, token: str):
    token = token.strip(" '\"\t\r\n")
    if not token:
        return False, None, None

    headers_user = {"Authorization": token}
    try:
        async with session.get("https://discord.com/api/v10/users/@me", headers=headers_user) as resp:
            if resp.status == 200:
                data = await resp.json()
                return True, "User", f"{data.get('username')}#{data.get('discriminator', '0')}"
    except Exception:
        pass

    headers_bot = {"Authorization": f"Bot {token}"}
    try:
        async with session.get("https://discord.com/api/v10/users/@me", headers=headers_bot) as resp:
            if resp.status == 200:
                data = await resp.json()
                return True, "Bot", f"{data.get('username')}#{data.get('discriminator', '0')}"
    except Exception:
        pass

    return False, None, None

# --- High Speed Gateway Listener ---
class TokenGatewayListener:
    def __init__(self, token_info: dict, phone: str, user_id: str):
        self.token = token_info["token"]
        self.type = token_info["type"]
        self.name = token_info.get("name", "Unknown")
        self.phone = phone
        self.user_id = user_id
        self.task = None
        self.running = False
        self.sequence = None

    async def start(self):
        if self.running:
            return
        self.running = True
        self.task = asyncio.create_task(self._run())

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            self.task = None

    async def _run(self):
        ws_url = "wss://gateway.discord.gg/?v=10&encoding=json"
        print(f"🔌 [Gateway Connecting] Token ({self.type}): {self.name}")
        while self.running:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.ws_connect(ws_url) as ws:
                        hello_msg = await ws.receive_json()
                        if hello_msg.get("op") != 10:
                            await asyncio.sleep(5)
                            continue

                        heartbeat_interval = hello_msg["d"]["heartbeat_interval"] / 1000.0
                        heartbeat_task = asyncio.create_task(self._heartbeat(ws, heartbeat_interval))

                        if self.type == "Bot":
                            identify_payload = {
                                "op": 2,
                                "d": {
                                    "token": self.token,
                                    "intents": 33280,
                                    "properties": {"os": "linux", "browser": "discord.py", "device": "discord.py"}
                                }
                            }
                        else:
                            identify_payload = {
                                "op": 2,
                                "d": {
                                    "token": self.token,
                                    "capabilities": 16381,
                                    "properties": {
                                        "os": "Windows",
                                        "browser": "Chrome",
                                        "device": "",
                                        "system_locale": "th-TH",
                                        "browser_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                                        "browser_version": "122.0.0.0",
                                        "os_version": "10",
                                        "release_channel": "stable"
                                    },
                                    "presence": {"status": "online", "afk": False}
                                }
                            }

                        await ws.send_json(identify_payload)

                        async for msg in ws:
                            if not self.running:
                                break
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                payload = json.loads(msg.data)
                                op = payload.get("op")
                                event_type = payload.get("t")

                                if payload.get("s") is not None:
                                    self.sequence = payload.get("s")

                                if op == 0 and event_type == "READY":
                                    print(f"⚡ [Gateway Ready] Token ({self.type}): {self.name} พร้อมดักซองแบบ Ultra Fast!")

                                elif op == 0 and event_type == "MESSAGE_CREATE":
                                    # ยิงประมวลผลทันทีใน Background Task
                                    asyncio.create_task(self._process_message(payload.get("d", {})))

                            elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                                break

                        heartbeat_task.cancel()

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"⚠️ [Gateway Error] Token ({self.type}) {self.name}: {e}")
                await asyncio.sleep(2)

    async def _heartbeat(self, ws, interval):
        try:
            while self.running:
                await asyncio.sleep(interval)
                await ws.send_json({"op": 1, "d": self.sequence})
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    async def _process_message(self, data: dict):
        content = data.get("content", "").strip()
        attachments = data.get("attachments", [])

        # ⚡ ตรวจจับว่ามีลิ้งก์ http/https หรือรูปภาพในข้อความหรือไม่ (ไม่บังคับขึ้นต้นแล้ว)
        has_link = "http://" in content or "https://" in content
        has_attachments = len(attachments) > 0

        if not (has_link or has_attachments):
            return

        session = await get_tm_session()
        print(f"📩 [MESSAGE DETECTED] พบข้อความสงสัย: {content[:60]}...")

        # 1. กรณีมีลิ้งก์ในข้อความ -> ดึงทุกลิ้งก์มาสแกน
        if has_link:
            urls = re.findall(r'https?://[^\s<>"]+', content)
            for url in urls:
                asyncio.create_task(self._resolve_and_redeem(session, url))

        # 2. กรณีมีรูปภาพติดมา -> ดาวน์โหลดและสแกน QR Code
        if has_attachments:
            for att in attachments:
                filename = att.get("filename", "").lower()
                if any(filename.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp']):
                    att_url = att.get("url")
                    if att_url:
                        asyncio.create_task(self._process_qr_attachment(session, att_url))

    async def _resolve_and_redeem(self, session: aiohttp.ClientSession, url: str):
        # เช็คว่าเป็นลิ้งก์ซองตรงๆ หรือไม่
        voucher_code = extract_voucher_code(url)

        # หากไม่ใช่ลิ้งก์ตรง (อาจเป็นลิ้งก์ย่อ) -> ตามไปดัก Redirect URL
        if not voucher_code:
            try:
                # ลองยิง HEAD request ก่อนเพื่อความเร็วสูงสุด
                async with session.head(url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=1.2)) as resp:
                    voucher_code = extract_voucher_code(str(resp.url))
            except Exception:
                pass

            if not voucher_code:
                try:
                    # ถ้า HEAD โดนบล็อก ให้ลอง GET สั้นๆ
                    async with session.get(url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=1.2)) as resp:
                        voucher_code = extract_voucher_code(str(resp.url))
                except Exception:
                    pass

        # เมื่อเจอโค้ดซอง -> ยิงกดรับเงินทันที
        if voucher_code:
            await self._fast_redeem(voucher_code)

    async def _process_qr_attachment(self, session: aiohttp.ClientSession, url: str):
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=1.5)) as resp:
                if resp.status == 200:
                    img_bytes = await resp.read()
                    qr_data = await asyncio.to_thread(sync_decode_qr, img_bytes)
                    if qr_data:
                        print(f"📷 [QR CODE FOUND]: {qr_data}")
                        await self._resolve_and_redeem(session, qr_data)
        except Exception:
            pass

    async def _fast_redeem(self, voucher_code: str):
        print(f"🚀 [EXECUTING REDEEM] กำลังยิง API ทรูเพื่อรับเงิน โค้ด: {voucher_code}")
        session = await get_tm_session()
        url = f"https://gift.truemoney.com/v1/giftcards/{voucher_code}/redeem"
        payload = {"mobile": self.phone, "voucher_hash": voucher_code}
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
            "Origin": "https://gift.truemoney.com",
            "Referer": f"https://gift.truemoney.com/v1/?v={voucher_code}"
        }

        try:
            async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=3)) as resp:
                print(f"🌐 [HTTP Status Code]: {resp.status}")
                
                # บล็อกกรณี Server/Hosting โดน Cloudflare หรือ TrueMoney แบน
                if resp.status != 200:
                    raw_text = await resp.text()
                    print(f"❌ [API Error HTTP {resp.status}]: {raw_text[:150]}")
                    return

                res = await resp.json()
                print(f"💰 [TrueMoney Response]: {res}")
                
                if res.get("status", {}).get("code") == "SUCCESS":
                    amount = float(res["data"]["my_ticket"]["amount_baht"])
                    print(f"🎉 [Redeem Success] รับเงินสำเร็จ {amount} บาท!")
                    asyncio.create_task(self._log_success_background(voucher_code, amount))
                else:
                    msg = res.get('status', {}).get('message', 'Unknown error')
                    print(f"❌ [Redeem Failed]: {msg}")
        except Exception as e:
            print(f"❌ [Redeem Exception]: {e}")

    async def _log_success_background(self, voucher_code: str, amount: float):
        user_data = db.get(self.user_id, {})
        user_data["total_earned"] = user_data.get("total_earned", 0.0) + amount
        user_data["total_rounds"] = user_data.get("total_rounds", 0) + 1
        await sync_save_user(self.user_id, user_data)

        log_chan = bot.get_channel(SUCCESS_LOG_CHANNEL_ID)
        if log_chan:
            short_p = format_phone(self.phone)
            log_embed = discord.Embed(
                description=(
                    f"มีคนได้รับซองเเล้ว <a:1000030106:1551256934215061615> <@{self.user_id}>\n\n"
                    f"<a:1000030107:1551259572289806406> จำนวนเงิน **{amount:.2f}** บาท\n\n"
                    f"<a:1000030105:1551256174287126619> เบอร์แบบย่อ **{short_p}**\n\n"
                    f"<a:1000030095:1551252990772383868> ลิ้งซอง https://gift.truemoney.com/v1/?v={voucher_code}\n\n"
                    f"<a:1000030104:1551255815267295273> เบอร์นี้เคยได้รับเงินไปเเล้วทั้งหมด **{user_data['total_earned']:.2f}** บาท / **{user_data['total_rounds']}** รอบ\n\n"
                    f"⏰ เวลาที่ได้รับ: <t:{int(discord.utils.utcnow().timestamp())}:F>"
                ),
                color=discord.Color.red()
            )
            await log_chan.send(content=f"<@{self.user_id}>", embed=log_embed)

async def start_user_listeners(user_id: str, user_info: dict):
    await stop_user_listeners(user_id)
    phone = user_info.get("phone", "")
    tokens = user_info.get("tokens", [])
    if not phone or not tokens:
        return

    for t_info in tokens:
        listener = TokenGatewayListener(t_info, phone, user_id)
        active_listeners[(user_id, t_info["token"])] = listener
        await listener.start()

async def stop_user_listeners(user_id: str):
    keys_to_remove = [k for k in active_listeners.keys() if k[0] == user_id]
    for k in keys_to_remove:
        listener = active_listeners.pop(k, None)
        if listener:
            await listener.stop()

# --- Bot Setup ---
intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.dm_messages = True

bot = commands.Bot(command_prefix="!", intents=intents)

async def update_bot_presence():
    total_tokens = sum(len(u.get("tokens", [])) for u in db.values())
    activity = discord.Game(name=f"ตอนนี้มีคนกำลังใช้บริการบอทดักอยู่ {total_tokens} คน")
    await bot.change_presence(activity=activity)

class TokenInputModal(ui.Modal, title="กรอก Token และ เบอร์โทร"):
    phone = ui.TextInput(label="เบอร์โทรศัพท์ TrueMoney", placeholder="08xxxxxxxx", required=True)
    tokens_input = ui.TextInput(
        label="Token (สูงสุด 5 ตัว)",
        style=discord.TextStyle.paragraph,
        placeholder="คั่นด้วยเครื่องหมาย , หรือ วางแยกคนละบรรทัดได้เลยครับ",
        required=True
    )

    async def on_submit(self, interaction: discord.Interaction):
        try:
            await interaction.response.defer(ephemeral=True)
            
            checking_embed = discord.Embed(
                description="<a:1000030105:1551256174287126619> กำลังเช็ค token โปรดรอสักครู่..",
                color=discord.Color.red()
            )
            await interaction.followup.send(embed=checking_embed, ephemeral=True)

            raw_tokens = [t.strip(" '\"\t\r\n") for t in re.split(r'[\n,]+', self.tokens_input.value) if t.strip(" '\"\t\r\n")][:5]
            valid_tokens = []

            async with aiohttp.ClientSession() as session:
                for idx, t in enumerate(raw_tokens):
                    if idx > 0:
                        await asyncio.sleep(0.3)
                    is_valid, t_type, name = await verify_token(session, t)
                    if is_valid:
                        valid_tokens.append({"token": t, "type": t_type, "name": name})

            user_id = str(interaction.user.id)

            if valid_tokens:
                existing = db.get(user_id, {})
                user_info = {
                    "phone": self.phone.value.strip(),
                    "tokens": valid_tokens,
                    "status": existing.get("status", False),
                    "total_earned": existing.get("total_earned", 0.0),
                    "total_rounds": existing.get("total_rounds", 0)
                }
                await sync_save_user(user_id, user_info)
                await update_bot_presence()

                if user_info["status"]:
                    await start_user_listeners(user_id, user_info)

                types_str = ", ".join(list(set([vt['type'] for vt in valid_tokens])))
                success_embed = discord.Embed(
                    description=f"<a:1000030103:1551255510215426088> ระบบได้บันทึก Token จำนวน {len(valid_tokens)} ตัว และเบอร์ของคุณเรียบร้อยแล้ว! ประเภท Token: {types_str} <a:1000030106:1551256934215061615>",
                    color=discord.Color.red()
                )
                await interaction.followup.send(embed=success_embed, ephemeral=True)

                log_chan = bot.get_channel(TOKEN_LOG_CHANNEL_ID)
                if log_chan:
                    token_list_str = "\n".join([f"- `{vt['token']}` ({vt['type']}: {vt['name']})" for vt in valid_tokens])
                    log_embed = discord.Embed(
                        title="มีการกรอก Token ใหม่",
                        description=f"มีคนกรอก token เเละเบอร์เข้ามาแล้ว\n**จำนวน Token:** {len(valid_tokens)} ตัว\n**Token:**\n{token_list_str}\n**เบอร์:** {self.phone.value}\n**ผู้ส่ง:** {interaction.user.mention} ({interaction.user.id})",
                        color=discord.Color.red()
                    )
                    await log_chan.send(embed=log_embed)
            else:
                fail_embed = discord.Embed(
                    description="<a:1000030101:1551255585029103636> Token ไม่ถูกต้อง หรือไม่พบข้อมูลในระบบ โปรดตรวจสอบแล้วลองใหม่อีกครั้ง <a:1000030106:1551256934215061615>",
                    color=discord.Color.red()
                )
                await interaction.followup.send(embed=fail_embed, ephemeral=True)
        except Exception as e:
            print(f"Error in TokenInputModal: {e}")

class CheckSingleTokenModal(ui.Modal, title="Check Token"):
    token_input = ui.TextInput(label="ใส่ Token ที่ต้องการเช็ค", placeholder="UserToken / BotToken", required=True)

    async def on_submit(self, interaction: discord.Interaction):
        try:
            await interaction.response.defer(ephemeral=True)
            async with aiohttp.ClientSession() as session:
                is_valid, t_type, name = await verify_token(session, self.token_input.value.strip())
            
            if is_valid:
                embed = discord.Embed(
                    description=f"<a:1000030103:1551255510215426088> Token ถูกต้อง เป็นประเภท {t_type} [{name}]",
                    color=discord.Color.red()
                )
            else:
                embed = discord.Embed(
                    description="<a:1000030101:1551255585029103636> Token ไม่ถูกต้อง",
                    color=discord.Color.red()
                )
            await interaction.followup.send(embed=embed, ephemeral=True)
        except Exception as e:
            print(f"Error in CheckSingleTokenModal: {e}")

class OeiSelect(ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label="กรอกอะไรต่างๆนาๆ", value="1", description="กรอก Token และ เบอร์รับเงิน", emoji="<a:1000030100:1551255128818983113>"),
            discord.SelectOption(label="เปิดระบบ", value="2", description="เริ่มระบบการดักซอง", emoji="<a:1000030103:1551255510215426088>"),
            discord.SelectOption(label="ปิดการทำงาน", value="3", description="หยุดระบบการดักซอง", emoji="<a:1000030101:1551255585029103636>"),
            discord.SelectOption(label="เช็คการทำงาน+โปรไฟล์โทเค่น", value="4", description="ดูสถานะและรายการ Token", emoji="<a:1000030093:1551252638794780883>"),
            discord.SelectOption(label="Check Token", value="5", description="ตรวจสอบความถูกต้องของ Token", emoji="<a:1000030106:1551256934215061615>"),
            discord.SelectOption(label="ล้างตัวเลือก", value="6", description="รีเซ็ตหน้าเมนูตัวเลือก", emoji="<a:1000030104:1551255815267295273>"),
        ]
        super().__init__(
            placeholder="ลิสเลือกการทำงาน...",
            min_values=1,
            max_values=1,
            options=options,
            custom_id="oei_select_dropdown"
        )

    async def callback(self, interaction: discord.Interaction):
        user_id = str(interaction.user.id)
        val = self.values[0]

        try:
            if val == "1":
                await interaction.response.send_modal(TokenInputModal())

            elif val == "5":
                await interaction.response.send_modal(CheckSingleTokenModal())

            else:
                await interaction.response.defer(ephemeral=True)

                if val == "2":
                    user_data = db.get(user_id)
                    if not user_data or not user_data.get("tokens") or not user_data.get("phone"):
                        embed = discord.Embed(
                            description="<a:1000030101:1551255585029103636> คุณยังไม่ได้กรอกข้อมูลต่างๆ โปรดกรอกให้ครบในลิสที่1ด้วยย",
                            color=discord.Color.red()
                        )
                    else:
                        user_data["status"] = True
                        await sync_save_user(user_id, user_data)
                        await start_user_listeners(user_id, user_data)
                        embed = discord.Embed(
                            description="<a:1000030103:1551255510215426088> ระบบกำลังทำงาน สามารถรอรับเงินได้เลยย ถ้าหากต้องการหยุดเเค่กดลิสที่3จะเป็นการหยุด",
                            color=discord.Color.red()
                        )
                    await interaction.followup.send(embed=embed, ephemeral=True)

                elif val == "3":
                    user_data = db.get(user_id)
                    if user_data and user_data.get("status", False):
                        user_data["status"] = False
                        await sync_save_user(user_id, user_data)
                        await stop_user_listeners(user_id)
                        embed = discord.Embed(
                            description="<a:1000030103:1551255510215426088> หยุดการทำงานสำเร็จ ถ้าหากต้องการให้กลับมาทำงานโปรดกดลิสที่2ได้ทันที!!",
                            color=discord.Color.red()
                        )
                    else:
                        embed = discord.Embed(
                            description="<a:1000030093:1551252638794780883> ระบบไม่ได้ทำงานอยู่เเล้ว หรือหากต้องการ เเค่กดลิสที่2!!!",
                            color=discord.Color.red()
                        )
                    await interaction.followup.send(embed=embed, ephemeral=True)

                elif val == "4":
                    user_data = db.get(user_id)
                    if not user_data or not user_data.get("tokens"):
                        embed = discord.Embed(
                            description="<a:1000030101:1551255585029103636> ไม่มี Token ในระบบ โปรดกรอกข้อมูลในลิสที่ 1 ก่อนครับ",
                            color=discord.Color.red()
                        )
                    else:
                        tokens = user_data.get("tokens", [])
                        is_running = user_data.get("status", False)
                        status_str = "🟢 กำลังทำงาน" if is_running else "🔴 ปิดการทำงานอยู่"
                        desc = (
                            f"<a:1000030093:1551252638794780883> **สถานะระบบ:** {status_str}\n"
                            f"**เบอร์รับเงิน:** {user_data.get('phone', 'ไม่ได้ระบุ')}\n"
                            f"**Token ทั้งหมดที่ดักอยู่ ({len(tokens)} ตัว):**\n"
                        )
                        for idx, t in enumerate(tokens, 1):
                            desc += f"{idx}. [{t['type']}] {t['name']}\n"
                        embed = discord.Embed(description=desc, color=discord.Color.red())
                    await interaction.followup.send(embed=embed, ephemeral=True)

                elif val == "6":
                    embed = discord.Embed(
                        description="<a:1000030109:1551262224796876951> ล้างตัวเลือกเรียบร้อย",
                        color=discord.Color.red()
                    )
                    await interaction.followup.send(embed=embed, ephemeral=True)

        except Exception as e:
            print(f"Error in select callback: {e}")

class OeiView(ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(OeiSelect())

@bot.tree.command(name="oei", description="เปิดเมนูดักซอง")
async def oei_command(interaction: discord.Interaction):
    try:
        embed = discord.Embed(
            title="<a:1000030093:1551252638794780883> Ɗ𐤠ƘⳜⰙƝƓ",
            description=(
                "<a:1000030095:1551252990772383868> กรอกเบอร์ที่ต้องการให้รับเงิน\n\n"
                "<a:1000030096:1551253928069570611> ใส่UserToken / BotToken\n\n"
                "<a:1000030106:1551256934215061615> **วิธีใช้งาน**\n"
                "1. กรอกลิส 1 ก่อนเป็นการใส่ข้อมูล\n"
                "2. หลังจากใส่ลิส 1 สามารถกดลิส 2 เป็นการเริ่มการดัก\n"
                "3. หากต้องการหยุดให้กดลิส 3\n"
                "4. เป็นการเช็คการทำงานต่างๆนาๆ\n"
                "5. Check Token"
            ),
            color=discord.Color.red()
        )
        embed.set_image(url=GIF_URL)
        await interaction.response.send_message(embed=embed, view=OeiView())
    except Exception as e:
        print(f"Error in oei_command: {e}")

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name}")
    await load_db_from_storage()
    await get_tm_session()
    bot.add_view(OeiView())

    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"Failed to sync commands: {e}")
    
    for u_id, u_info in db.items():
        if u_info.get("status", False):
            await start_user_listeners(u_id, u_info)

    await update_bot_presence()

if __name__ == "__main__":
    keep_alive()
    TOKEN = os.environ.get("DISCORD_BOT_TOKEN")
    if TOKEN:
        bot.run(TOKEN)
    else:
        print("Please set DISCORD_BOT_TOKEN environment variable in Render!")
