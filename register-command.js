import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const commands = [
  {
    name: "ngl",
    description: "ยิงข้อความไปที่ NGL ของคนอื่น",
    options: [
      {
        name: "username",
        type: 3,
        description: "ชื่อหลังลิงก์ NGL",
        required: true
      },
      {
        name: "message",
        type: 3,
        description: "ข้อความที่อยากส่ง",
        required: true
      }
    ]
  }
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
})();