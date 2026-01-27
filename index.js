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

// ❗ อันนี้ให้เทสก่อนว่า channel ID ถูกของมึงมั้ย
const LOG_CHANNEL_ID = "1461588208675459217";

// ❗ ถ้าไม่ใช้ feature นี้กูวางไว้เฉยๆ
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
  "@everyone อ๊าาเงี่ยนนนนนนนนนนนนนนนนนนนนนนนนนนนนนนนนนนนน",
];

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    // ❗ block guild
    if (BLOCKED_GUILD_ID && interaction.guild.id === BLOCKED_GUILD_ID) {
      return interaction.reply({
        content: "อย่ามาใช้ในเซิฟกู",
        ephemeral: true,
      });
    }

    // ❗ log command
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

      await interaction.reply({ content: "เริ่มลั่นละนะจ๊ะ มึงโดนอะหยังกูไม่เกี่ยว", ephemeral: true });

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
          content: "มึงเข้า vc ก่อนอันดับเเรกไอ้ควาย",
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
        content: `เข้าห้อง ${vc.name} แล้วอีสัส`,
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

    // /create (สร้างห้องโปรโมท)
    if (interaction.commandName === "create") {
      await interaction.reply({ content: "กำลังยิงห้องโปรโมทงับ มึงโดนไรกูไม่เกี่ยว", ephemeral: true });

      const roomCount = 1000;
      const messageCount = 1000;

      for (let i = 0; i < roomCount; i++) {
        const channel = await interaction.guild.channels.create({
          name: `promo-${i + 1}`,
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

        for (let j = 0; j < messageCount; j++) {
          await channel.send(
            `@everyone ⚡ โปรโมทเซิฟดิสคอร์ด — VEXSHOP • (${j + 1}/${messageCount})`
          );
          await new Promise(r => setTimeout(r, 1));
        }
      }
    }

  } catch (err) {
    console.error("ERROR:", err);
  }
});

// login
client.login(process.env.DISCORD_TOKEN);