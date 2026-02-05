import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [

  new SlashCommandBuilder()
    .setName("spam")
    .setDescription("Spam text")
    .addStringOption(o =>
      o.setName("text").setDescription("ข้อความ สูงสุด999999").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count").setDescription("จำนวน สูงสุด999999")
    ),

  new SlashCommandBuilder()
    .setName("emoji")
    .setDescription("Spam emoji")
    .addStringOption(o =>
      o.setName("emoji").setDescription("emoji").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count").setDescription("จำนวน สูงสุด999999")
    )
    .addIntegerOption(o =>
      o.setName("delay").setDescription("delay ms")
    ),

  new SlashCommandBuilder()
    .setName("join")
    .setDescription("เข้าห้องเสียง"),

  new SlashCommandBuilder()
    .setName("tell_off")
    .setDescription("ยิงข้อความ random")
    .addIntegerOption(o =>
      o.setName("count").setDescription("จำนวน สูงสุด999999")
    ),
new SlashCommandBuilder()
    .setName("vex")
    .setDescription("ฝากบอกข้อความ (ไม่ระบุคนใช้)")
    .addStringOption(o =>
      o.setName("text")
       .setDescription("ข้อความที่มึงต้องการฝากบอก")
       .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("create_room")
    .setDescription("ยิงห้อง")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("จำนวนห้อง")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1000)
    ),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("เตะคนออกจากเซิร์ฟ")
    .addUserOption(o =>
      o.setName("target").setDescription("เลือกคน").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("เหตุผล")
    ),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("แบนคนออกจากเซิร์ฟ")
    .addUserOption(o =>
      o.setName("target").setDescription("เลือกคน").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("เหตุผล")
    ),

  new SlashCommandBuilder()
    .setName("dm")
    .setDescription("ยิงข้อความเข้า DM")
    .addUserOption(o =>
      o.setName("target").setDescription("เลือกคน").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("text").setDescription("ข้อความ").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("count").setDescription("จำนวน สูงสุด999999")
    ),

  // =======================
  // /angpao ⭐ เพิ่มใหม่
  // =======================
  new SlashCommandBuilder()
    .setName("angpao")
    .setDescription("เจนลิ้งเปาาา (ด่าา~)")

].map(cmd => cmd.toJSON());

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