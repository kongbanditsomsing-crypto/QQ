import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";

const commands = [
  new SlashCommandBuilder()
    .setName("menu")
    .setDescription("เปิดเมนูช่วยเหลือ")
].map(cmd => cmd.toJSON());

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // ถ้าอยาก global กูจะให้ version global ด้วยตอนท้าย

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("📡 Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error("❌ Error registering commands:", err);
  }
})();