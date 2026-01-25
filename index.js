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


const allowedUsers = new Set();
const LOG_CHANNEL_ID = "1461588208675459217";
const BLOCKED_GUILD_ID = "146024011876";

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log("✅ Bot online");
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) return;

    // Blocked Guild Check
    if (interaction.guild.id === BLOCKED_GUILD_ID) {
      return interaction.reply({
        content: "❌ อย่ามาใช้ในเซิฟกู",
        ephemeral: true,
      });
    }

    // Logging system
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const logMessage = `
📌 มีการใช้คำสั่ง
👤 ผู้ใช้: ${interaction.user.tag} (${interaction.user.id})
🛠 คำสั่ง: /${interaction.commandName}
🏠 เซิร์ฟเวอร์: ${interaction.guild.name}
___________________________________
      `;
      logChannel.send({ content: logMessage }).catch(() => {});
    }

    if (interaction.commandName === "spam") {
      const text = interaction.options.getString("text");
      const count = Math.min(
        interaction.options.getInteger("count") ?? 5,
        100000,
      );

      await interaction.reply({
        content: "เริ่มลั่นเเล้วไอ้สัส 🔥",
        ephemeral: true,
      });

      let sent = 0;
      const interval = setInterval(async () => {
        if (sent >= count) {
          clearInterval(interval);
          return;
        }
        await interaction.channel.send(text).catch(() => {
          clearInterval(interval);
        });
        sent++;
      }, 10);
    }

    if (interaction.commandName === "emoji") {
      const emoji = interaction.options.getString("emoji");
      const count = Math.min(
        interaction.options.getInteger("count") ?? 5,
        10000,
      );
      const delay = Math.max(interaction.options.getInteger("delay") ?? 10, 10);

      await interaction.reply({
        content: "เริ่มยิงอีโมจิเเล้วไอ้สัส 💢",
        ephemeral: true,
      });

      let sent = 0;
      const interval = setInterval(async () => {
        if (sent >= count) {
          clearInterval(interval);
          return;
        }
        await interaction.channel.send(emoji).catch(() => {
          clearInterval(interval);
        });
        sent++;
      }, delay);
    }

    if (interaction.commandName === "join") {
      const channel = interaction.member.voice?.channel;
      if (!channel) {
        return interaction.reply({
          content: "ต้องอยู่ในห้องเสียงก่อนไอ้สัส",
          ephemeral: true,
        });
      }

      joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      await interaction.reply({
        content: `เข้าห้อง ${channel.name} แล้วไอ้เหี้ย 🎧`,
        ephemeral: true,
      });
    }

    if (interaction.commandName === "promo") {
      const count = Math.min(interaction.options.getInteger("count") ?? 1, 100000);
      const promoText = `🚀 ดิสใหม่มาแรง !\nเข้ามาคุย ยิงดิส เแจกของ ได้เต็มที่!\n👉 https://discord.gg/bdtRJBRyem`;

      await interaction.reply({
        content: `เริ่มโปรโมทเเล้วไอ้สัส ${count} ครั้ง 📢`,
        ephemeral: true,
      });

      let sent = 0;
      const interval = setInterval(async () => {
        if (sent >= count) {
          clearInterval(interval);
          return;
        }
        await interaction.channel.send(promoText).catch(() => {
          clearInterval(interval);
        });
        sent++;
      }, 10);
    }

    const guild = interaction.guild;
let count = 100;

/* ✅ ใส่ตรงนี้ */
const promoMessages = [];

for (let i = 1; i <= 100; i++) {
  promoMessages.push(`📣 โปรโมทร้าน VEXSHOP #${i}`);
}
/* ------------------ */

for (let i = 1; i <= 10; i++) {
  try {
    const channel = await guild.channels.create({
      name: `🔥โดนVEXSHOPดับไปดิ-${i}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });

    if (channel) {
      /* ✅ ส่งหลายข้อความ */
      for (const msg of promoMessages) {
        await channel.send(msg);
        await new Promise(res => setTimeout(res, 10)); // หน่วง 1 วิ
      }
    }

    console.log(`✅ สร้างห้องที่ ${i}`);
    count++;

  } catch (err) {
    console.log(`❌ พังที่ห้อง ${i}: ${err.message}`);
  }
}
    if (interaction.commandName === "kick") {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.KickMembers,
        )
      ) {
        return interaction.reply({
          content: "❌ มึงไม่มีสิทธิ์เตะสมาชิก",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") ?? "ไม่ระบุเหตุผล";
      const member = interaction.guild.members.cache.get(user.id);

      if (!member) {
        return interaction.reply({
          content: "❌ ไม่เจอสมาชิกคนนี้มึงหลอนเเล้ว",
          ephemeral: true,
        });
      }

      if (!member.kickable) {
        return interaction.reply({
          content: "❌ มึงเตะคนนี้ไม่ได้ (ไอ้เหี้ยนี่ยศสูงกว่าบอท)",
          ephemeral: true,
        });
      }

      await member.kick(reason);
      await interaction.reply({
        content: `👢 เตะ **${user.tag}** ออกจากเซิร์ฟแล้ว\nเหตุผล: ${reason}`,
      });
    }

    if (interaction.commandName === "tell_off") {
      const count = Math.min(
        interaction.options.getInteger("count") ?? 5,
        10000,
      );
      await interaction.reply({
        content: "กูกำลังส่งข้อความ...",
        ephemeral: true,
      });

      let sent = 0;
      const interval = setInterval(async () => {
        if (sent >= count) {
          clearInterval(interval);
          return;
        }
"พวกกูชั้นสูง",
  "# ไอ้แหวกกอหญ้า ไอ้บ้าห้าร้อยจำพวก ไอ้ปลวกใต้หลังคา ไอ้หน้าปลาจวด ไอ้กรวดท้องร่อง ไอ้บ้องกัญชา ไอ้ปลาไม่กินเบ็ด ไอ้เห็ดสามสี ไอ้ชะนีสามรส ไอ้ตดเสียงดัง ไอ้ทั่งตีเหล็ก ไอ้เด็กปัญญาอ่อน ไอ้นอนเกา ไอ้กะโหลกซออู้ ไอ้กู่ไม่กลับ ไอ้ตับย่างเกลือ ไอ้เชื้ออหิวาต์ ไอ้ม้าขี้ครอก ไอ้หอกขึ้นสนิม ไอ้ขิมสายขาด ไอ้ชาติสุนัข ไอ้ตะหวักตะบวย ไอ้กล้วยตากแห้ง ไอ้แกงฟักทอง ไอ้ชาติสุนัข ไอ้ตะหวักตะบวย ไอ้กล้วยตากแห้ง ไอ้แกงฟักทอง ไอ้ชาติสุนัข ไอ้ตะหวักตะบวย ไอ้กล้วยตากแห้ง ไอ้แกงฟักทอง ไอ้กระชุก้นรั่ว ไอ้หัวองคชาต ไอ้กระจาดปลาแห้ง ไอ้แทงไม่เข้ารู ไอ้ปลาทูแม่กลอง ไอ้สององคต ไอ้หดหัวในกระฎอง ไอ้สมองเท่าเมล็ดถั่ว ไอ้ตัวกินไก่ ไอ้ใจปลาซิว ไอ้หิวตลอดศก ไอ้ซกมกเป็นนิจสิน ไอ้หินใต้บาดาล ไอ้สันดานนักเลง ไอ้เพลงผิดคีย์ ไอ้สีทาบ้าน ไอ้จานเปื้อนคราบ ไอ้แมลงสาบทรงเครื่อง ไอ้เปลืองข้าวสุก ไอ้กระปุกตังไฉ่ ไอ้ไหปลา- ไอ้คนแบกกุ้ง ไอ้ถุงข้าวเปลือก ไอ้เศือกทุกงาน ไอ้มารสังคม ไอ้ผ้าห่มสีซีด ไอ้ศพไม่ฉีดฟอร์มาลิน ไอ้กระถินริมรั้ว ไอ้สาคูน้ำกะทิ ไอ้กะปิค้างคืน ไอ้หื่นเป็นสันดาน ไอ้ขวานผ่าซาก ไอ้กากสิ่งปฏิกูล ไอ้พะยูนตากแดด ไอ้แรดสองนอ ไอ้จอหนังตะลุง ไอ้ถุงสองใบ ไอ้ไข่ลูกเดียว ไอ้เคียวห่วยๆ ไอ้ถ้วยสังขยาบูด ไอ้ฉลาดแต่เรื่องโง่ ไอ้โมฆบุรุษ ไอ้มนษย์สามานย์ ไอ้เชี่ยวชาญแต่เรื่องชั่ว ไอ้กระต่ายขูดมะพร้าว ไอ้ชาวสวนทุเรียน ไอ้ตะเพียนหางยาว ไอ้ว่าวหางขาด ไอ้แกงคั่วหอยขม ไอ้นิยมแต่เรื่องผิด ไอ้จิตวิปลาส ไอ้ทาสเงินตรา ไอ้ชฎายอดหัก ไอ้ไม้หลักปักขี้เลน ไอ้จิ้งเหลนหางไหม้ ไอ้แกงคั่วหอยขม ไอ้นิยมแต่เรื่องผิด ไอ้จิตวิปลาส ไอ้ทาสเงินตรา ไอ้ตาเถรตกใต้ถุน ไอ้เนรคุณแผ่นดินเกิด ไอ้ระเบิดแสวงเครื่อง ไอ้ครกกระเดื่องตำข้าว ไอ้มะพร้าวห้าวยัดปาก ไอ้สากกระเบือยัดก้น ไอ้คนไททิ้งแผ่นดิน ไอ้วินมอเตอร์ไซค์",
  "พวกกูชั้นสูง",
  "จุ๊บม๊วววววว",
  "วะวะวะVEXSHOP",
  "โดนบอทฟรียิงอ่อนมากกกกก",
  "เเค้นมั้ยถ้าเเค้นเข้าดิสมา555555",
  "ใต้ตีนกันจาดดดด",
  "จะจะจะจะ จอยนาวววว",
  "ให้หมดเลยกากกันขนาดนี้5555",
  "ไม่ต้องพูดไรเยอะถือว่าเรารู้มื๊อออออ~",
  "จะวัดอะไรก็ได้เเต่ไม่ใช่วัดเรื่องวาสนามึงไปหาหมอได้เลยกูว่าสมองมึงมีปัญหาเเละเงินกูมีเป็นปึกเเม่งใช้ไม่หมดเเละโครตจะหนาเเล้วพวกกูเกิดที่ISREALถ้ามึงข้องใจก็เข้ามาหากูต่อให้มึง7ร้อย7ข้ามกี่100กี่ข้ามมหาสมุทรมึงก็ยังตามพวกกูไม่ทันเพราะรัศมีกูสูงที่สุดกูมีทุกอย่างที่มึงต้องการกูมีทุกอย่างที่มึงไม่มีเเล้วมึงอย่าหวังจะเทียบกูได้ถ้าพวกมึงเป็นเเค่วันนาบีปักธงน้ำเงินขึ้นกลางอร่ามลมหนาวสีครามเหนือเเสงขยายหยงชุนไปทั่วทวีปให้ชื่อเสียงกูอยู่ทั่วทุกที่เขาบอกว่ากูเป็นNever dieเเต่กูจะตายเเละฟื้นคืนชีพเเละเข็มกัดเเชมป์มันอยู่ที่เอวเพราะพวกกูคือwinterfell",
await interaction.channel.send(randomMsg).catch(() => {
          clearInterval(interval);
        });
        sent++;
      }, 10);
    }
  
    if (interaction.commandName === "senddm") {
      const user = interaction.options.getUser("user");
      const text = interaction.options.getString("text");
      const count = Math.min(
        interaction.options.getInteger("count") ?? 5,
        100000,
      );

      await interaction.reply({
        content: `เริ่มยิง DM ไปหา **${user.tag}** เเล้วไอ้สัส 🔥`,
        ephemeral: true,
      });

      let sent = 0;
      const interval = setInterval(async () => {
        if (sent >= count) {
          clearInterval(interval);
          return;
        }
        try {
          await user.send(text);
          sent++;
        } catch (err) {
          console.log(`❌ ส่ง DM ไม่ได้: ${err.message}`);
          clearInterval(interval);
        }
      }, 10);
    }

    if (interaction.commandName === "allowdm") {
      allowedUsers.add(interaction.user.id);
      return interaction.reply({
        content: "ยินยอมรับ DM จากบอทแล้ว ✅",
        ephemeral: true,
      });
    }

    if (interaction.commandName === "shootdm") {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator,
        )
      ) {
        return interaction.reply({
          content: "❌ แอดมินเท่านั้น",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("user");
      const text = interaction.options.getString("text");
      const count = Math.min(
        interaction.options.getInteger("count") ?? 1,
        100000,
      );

      if (!allowedUsers.has(user.id)) {
        return interaction.reply({
          content: "❌ เเย่จังมันไม่ยินยอม",
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: `บอทกำลังยิง DM จำนวน ${count} ข้อความ...`,
        ephemeral: true,
      });

      let sent = 0;
      const interval = setInterval(async () => {
        if (sent >= count) {
          clearInterval(interval);
          return;
        }
        try {
          await user.send(text);
          sent++;
        } catch (err) {
          console.log(`❌ ยิง DM พลาด: ${err.message}`);
          clearInterval(interval);
        }
      }, 500);
    }
  } catch (err) {
    console.error("❌ ERROR:", err);
  }
});
          
if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN);
} else {
  console.error("❌ DISCORD_TOKEN is missing in environment secrets.");
}
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log("✅ Bot online");
});

clien.login(process.env.DISCORD_TOKEN);
const { Client, GatewayIntentBits } = require("discord.js");

// 🔒 ใส่ Role ID ที่อนุญาต
const ALLOWED_ROLE_ID = "1464567206703792328";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log("✅ Bot online");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return;

  // ❌ ถ้าไม่มียศที่กำหนด
  if (!interaction.member.roles.cache.has(1464567206703792328)) {
    return interaction.reply({
      content: "มึงไม่มียศที่อนุญาตให้ใช้คำสั่งนี้ไปรับยศในดิสกูสะ",
      ephemeral: true
    });
  }

  // ✅ ตัวอย่างคำสั่ง
  if (interaction.commandName === "test") {
    await interaction.reply("มึงมียศ ใช้คำสั่งได้!");
  }
});

client.login("TOKEN_BOT");