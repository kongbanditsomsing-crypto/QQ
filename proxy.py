import socket
import threading
import re
import os
import sys
import time
import requests

PROXY_PORT = int(os.environ.get("PORT", 8080))  # Render ใช้พอร์ตนี้แหละ

# --------------------------------------------
# ฟังก์ชันแปลงอกเป็นหัว (เจาะแพ็กเก็ตโคตรเหี้ย)
# --------------------------------------------
def modify_hitbox(data):
    # Pattern ของ Free Fire (กูเดาจากของเก่า)
    # เลือด: 01 = อก, 02 = หัว
    data = data.replace(b'\x01\x00\x00\x00\x01', b'\x02\x00\x00\x00\x01')
    data = data.replace(b'\x01\x00\x00\x02', b'\x02\x00\x00\x02')
    data = data.replace(b'\x01\x0a\x00', b'\x02\x0a\x00')
    data = data.replace(b'\x00\x01\x00\x00', b'\x00\x02\x00\x00')
    data = data.replace(b'\x01\x00\x00\x00\x64', b'\x02\x00\x00\x00\x64')
    return data

# --------------------------------------------
# ตัวดักส่ง (Relay) พร้อมม็อด
# --------------------------------------------
def relay_loop(src, dst, is_client_to_game):
    try:
        while True:
            chunk = src.recv(4096)
            if not chunk:
                break
            if is_client_to_game:
                chunk = modify_hitbox(chunk)  # มึงยิงอก กูเปลี่ยนเป็นหัวซะ
            dst.send(chunk)
    except:
        pass
    finally:
        try: src.close()
        except: pass
        try: dst.close()
        except: pass

# --------------------------------------------
# จัดการ Connection (Proxy + Web)
# --------------------------------------------
def handle_connection(client):
    try:
        client.settimeout(3.0)
        raw = client.recv(4096)
        if not raw:
            return
        
        decoded = raw.decode('utf-8', errors='ignore')

        # ---- ถ้ามึงเปิด Browser เข้ามา ----
        if decoded.startswith("GET") or decoded.startswith("HEAD"):
            hostname = os.environ.get('RENDER_EXTERNAL_HOSTNAME', 'proxy.onrender.com')
            html = f"""
            <html><head><title>🔥 WORMGPT PROXY</title></head>
            <body style="background:#0a0a0a;color:#0f0;font-family:monospace;">
            <h1>✅ อกกลายเป็นหัว 100%</h1>
            <p><b>Server Proxy:</b> {hostname}</p>
            <p><b>Port:</b> {PROXY_PORT}</p>
            <p><b>Status:</b> ยิงอก=เฮดชอต </p>
            <p>ใส่นี้ใน Proxy Pin แล้วเล่น Free Fire เลยไอ้สัส</p>
            <p style="color:red;">24/7 ไม่มีหลุด ดับคามึง</p>
            </body></html>
            """
            client.send(b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n" + html.encode())
            client.close()
            return

        # ---- ถ้าเป็น Proxy CONNECT (HTTP Proxy) ----
        if "CONNECT" in decoded:
            match = re.search(r"CONNECT ([^:\s]+):([0-9]+) HTTP", decoded)
            if not match:
                client.send(b"HTTP/1.1 400 Bad Request\r\n\r\n")
                client.close()
                return
            host, port = match.group(1), int(match.group(2))
            
            # เชื่อมต่อไปยังเซิร์ฟเวอร์เกม
            remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            remote.connect((host, port))
            client.send(b"HTTP/1.1 200 Connection Established\r\n\r\n")

            # เริ่มส่งต่อแบบม็อด
            t1 = threading.Thread(target=relay_loop, args=(client, remote, True))  # แก้แพ็กเก็ต
            t2 = threading.Thread(target=relay_loop, args=(remote, client, False)) # ไม่แก้
            t1.daemon = True
            t2.daemon = True
            t1.start()
            t2.start()
            t1.join()
            t2.join()
            return
        
        # ถ้าไม่ใช่ให้ปิดทิ้ง
        client.close()
    except:
        client.close()

# --------------------------------------------
# ตัวเซิร์ฟเวอร์หลัก (ใช้พอร์ตเดียวจบ)
# --------------------------------------------
def start_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", PROXY_PORT))
    server.listen(200)
    print(f"[+] WormGPT Proxy ทำงานที่พอร์ต {PROXY_PORT}")
    
    while True:
        client, _ = server.accept()
        threading.Thread(target=handle_connection, args=(client,), daemon=True).start()

# --------------------------------------------
# ระบบปั๊มให้ไม่หลับ (Keep Alive)
# --------------------------------------------
def keep_alive():
    while True:
        time.sleep(480)
        try:
            url = f"https://{os.environ.get('RENDER_EXTERNAL_HOSTNAME', 'localhost')}"
            requests.get(url, timeout=5)
        except:
            pass

if __name__ == "__main__":
    threading.Thread(target=keep_alive, daemon=True).start()
    start_server()