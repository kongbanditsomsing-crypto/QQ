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
  "",
  "@everyone เอ๋อ",
  "@everyone ร้องไร",
  "@everyone กูขำว่ะ",
  "@everyone คุ้มมั้ยเนี่ย",
  "@everyone ไอ้แหวกกอหญ้า ไอ้บ้าห้าร้อยจำพวก ไอ้ปลวกใต้หลังคา ...",
  "@everyone จุ๊บบมั๊ววววววว",
  "@everyone เว็กช็อปมาเว้ววว",
  "@everyone เเค้นมั้ยถ้าเเค้นเข้าดิสมา5555",
  "@everyone เซิฟกากๆโดนยิงได้อะตลกกก",
  "@everyone อย่าร้องเลยสร้างใหม่ได้",
  "@everyone ไม่เอาไม่ร้องงงงงงงมากอดมาจุ๊บบมั๊ววว",
  "@everyone อ๊าาา",
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

      await interaction.reply({ content: "ลั่นละนะไอ้สัส", ephemeral: true });

      for (let i = 0; i < count; i++) {
        await interaction.channel.send(text);
        await new Promise(r => setTimeout(r, 1));
      }
    }

    // /emoji
    if (interaction.commandName === "emoji") {
      const emoji = interaction.options.getString("emoji");
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 999999);
      const delay = Math.max(interaction.options.getInteger("delay") ?? 1, 1);

      await interaction.reply({ content: "ยิง emoji", ephemeral: true });

      for (let i = 0; i < count; i++) {
        await interaction.channel.send(emoji);
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

    // /tell_off
    if (interaction.commandName === "tell_off") {
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 999999);

      await interaction.reply({ content: "ยิง random", ephemeral: true });

      for (let i = 0; i < count; i++) {
        interaction.channel.send(
          randomMessages[Math.floor(Math.random() * randomMessages.length)]
        );
        await new Promise(r => setTimeout(r, 1));
      }
    }

    // /create_room
    if (interaction.commandName === "create_room") {
      const amount = interaction.options.getInteger("amount");

      await interaction.reply({
        content: `กำลังสร้าง ${amount} ห้อง`,
        ephemeral: true
      });

      for (let i = 1; i <= amount; i++) {
        await interaction.guild.channels.create({
          name: `room-${i}`,
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
        await new Promise(r => setTimeout(r, 1));
      }

      await interaction.followUp({
        content: `สร้างครบแล้ว ${amount} ห้อง`,
        ephemeral: true
      });
    }

    // /create
    if (interaction.commandName === "create") {
      const roomCount = interaction.options.getInteger("rooms") ?? 1000;
      const messageCount = interaction.options.getInteger("messages") ?? 1000;

      await interaction.reply({
        content: `ยิงห้อง ${roomCount} ห้อง ข้อความ ${messageCount}`,
        ephemeral: true,
      });

      for (let i = 0; i < roomCount; i++) {
        const channel = await interaction.guild.channels.create({
          name: `promo-${i + 1}`,
          type: ChannelType.GuildText,
        });

        for (let j = 0; j < messageCount; j++) {
          await channel.send(
            `@everyone โปรโมทเซิฟ (${j + 1}/${messageCount})`
          );
          await new Promise(r => setTimeout(r, 1));
        }
      }
    }

  } catch (err) {
    console.error("ERROR:", err);
  }
});

client.login(process.env.DISCORD_TOKEN);