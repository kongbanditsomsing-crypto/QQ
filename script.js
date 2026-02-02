async function start() {
  const name = document.getElementById("name").value;
  const message = document.getElementById("message").value;
  const amount = parseInt(document.getElementById("amount").value);
  const log = document.getElementById("log");

  if (!name || !message || !amount) {
    alert("กรอกข้อมูลให้ครบ");
    return;
  }

  log.innerHTML = "";

  for (let i = 1; i <= amount; i++) {
    log.innerHTML += `📨 [${i}] ส่งถึง <b>${name}</b>: ${message}<br>`;
    await delay(1000);
  }

  log.innerHTML += "<br>✅ เสร็จสิ้น";
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}