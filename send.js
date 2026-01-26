import { Client, GatewayIntentBits } from "discord.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.on("ready", () => {
  console.log(`Bot Online`);
});

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "ngl") {
    const username = i.options.getString("username");
    const msg = i.options.getString("message");

    await i.reply(`กำลังส่งไปที่ NGL ของ **${username}**...`);

    try {
      await axios.post(`https://ngl.link/api/submit`, {
        username,
        question: msg,
        deviceId: cryptoRandom()
      });

      i.followUp(`ส่งข้อความเรียบร้อย!`);
    } catch (err) {
      i.followUp(`ส่งไม่สำเร็จ: ${err.message}`);
    }
  }
});

function cryptoRandom() {
  return "xxxxxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 10)
  );
}

client.login(process.env.TOKEN);