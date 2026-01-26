const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
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

const LOG_CHANNEL_ID = "1461588208675459217";
const BLOCKED_GUILD_ID = "146024011876123456";

const randomMessages = [
  "",
  "เอ๋อ",
  "ร้องไร",
  "ขำว่ะ",
  "คุ้มมั้ยเนี่ย",
  "ไอ้แหวกกอหญ้า ไอ้บ้าห้าร้อยจำพวก ไอ้ปลวกใต้หลังคา ...",
  "จุ๊บบมั๊ววววววว",
  "เว็กช็อปมาเว้ววว",
  "เเค้นมั้ยถ้าเเค้นเข้าดิสมา5555",
  "เซิฟกากๆโดนยิงได้อะตลกกก",
  "อย่าร้องเลยสร้างใหม่ได้",
  "ไม่เอาไม่ร้องงงงงงมากอดมาจุ๊บบมั๊ววว",
];

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`)
});

// Slash commands actions
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    // block guild
    if (interaction.guild.id === BLOCKED_GUILD_ID) {
      return interaction.reply({
        content: "อย่ามาใช้ในเซิฟกู",
        ephemeral: true,
      });
    }

    // log
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(`/${interaction.commandName} ใช้โดย ${interaction.user.tag}`);
    }

    // ---- /spam ----
    if (interaction.commandName === "spam") {
      const text = interaction.options.getString("text");
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 100000);

      await interaction.reply({ content: "เริ่มลั่น", ephemeral: true });

      for (let i = 0; i < count; i++) {
        await interaction.channel.send(text);
        await new Promise(res => setTimeout(res, 10));
      }
    }

    // ---- /emoji ----
    if (interaction.commandName === "emoji") {
      const emoji = interaction.options.getString("emoji");
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 100000);
      const delay = Math.max(interaction.options.getInteger("delay") ?? 10, 10);

      await interaction.reply({ content: "ยิง emoji", ephemeral: true });

      for (let i = 0; i < count; i++) {
        await interaction.channel.send(emoji);
        await new Promise(res => setTimeout(res, delay));
      }
    }

    // ---- /join ----
    if (interaction.commandName === "join") {
      const channel = interaction.member.voice?.channel;
      if (!channel) return interaction.reply({
        content: "เข้า voice ก่อน",
        ephemeral: true,
      });

      joinVoiceChannel({
        channelId: channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      interaction.reply({ content: `เข้าห้อง ${channel.name}`, ephemeral: true });
    }

    // ---- /tell_off ----
    if (interaction.commandName === "tell_off") {
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 10000);

      await interaction.reply({ content: "ยิง random", ephemeral: true });

      for (let i = 0; i < count; i++) {
        await interaction.channel.send(randomMessages[Math.floor(Math.random() * randomMessages.length)]);
        await new Promise(res => setTimeout(res, 10));
      }
    }

  } catch (err) {
    console.error("ERROR:", err);
  }
});

client.login(process.env.DISCORD_TOKEN);