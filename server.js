const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const { createDiscordClient } = require('./src/discordClient');
const { getGuildStructure } = require('./src/channelManager');
const { connectToVoice, leaveVoice, playSound, SOUNDBOARD_LIST } = require('./src/voiceManager');

app.use(express.static(path.join(__dirname, 'public')));

let botClient = null;

io.on('connection', (socket) => {
    // ส่งรายการ Soundboard ให้หน้าเว็บ
    socket.emit('soundboard_list', SOUNDBOARD_LIST);

    socket.on('login', (token) => {
        if (botClient) botClient.destroy();
        botClient = createDiscordClient();

        botClient.once('ready', () => {
            socket.emit('login_success', {
                username: botClient.user.username,
                tag: botClient.user.discriminator || '0',
                avatar: botClient.user.displayAvatarURL({ dynamic: true })
            });

            const guilds = botClient.guilds.cache.map(g => ({
                id: g.id,
                name: g.name,
                icon: g.iconURL({ dynamic: true })
            }));
            socket.emit('guilds', guilds);
        });

        botClient.on('messageCreate', (msg) => {
            socket.emit('new_message', {
                author: msg.author.username,
                content: msg.content,
                channelId: msg.channelId,
                avatar: msg.author.displayAvatarURL({ dynamic: true }),
                timestamp: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        });

        botClient.login(token).catch(err => {
            socket.emit('login_error', "Bot Token ไม่ถูกต้อง หรือไม่ได้เปิด Intents");
        });
    });

    socket.on('get_guild_data', async (guildId) => {
        if (!botClient) return;
        const guild = botClient.guilds.cache.get(guildId);
        if (!guild) return;

        const data = await getGuildStructure(guild);
        if (data) socket.emit('guild_data', data);
    });

    socket.on('get_messages', async (channelId) => {
        if (!botClient) return;
        try {
            const channel = botClient.channels.cache.get(channelId);
            if (!channel || channel.type !== 0) return;
            const msgs = await channel.messages.fetch({ limit: 50 });
            const formatted = msgs.map(m => ({
                author: m.author.username,
                content: m.content,
                channelId: m.channelId,
                avatar: m.author.displayAvatarURL({ dynamic: true }),
                timestamp: m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })).reverse();
            socket.emit('messages', formatted);
        } catch (e) {}
    });

    socket.on('send_message', async (data) => {
        if (!botClient) return;
        try {
            const channel = botClient.channels.cache.get(data.channelId);
            if (channel) await channel.send(data.content);
        } catch (e) {}
    });

    // เข้าห้องเสียง VC
    socket.on('join_vc', (channelId) => {
        if (!botClient) return;
        const channel = botClient.channels.cache.get(channelId);
        if (channel && channel.type === 2) {
            connectToVoice(channel, channel.guild.voiceAdapterCreator);
            socket.emit('vc_status', { connected: true, channelName: channel.name });
        }
    });

    // ออกจาก VC
    socket.on('leave_vc', () => {
        leaveVoice();
        socket.emit('vc_status', { connected: false });
    });

    // กดปุ่ม Soundboard
    socket.on('play_soundboard', (soundId) => {
        const res = playSound(soundId);
        socket.emit('soundboard_res', res);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`[+] Full Discord Web UI Running on Port ${PORT}`);
});
