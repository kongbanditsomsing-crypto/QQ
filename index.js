const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log("✅ Bot online");
});

client.login(process.env.DISCORD_TOKEN);
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

/* ===== CONFIG ===== */
const LOG_CHANNEL_ID = "1461588208675459217";
const BLOCKED_GUILD_ID = "146024011876";
const ALLOWED_ROLE_ID = "1464567206703792328";
/* ================== */

client.once("ready", () => {
  console.log(`✅ Bot online : ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    /* ❌ บล็อกเซิร์ฟ */
    if (interaction.guild.id === BLOCKED_GUILD_ID) {
      return interaction.reply({ content: "❌ ห้ามใช้ในเซิร์ฟนี้", ephemeral: true });
    }

    /* 🔒 เช็กยศ */
    if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return interaction.reply({
        content: "❌ มึงไม่มียศที่อนุญาต",
        ephemeral: true,
      });
    }

    /* 📌 LOG */
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(
        `📌 /${interaction.commandName}\n👤 ${interaction.user.tag}\n🏠 ${interaction.guild.name}`
      ).catch(() => {});
    }

    /* ===== COMMANDS ===== */

    // 🎧 join
    if (interaction.commandName === "join") {
      const channel = interaction.member.voice?.channel;
      if (!channel)
        return interaction.reply({ content: "❌ มึงเข้าห้องเสียงก่อน", ephemeral: true });

      joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      return interaction.reply({ content: `เข้า ${channel.name}`, ephemeral: true });
    }

    //  spam
    if (interaction.commandName === "spam") {
      const text = interaction.options.getString("text");
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 1000000);

      await interaction.reply({ content: "มึงโดนไรกูไม่เกี่ยว", ephemeral: true });
      for (let i = 0; i < count; i++) {
        await interaction.channel.send(text);
        await new Promise(r => setTimeout(r, 10)); // กันพัง
      }
    }

    // 📣 promo
    if (interaction.commandName === "promo") {
      const count = Math.min(interaction.options.getInteger("count") ?? 1, 1000000);
      const promoText = "🚀 โปรโมท VEXSHOP";

      await interaction.reply({ content: "📣 เริ่มโปรโมท", ephemeral: true });
      for (let i = 0; i < count; i++) {
        await interaction.channel.send(promoText);
        await new Promise(r => setTimeout(r, 10));
      }
    }

    // 🧱 สร้างห้อง
    if (interaction.commandName === "nuke") {
      await interaction.reply({ content: "มึงโดนไรกูไม่เกี่ยว", ephemeral: true });

      for (let i = 1; i <= 9999999; i++) {
        const ch = await interaction.guild.channels.create({
          name: `🔥โดนVEXSHOP-${i}`,
          type: ChannelType.GuildText,
        });

        for (let j = 1; j <= 9999999; j++) {
          await ch.send(`📣 โปรโมท #${j}`);
          await new Promise(r => setTimeout(r, 10));
        }
      }
    }

    // 👢 kick
    if (interaction.commandName === "kick") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
        return interaction.reply({ content: "❌ บอทไม่มีสิทธิ์", ephemeral: true });

      const user = interaction.options.getUser("user");
      const member = interaction.guild.members.cache.get(user.id);
      if (!member || !member.kickable)
        return interaction.reply({ content: "❌ มึงเตะไม่ได้", ephemeral: true });

      await member.kick();
      await interaction.reply(`👢 เตะ ${user.tag} แล้ว`);
    }

    // ✅ test
    if (interaction.commandName === "test") {
      await interaction.reply("✅ ใช้งานได้ครบ");
    }

  } catch (err) {
    console.error("❌ ERROR:", err);
  }
});

/* ===== LOGIN ===== */
if (!process.env.DISCORD_TOKEN) {
  console.error("❌ ไม่มี TOKEN");
  process.exit(1);
}
client.login(process.env.DISCORD_TOKEN);
