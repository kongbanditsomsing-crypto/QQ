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

// @ts-check
/// <reference path="./types.d.ts" />

// From https://github.com/rigwild/discord-self-bot-console

{
  var gid = '' // Current guild id
  var cid = '' // Current channel id
  var authHeader = '' // Authorization token
  var autoUpdateToken = undefined // Should the token be updated automatically when a request with the token is intercepted?

  // Call this to update `cid` and `gid` to current channel and guild id
  var update_guildId_and_channelId_withCurrentlyVisible = (log = true) => {
    gid = window.location.href.split('/').slice(4)[0]
    cid = window.location.href.split('/').slice(4)[1]
    if (log) {
      console.log(`\`gid\` was set to the guild id you are currently looking at (${gid})`)
      console.log(`\`cid\` was set to the channel id you are currently looking at (${cid})`)
    }
  }
  var id = update_guildId_and_channelId_withCurrentlyVisible

  /** @type {import('./types').api['delay']} */
  var delay = ms => new Promise(res => setTimeout(res, ms))
  // prettier-ignore
  var qs = obj => Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('&')

  /** @type {import('./types').api['apiCall']} */
  var apiCall = (apiPath, body, method = 'GET', options = {}) => {
    if (!authHeader) throw new Error("The authorization token is missing. Did you forget to set it? `authHeader = 'your_token'`")

    const fetchOptions = {
      body: body ? body : undefined,
      method,
      headers: {
        Accept: '*/*',
        'Accept-Language': 'en-US',
        Authorization: authHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9015 Chrome/108.0.5359.215 Electron/22.3.12 Safari/537.36',
        'X-Super-Properties': btoa(
          JSON.stringify({
            os: 'Windows',
            browser: 'Discord Client',
            release_channel: 'stable',
            client_version: '1.0.9163',
            os_version: '10.0.22631',
            os_arch: 'x64',
            app_arch: 'x64',
            system_locale: 'en-US',
            browser_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9163 Chrome/124.0.6367.243 Electron/30.2.0 Safari/537.36',
            browser_version: '30.2.0',
            os_sdk_version: '22631',
            client_build_number: 327338,
            native_build_number: 52153,
            client_event_source: null,
          }),
        ),
      },
      ...options,
    }
    const isFormData = body?.constructor?.name === 'FormData'
    if (!isFormData) {
      fetchOptions.headers['Content-Type'] = 'application/json'
      fetchOptions.body = JSON.stringify(body)
    }
    return fetch(`https://discord.com/api/v9${apiPath}`, fetchOptions)
      .then(res => {
        if (res.ok) return res.json()
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
      })
      .catch(err => {
        console.error(err)
        throw new Error('An error occurred while fetching the API.')
      })
  }

  /** @type {import('./types').api} */
  var api = {
    getMessages: (channelOrThreadId, limit = 100, params = {}) => apiCall(`/channels/${channelOrThreadId}/messages?limit=${limit ?? 100}&${qs(params)}`),
    sendMessage: (channelOrThreadId, message, tts, body = {}) => apiCall(`/channels/${channelOrThreadId}/messages`, { content: message, tts: !!tts, ...body }, 'POST'),
    replyToMessage: (channelOrThreadId, repliedMessageId, message, tts, body = {}) =>
      apiCall(`/channels/${channelOrThreadId}/messages`, { content: message, message_reference: { message_id: repliedMessageId }, tts: !!tts, ...body }, 'POST'),
    editMessage: (channelOrThreadId, messageId, newMessage, body = {}) => apiCall(`/channels/${channelOrThreadId}/messages/${messageId}`, { content: newMessage, ...body }, 'PATCH'),
    deleteMessage: (channelOrThreadId, messageId) => apiCall(`/channels/${channelOrThreadId}/messages/${messageId}`, null, 'DELETE'),

    createThread: (channelId, toOpenThreadInmessageId, name, autoArchiveDuration = 1440, body = {}) =>
      apiCall(`/channels/${channelId}/messages/${toOpenThreadInmessageId}/threads`, { name, auto_archive_duration: autoArchiveDuration, location: 'Message', type: 11, ...body }, 'POST'),
    createThreadWithoutMessage: (channelId, name, autoArchiveDuration = 1440, body = {}) =>
      apiCall(`/channels/${channelId}/threads`, { name, auto_archive_duration: autoArchiveDuration, location: 'Message', type: 11, ...body }, 'POST'),
    deleteThread: threadId => apiCall(`/channels/${threadId}`, null, 'DELETE'),

    // Use this generator: https://discord.club/dashboard
    // Click `+` at the bottom in the embed section then copy the `embed` key in the JSON output.
    // Does not work with user account anymore!
    sendEmbed: (channelOrThreadId, embed = { title: 'Title', description: 'Description' }) => apiCall(`/channels/${channelOrThreadId}/messages`, { embed }, 'POST'),

    getRoles: guildId => apiCall(`/guilds/${guildId}/roles`),
    createRole: (guildId, name) => apiCall(`/guilds/${guildId}/roles`, { name }, 'POST'),
    deleteRole: (guildId, roleId) => apiCall(`/guilds/${guildId}/roles/${roleId}`, null, 'DELETE'),

    getBans: guildId => apiCall(`/guilds/${guildId}/bans`),
    banUser: (guildId, userId, reason) => apiCall(`/guilds/${guildId}/bans/${userId}`, { delete_message_days: '7', reason }, 'PUT'),
    unbanUser: (guildId, userId) => apiCall(`/guilds/${guildId}/bans/${userId}`, null, 'DELETE'),
    kickUser: (guildId, userId) => apiCall(`/guilds/${guildId}/members/${userId}`, null, 'DELETE'),

    addRole: (guildId, userId, roleId) => apiCall(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, null, 'PUT'),
    removeRole: (guildId, userId, roleId) => apiCall(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, null, 'DELETE'),

    auditLogs: guildId => apiCall(`/guilds/${guildId}/audit-logs`),

    getChannels: guildId => apiCall(`/guilds/${guildId}/channels`),
    createChannel: (guildId, name, type) => apiCall(`/guilds/${guildId}/channels`, { name, type }, 'POST'),
    deleteChannel: channelId => apiCall(`/channels/${channelId}`, null, 'DELETE'),
    getChannel: channelOrThreadId => apiCall(`/channels/${channelOrThreadId}`),

    pinnedMessages: channelId => apiCall(`/channels/${channelId}/pins`),
    addPin: (channelId, messageId) => apiCall(`/channels/${channelId}/pins/${messageId}`, null, 'PUT'),
    deletePin: (channelId, messageId) => apiCall(`/channels/${channelId}/pins/${messageId}`, null, 'DELETE'),

    listEmojis: guildId => apiCall(`/guilds/${guildId}/emojis`),
    getEmoji: (guildId, emojiId) => apiCall(`/guilds/${guildId}/emojis/${emojiId}`),
    createEmoji: (guildId, name, image, roles) => apiCall(`/guilds/${guildId}`, { name, image, roles }, 'POST'),
    editEmoji: (guildId, emojiId, name, roles) => apiCall(`/guilds/${guildId}/${emojiId}`, { name, roles }, 'PATCH'),
    deleteEmoji: (guildId, emojiId) => apiCall(`/guilds/${guildId}/${emojiId}`, null, 'DELETE'),

    getGuildCommandsAndApplications: guildId => apiCall(`/guilds/${guildId}/application-command-index`),
    searchSlashCommands: async (guildId, searchWord = '') => {
      const contextData = await apiCall(`/guilds/${guildId}/application-command-index`)
      const commands = contextData.application_commands.filter(cmd => cmd.name.includes(searchWord))
      if (contextData.application_commands?.length > 0 && commands.length === 0) {
        throw new Error(`Command '${searchWord}' not found.`)
      }
      return commands
    },
    sendSlashCommand: (guildId, channelOrThreadId, command, commandOptions = []) => {
      const formData = new FormData()
      formData.append(
        'payload_json',
        JSON.stringify({
          type: 2,
          application_id: command.application_id,
          guild_id: guildId,
          channel_id: channelOrThreadId,
          session_id: 'requiredButUnchecked',
          nonce: Math.floor(Math.random() * 1000000) + '',
          data: {
            ...command,
            options: commandOptions,
            application_command: {
              ...command,
            },
          },
        }),
      )
      return apiCall('/interactions', formData, 'POST')
    },

    changeNick: (guildId, nick) => apiCall(`/guilds/${guildId}/members/@me/nick`, { nick }, 'PATCH'),
    leaveServer: guildId => apiCall(`/users/@me/guilds/${guildId}`, null, 'DELETE'),

    getServers: () => apiCall(`/users/@me/guilds`),
    getGuilds: () => apiCall(`/users/@me/guilds`),
    listCurrentUserGuilds: () => apiCall('/users/@me/guilds'),

    getDMs: () => apiCall(`/users/@me/channels`),
    getUser: userId => apiCall(`/users/${userId}`),

    getDirectFriendInviteLinks: () => apiCall(`/users/@me/invites`),
    createDirectFriendInviteLink: () => apiCall(`/users/@me/invites`, null, 'POST'),
    deleteDirectFriendInviteLinks: () => apiCall(`/users/@me/invites`, null, 'DELETE'),

    getCurrentUser: () => apiCall('/users/@me'),
    editCurrentUser: (username, bio, body = {}) => apiCall('/users/@me', { username: username ?? undefined, bio: bio ?? undefined, ...body }, 'PATCH'),

    setCustomStatus: (emojiId, emojiName, expiresAt, text) =>
      apiCall(`/users/@me/settings`, { custom_status: { emoji_id: emojiId, emoji_name: emojiName, expires_at: expiresAt, text: text } }, 'PATCH'),
    deleteCustomStatus: () => apiCall(`/users/@me/settings`, { custom_status: { expires_at: new Date().toJSON() } }, 'PATCH'),

    listReactions: (channelOrThreadId, messageId, emojiUrl) => apiCall(`/channels/${channelOrThreadId}/messages/${messageId}/reactions/${emojiUrl}/@me`),
    addReaction: (channelOrThreadId, messageId, emojiUrl) => apiCall(`/channels/${channelOrThreadId}/messages/${messageId}/reactions/${emojiUrl}/@me`, null, 'PUT'),
    deleteReaction: (channelOrThreadId, messageId, emojiUrl) => apiCall(`/channels/${channelOrThreadId}/messages/${messageId}/reactions/${emojiUrl}/@me`, null, 'DELETE'),

    typing: channelOrThreadId => apiCall(`/channels/${channelOrThreadId}/typing`, null, 'POST'),

    delay,
    downloadFileByUrl: (url, filename) =>
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = filename
          link.click()
        })
        .catch(console.error),
    apiCall,
    id,
    update_guildId_and_channelId_withCurrentlyVisible,
    getConfig: () => Object.freeze({ authHeader, autoUpdateToken, guildId: gid, channelId: cid, gid, cid }),
    setConfigAuthHeader: token => (authHeader = token),
    setConfigAutoUpdateToken: bool => (autoUpdateToken = bool),
    setConfigGid: id => (gid = id),
    setConfigGuildId: id => (gid = id),
    setConfigCid: id => (cid = id),
    setConfigChannelId: id => (cid = id),
  }

  console.log('\n\n\n\nSelfbot loaded! Use it like this: `await api.someFunction()`')
  console.log('Abusing this could get you banned from Discord, use at your own risk!')
  console.log()
  console.log(
    'This script does **not** work with bot accounts! ' +
      'If you have a bot account, use Node.js (or a proper lib like discord.js!) with the modified script ' +
      'https://github.com/rigwild/discord-self-bot-console/discussions/4#discussioncomment-1438231',
  )
  console.log()
  console.log('Use the `id()` function to update the variable `gid` guild id and `cid` channel id to what you are currently watching.')
  console.log('https://github.com/rigwild/discord-self-bot-console')

  id(false)

  // Do not replace configuration when reusing script in same context
  // @ts-ignore
  if (!authHeader) {
    //
    // Set your authorization token HERE (or use the auto update, send a message in any chat!)
    //
    authHeader = ''
    autoUpdateToken = true
  }

  // @ts-ignore
  if (!XMLHttpRequest_setRequestHeader) {
    var XMLHttpRequest_setRequestHeader = XMLHttpRequest.prototype.setRequestHeader
  }
  // Auto update the authHeader when a request with the token is intercepted
  XMLHttpRequest.prototype.setRequestHeader = function () {
    if (autoUpdateToken && arguments[0] === 'Authorization' && authHeader !== arguments[1]) {
      authHeader = arguments[1]
      console.log(`Updated the Auth token! <${authHeader.slice(0, 30)}...>`)
    }
    XMLHttpRequest_setRequestHeader.apply(this, arguments)
  }

  if (!module) {
    // Allow pasting this script in the console
    // @ts-ignore
    var module = {}
  }
  module.exports = { api, id, delay, update_guildId_and_channelId_withCurrentlyVisible }
}

client.login(process.env.DISCORD_TOKEN);