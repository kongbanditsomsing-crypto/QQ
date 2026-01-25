import fetch from "node-fetch";

// ==== CONFIG ====
const TARGET_USER = "username_ngl";   // ใส่ username NGL
const MESSAGE = "ข้อความที่ต้องการส่ง"; // ข้อความที่จะยิง
const TIMES = 250;                     // จำนวนรอบ
const DELAY = 1;                      // หน่วงเวลาต่อรอบ (วินาที)
// =================

async function sendMsg(user, text) {
  await fetch(`https://ngl.link/${user}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: `question=${encodeURIComponent(text)}`
  });

  console.log(`ยิงแล้ว -> ${text}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function start() {
  console.log("เริ่มยิงข้อความ...");
  console.log(`เป้าหมาย: ${TARGET_USER}`);
  console.log(`ข้อความ: ${MESSAGE}`);
  console.log(`จำนวนรอบ: ${TIMES}`);
  console.log(`ดีเลย์: ${DELAY}s`);
  console.log("===================================");

  for (let i = 1; i <= TIMES; i++) {
    await sendMsg(TARGET_USER, MESSAGE);
    console.log(`รอบ ${i}/${TIMES}`);
    await sleep(DELAY * 10);
  }

  console.log("ยิงเสร็จแล้ว!");
  process.exit(0);
}

start();