const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let botClient = null;

io.on('connection', (socket) => {
    socket.on('login', (token) => {
        if(botClient) { botClient.destroy(); }
        
        botClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ]
        });
        
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
                timestamp: msg.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            });
        });

        botClient.login(token).catch(err => {
            socket.emit('login_error', "Bot Token ไม่ถูกต้อง หรือยังไม่ได้เปิด Intents ใน Developer Portal");
        });
    });

    socket.on('get_channels', async (guildId) => {
        if (!botClient) return;
        const guild = botClient.guilds.cache.get(guildId);
        if(!guild) return;
        
        // 0 คือ GuildText ใน discord.js v14
        const channels = guild.channels.cache
            .filter(c => c.type === 0)
            .map(c => ({ id: c.id, name: c.name }));

        try {
            await guild.members.fetch();
        } catch(e) {}

        const members = guild.members.cache.map(m => ({
            username: m.user.username,
            avatar: m.user.displayAvatarURL({ dynamic: true }),
            status: 'online'
        }));

        socket.emit('channels', { 
            guildName: guild.name, 
            channels: channels, 
            members: members 
        });
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

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`[+] Server Web UI Is Running on Port ${PORT}`);
});
