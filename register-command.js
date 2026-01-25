import crypto from "crypto";
async function sendNGL(username, text) {
  try {
    const payload = {
      username,
      question: text,
      deviceId: crypto.randomUUID()
    }

    await fetch("https://ngl.link/api/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    })

  } catch (err) {
    console.log("NGL error:", err)
  }
}