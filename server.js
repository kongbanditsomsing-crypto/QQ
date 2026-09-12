const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { Client } = require('discord.js-selfbot-v13');
const path = require('path');

// ให้เซิร์ฟเวอร์อ่านไฟล์ UI จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, 'public')));

let botClient = null;

io.on('connection', (socket) => {
    socket.on('login', (token) => {
        if(botClient) { botClient.destroy(); }
        botClient = new Client({ checkUpdate: false });
        
        botClient.on('ready', () => {
            socket.emit('login_success', {
                username: botClient.user.username,
                tag: botClient.user.discriminator,
                avatar: botClient.user.displayAvatarURL({ dynamic: true })
            });
            const guilds = botClient.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.iconURL({ dynamic: true }) }));
            socket.emit('guilds', guilds);
        });

        botClient.on('messageCreate', (msg) => {
            socket.emit('new_message', {
                author: msg.author.username,
                content: msg.content,
                channelId: msg.channelId,
                avatar: msg.author.displayAvatarURL({ dynamic: true }),
                timestamp: msg.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            });
        });

        botClient.login(token).catch(err => {
            socket.emit('login_error', "Token ไม่ถูกต้อง หรือบอทเข้าไม่ได้");
        });
    });

    socket.on('get_channels', async (guildId) => {
        if (!botClient) return;
        const guild = botClient.guilds.cache.get(guildId);
        if(!guild) return;
        const channels = guild.channels.cache.filter(c => c.type === 'GUILD_TEXT').map(c => ({id: c.id, name: c.name}));
        socket.emit('channels', { guildName: guild.name, channels: channels });
    });

    socket.on('get_messages', async (channelId) => {
        if (!botClient) return;
        try {
            const channel = botClient.channels.cache.get(channelId);
            if(!channel) return;
            const msgs = await channel.messages.fetch({ limit: 50 });
            const formatted = msgs.map(m => ({
                author: m.author.username,
                content: m.content,
                channelId: m.channelId,
                avatar: m.author.displayAvatarURL({ dynamic: true }),
                timestamp: m.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            })).reverse();
            socket.emit('messages', formatted);
        } catch(e) {}
    });

    socket.on('send_message', async (data) => {
        if (!botClient) return;
        try {
            const channel = botClient.channels.cache.get(data.channelId);
            if(channel) await channel.send(data.content);
        } catch(e) {}
    });
});

// ใช้ Port ของ Render ถ้าไม่มีให้ใช้ 3000
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`[+] Server Web UI Is Running on Port ${PORT}`);
});
