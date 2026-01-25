import { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from "discord.js";
import Database from "better-sqlite3";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// SQLite (DB)
const db = new Database("./bot.db");

// สร้างตาราง log ถ้ายังไม่มี
db.prepare(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    action TEXT,
    timestamp INTEGER
  );
`).run();

// Cooldown memory
const cooldown = new Map();

// Invite link (เดิม)
const inviteLink = "https://discord.gg/bdtRJBRyem";

// Menu items
const menuItems = [
  "💬 ขอคำแนะนำ",
  "🛒 ต้องการซื้อของ",
  "📢 ฝากโปรโมท",
  "🎫 ขอเข้าดูสินค้า",
  "📨 ติดต่อร้าน"
];

// Trigger prefix
const prefix = "!";

client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(prefix)) return;

  const cmd = msg.content.slice(prefix.length).toLowerCase();

  if (cmd === "menu") {

    // Anti-spam cooldown (5s per-user)
    const prev = cooldown.get(msg.author.id);
    if (prev && Date.now() - prev < 5000) {
      return msg.reply("⏳ รอสักครู่ cooldown 5s");
    }
    cooldown.set(msg.author.id, Date.now());

    // Random delay 500-2000ms
    const delay = Math.floor(Math.random() * 1500) + 500;

    setTimeout(async () => {
      const embed = new EmbedBuilder()
        .setTitle("📦 เมนูช่วยเหลือ")
        .setDescription(menuItems.map(i => `• ${i}`).join("\n") + `\n\n🔗 **Invite:** ${inviteLink}`)
        .setColor(0x2f3136);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("send_public")
          .setLabel("ส่งในห้องนี้")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("send_dm")
          .setLabel("ส่งใน DM")
          .setStyle(ButtonStyle.Secondary)
      );

      await msg.reply({ embeds: [embed], components: [row] });
    }, delay);
  }
});

// Button Interaction
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const format = `📦 **เมนูช่วยเหลือ**\n${menuItems.map(i => `• ${i}`).join("\n")}\n\n🔗 Invite: ${inviteLink}`;

  const delay = Math.floor(Math.random() * 1500) + 500;
  const ts = Date.now();

  if (interaction.customId === "send_public") {
    setTimeout(async () => {
      await interaction.reply({ content: format });
      db.prepare("INSERT INTO logs (user, action, timestamp) VALUES (?, ?, ?)").run(interaction.user.id, "public", ts);
    }, delay);
  }

  if (interaction.customId === "send_dm") {
    setTimeout(async () => {
      try {
        await interaction.user.send(format);
        await interaction.reply({ content: "📨 ส่งให้ใน DM แล้ว", ephemeral: true });
        db.prepare("INSERT INTO logs (user, action, timestamp) VALUES (?, ?, ?)").run(interaction.user.id, "dm", ts);
      } catch {
        await interaction.reply({ content: "❌ DM ปิดอยู่ ส่งไม่ได้", ephemeral: true });
      }
    }, delay);
  }
});

client.once(Events.ClientReady, () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

client.login(process.env.TOKEN);