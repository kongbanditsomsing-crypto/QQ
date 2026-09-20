import discord
from discord.ext import commands, tasks
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

# ... [โค้ดส่วน Configuration / Database / Bot Setup เหมือนเดิม] ...

# --- Global Message Listener for Sniping ---
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
                    # แปลงภาพเป็น NumPy array ให้ OpenCV อ่านได้
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

                    # Send Success Log Embed
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

# ... [ส่วนที่เหลือของโค้ดคงไว้เหมือนเดิม] ...
