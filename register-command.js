require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
  new SlashCommandBuilder()
    .setName("spam")
    .setDescription("Spam text")
    .addStringOption(o => o.setName("text").setDescription("ข้อความ").setRequired(true))
    .addIntegerOption(o => o.setName("count").setDescription("จำนวน")),

  new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("Spam emoji")
    .addStringOption(o => o.setName("emoji").setDescription("emoji").setRequired(true))
    .addIntegerOption(o => o.setName("count").setDescription("จำนวน"))
    .addIntegerOption(o => o.setName("delay").setDescription("delay ms")),

  new SlashCommandBuilder()
    .setName("join")
    .setDescription("เข้าห้องเสียง"),

  new SlashCommandBuilder()
    .setName("tell_off")
    .setDescription("ยิง random ขัดใจคน"),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Deploying...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("Deployed.");
  } catch (err) {
    console.error(err);
  }
})();