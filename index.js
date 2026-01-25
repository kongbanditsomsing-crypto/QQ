import axios from "axios";

async function sendNGL(username, message) {
  await axios.post(`https://ngl.link/${username}`, {
    question: message,
    deviceId: "ffffffff-ffff-ffff-ffff-ffffffffffff"
  });
}
import fetch from "node-fetch";

async function sendMsg(target, text) {
  await fetch(`https://ngl.link/${target}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `question=${encodeURIComponent(text)}`
  });
  console.log(`ส่งแล้ว -> ${text}`);
}

async {
  console.log("\n=== NGL BOT MENU ===");
  console.log("[1] ตั้งค่าเป้าหมาย (username)");
  console.log("[2] ตั้งค่าข้อความ");
  console.log("[3] ตั้งค่ารอบ / delay");
  console.log("[4] เริ่มยิงข้อความ");
  console.log("[0] ออก\n");

  const choice = await ask("เลือกเมนู: ");
  return choice;
}

async {
  let targetUser = "";
  let text = "";
  let times = 1;
  let delayTime = 10;

   {
    const choice = await menu();

    if (choice === "1") {
      targetUser = await ask("ใส่ username: ");
      console.log("✔ ตั้งค่าเรียบร้อย");
    }

    else if (choice === "2") {
      text = await ask("ข้อความที่จะส่ง: ");
      console.log("✔ ตั้งค่าเรียบร้อย");
    }

    else if (choice === "3") {
      times = parseInt(await ask("จำนวนรอบ: "));
      delayTime = parseInt(await ask("delay(ms): "));
      console.log("✔ ตั้งค่าเรียบร้อย");
    }

    else if (choice === "4") {
      if (!targetUser || !text) {
        console.log("ยังไม่ได้ตั้งค่าเป้าหมายหรือข้อความ");
        continue;
      }
      for (let i = 0; i < times; i++) {
        await sendMsg(targetUser, text);
        await new Promise(r => setTimeout(r, delayTime));
      }
      console.log("🎉 ยิงเสร็จแล้ว!\n");
    }

    else if (choice === "0") {
      console.log("ปิดโปรแกรม");
      rl.close();
      break;
    }

    else {
      console.log("❓ ไม่มีเมนูนี้");
    }
  }
}

start();
