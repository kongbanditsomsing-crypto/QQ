fetch("https://github.com/kongbanditsomsing-crypto/Discord-Quest-Auto-Completion-Selfbot/tree/main")
  .then(res => res.json())
  .then(data => {
    console.log("ข้อมูลที่ดึงมาได้:", data);

    // เอาไปใช้ต่อ
    document.body.innerHTML += `
      <p>ชื่อ: ${data.name}</p>
      <p>ข้อความ: ${data.message}</p>
      <p>จำนวน: ${data.amount}</p>
    `;
  })
  .catch(err => {
    console.error("ดึงไฟล์ไม่สำเร็จ", err);
  });