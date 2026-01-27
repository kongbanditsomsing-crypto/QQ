import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [

  // /spam
  new SlashCommandBuilder()
    .setName("spam")
    .setDescription("Spam text")
    .addStringOption(o =>
      o.setName("text")
        .setDescription("ข้อความ สูงสุด999999")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count")
        .setDescription("จำนวน สูงสุด999999")
    ),

  // /emoji
  new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("Spam emoji")
    .addStringOption(o =>
      o.setName("emoji")
        .setDescription("emoji")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count")
        .setDescription("จำนวน สูงสุด999999")
    )
    .addIntegerOption(o =>
      o.setName("delay")
        .setDescription("delay ms")
    ),

  // /join
  new SlashCommandBuilder()
    .setName("join")
    .setDescription("เข้าห้องเสียง"),

  // /tell_off (แก้ให้เลือกจำนวนได้)
  new SlashCommandBuilder()
    .setName("tell_off")
    .setDescription("ยิง random คมๆ ยิงน้อยพ่องตาย")
    .addIntegerOption(o =>
      o.setName("count")
        .setDescription("จำนวน สูงสุด999999")
    ),

  // /create_room
  new SlashCommandBuilder()
    .setName("create_room")
    .setDescription("ยิงโปรโมท ยิงน้อยพ่องตาย")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("จำนวนห้อง สูงสุด1000")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000)
    ),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Deploying slash commands...");
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("Slash commands deployed.");
  } catch (err) {
    console.error(err);
  }
})();