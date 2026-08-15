import discord
import asyncio
import aiohttp
import os
from discord.ext import tasks

# ---------- ตั้งค่า Token ----------
# ไปตั้ง Environment Variable ชื่อ DISCORD_TOKEN ใน Render
TOKEN = os.getenv('DISCORD_TOKEN')

if not TOKEN:
    print("❌ กรุณาใส่ DISCORD_TOKEN ใน Environment Variables!")
    exit(1)

class MyClient(discord.Client):
    def __init__(self):
        super().__init__()
        # สถานะที่จะเปลี่ยนไปเรื่อยๆ ทุก 3 วิ
        self.status_messages = [
            "https://discord.gg/CSkY2p9q8",
            "⏔⏔⏔ ꒰ ᧔ෆ᧓ ꒱ ⏔⏔⏔",
            "ϐִִׂ໋֢࣪࣪ᦒ᩠ִׂ໋ׅ֗ȶׂׅ"
        ]
        self.current_idx = 0

    async def on_ready(self):
        print(f"✅ ล็อกอินสำเร็จเป็น: {self.user}")

        # --- ตั้งข้อความและชื่อสตรีม (อย่าลืมเช็กความยาวไม่เกิน 128 ตัว) ---
        stream_name = "𐔌՞.https://discord.gg/5QCPEp5qf ִִֶָ🪽་༘ บริการยิงดิส"
        stream_details = "ִ໋֗ȶִׂׅ࣪ᦒ᩠ִׂׅ࣪ƙָׂᧉ᩠֗ꪀ ִ໋࣪꯱ָׂ࣪℘ִִֺֹֹֹׂ࠭αׂׅׅ࣭࣪ꪑ // ϐִִׂ໋֢࣪࣪ᦒ᩠ִׂ໋ׅ֗ȶׂׅ"
        stream_state = "⏔⏔⏔ ꒰ ᧔ෆ᧓ ꒱ ⏔⏔⏔"

        # --- ใส่ URL GIF ของมึงตรงนี้! ---
        # ตัวอย่าง: "https://i.imgur.com/your_gif.gif"
        gif_url = "https://i.imgur.com/your_gif.gif"  # <--- เปลี่ยนนี่เป็น URL จริงของมึง

        activity = discord.Streaming(
            name=stream_name,
            url="https://www.twitch.tv/CSkY2p9q8",  # ใส่ Twitch หลอกๆ ให้ Discord รู้ว่าเป็น Stream
            details=stream_details,
            state=stream_state,
            # การตั้งค่ารูป GIF สำหรับแบนเนอร์สตรีม
            assets={
                "large_image": f"mp:external/{gif_url}",
                "large_text": "Discord Raid Service"
            }
        )
        
        await self.change_presence(activity=activity)
        print(f"📺 เปิดสตรีมแล้ว: {stream_name}")

        # เริ่มลูปเปลี่ยน Custom Status ทุก 3 วิ
        self.update_custom_status.start()

    @tasks.loop(seconds=3)
    async def update_custom_status(self):
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": self.http.token,
                "Content-Type": "application/json"
            }
            payload = {
                "custom_status": {
                    "text": self.status_messages[self.current_idx]
                }
            }
            try:
                async with session.patch(
                    "https://discord.com/api/v9/users/@me/settings",
                    headers=headers,
                    json=payload
                ) as resp:
                    if resp.status == 200:
                        print(f"[↻] อัปเดตสถานะ: {self.status_messages[self.current_idx]}")
                    else:
                        print(f"❌ อัปเดตสถานะล้มเหลว (HTTP {resp.status})")
            except Exception as e:
                print(f"❌ Error: {e}")

            # สลับไปข้อความถัดไป
            self.current_idx = (self.current_idx + 1) % len(self.status_messages)

# ---------- รันบอท ----------
client = MyClient()
client.run(TOKEN)