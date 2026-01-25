import fetch from "node-fetch";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise(r => rl.question(q, r));

async function sendMsg(target, text) {
  await fetch(`https://ngl.link/${target}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `question=${encodeURIComponent(text)}`
  });
  console.log(`ส่งแล้ว -> ${text}`);
}

async function menu() {
  console.log("\n== NGL BOT MENU ==");
  console.log("[1] ตั้งค่าชื่อเป้าหมาย (username)");
  console.log("[2] ตั้งข้อความ");
  console.log("[3] ตั้งจำนวนรอบ");
  console.log("[4] ตั้ง delay (วินาที)");
  console.log("[5] เริ่มยิงข้อความ");
  console.log("[0] ออก\n");

  const choice = await ask("เลือกเมนู: ");
  return choice;
}

async function start() {
  let targetUser = "";
  let text = "";
  let times = 1;
  let delayTime = 3;

  while (true) {
    const choice = await menu();

    if (choice === "1") {
      targetUser = await ask("ใส่ username: ");
      console.log(`ตั้ง username = ${targetUser}`);
    }

    if (choice === "2") {
      text = await ask("ใส่ข้อความ: ");
      console.log(`ข้อความ = ${text}`);
    }

    if (choice === "3") {
      times = Number(await ask("จำนวนรอบ: "));
      console.log(`จำนวนรอบ = ${times}`);
    }

    if (choice === "4") {
      delayTime = Number(await ask("delay (วินาที): "));
      console.log(`delay = ${delayTime}`);
    }

    if (choice === "5") {
      if (!targetUser || !text) {
        console.log("ยังไม่ได้ตั้ง username หรือข้อความ");
        continue;
      }

      for (let i = 0; i < times; i++) {
        await sendMsg(targetUser, text);
        await new Promise(r => setTimeout(r, delayTime * 10));
      }

      console.log("ยิงเสร็จแล้ว!");
    }

    if (choice === "0") {
      process.exit(0);
    }
  }
}

start();
