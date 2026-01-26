const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");
require("dotenv").config();

const commands = [
  {
    name: "spam",
    description: "ยิงข้อความ",
    options: [
      {
        name: "text",
        description: "ข้อความ",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "count",
        description: "จำนวน",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },
  {
    name: "emoji",
    description: "ยิงอีโมจิ",
    options: [
      {
        name: "emoji",
        description: "อีโมจิ",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "count",
        description: "จำนวน",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "delay",
        description: "ดีเลย์ (ms)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },
  {
    name: "join",
    description: "เข้าห้องเสียง",
  },
  {
    name: "promo",
    description: "โปรโมทเซิร์ฟ",
    options: [
      {
        name: "count",
        description: "จำนวน",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },
  {
    name: "promo_boom",
    description: "สร้างห้อง + ยิงข้อความหนักๆ",
  },
  {
    name: "kick",
    description: "เตะสมาชิก",
    options: [
      {
        name: "user",
        description: "สมาชิก",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "reason",
        description: "เหตุผล",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  {
    name: "tell_off",
    description: "ยิงข้อความสุ่มกวนตีน",
    options: [
      {
        name: "count",
        description: "จำนวน",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },
  {
    name: "senddm",
    description: "ยิง DM",
    options: [
      {
        name: "user",
        description: "สมาชิก",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "text",
        description: "ข้อความ",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "count",
        description: "จำนวน",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },
  {
    name: "allowdm",
    description: "ยินยอมรับ DM",
  },
  {
    name: "shootdm",
    description: "ยิง DM ไปหาคนยินยอม",
    options: [
      {
        name: "user",
        description: "สมาชิก",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "text",
        description: "ข้อความ",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "count",
        description: "จำนวน",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("⏳ Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error(err);
  }
})();