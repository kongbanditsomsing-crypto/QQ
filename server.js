const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

app.use(express.static(path.join(__dirname, 'public')));

let botClient = null;

io.on('connection', (socket) => {
    socket.on('login', (token) => {
        if (botClient) {
            try { botClient.destroy(); } catch(e){}
        }

        botClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates
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
                timestamp: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        });

        botClient.login(token).catch(() => {
            socket.emit('login_error', "Token ไม่ถูกต้อง หรือสิทธิ์ Intent ไม่เปิดใช้งาน");
        });
    });

    socket.on('get_guild_data', async (guildId) => {
        if (!botClient) return;
        const guild = botClient.guilds.cache.get(guildId);
        if (!guild) return;

        await guild.channels.fetch();
        await guild.members.fetch().catch(() => {});

        const categories = [];
        const catMap = new Map();

        guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).forEach(cat => {
            catMap.set(cat.id, { name: cat.name.toUpperCase(), channels: [] });
            categories.push(catMap.get(cat.id));
        });

        const uncategorized = { name: 'TEXT CHANNELS', channels: [] };
        
        guild.channels.cache.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice).forEach(ch => {
            const data = {
                id: ch.id,
                name: ch.name,
                type: ch.type === ChannelType.GuildVoice ? 'voice' : 'text'
            };
            if (ch.parentId && catMap.has(ch.parentId)) {
                catMap.get(ch.parentId).channels.push(data);
            } else {
                uncategorized.channels.push(data);
            }
        });

        if (uncategorized.channels.length > 0) categories.unshift(uncategorized);

        const members = guild.members.cache.map(m => ({
            username: m.user.username,
            avatar: m.user.displayAvatarURL({ dynamic: true })
        }));

        socket.emit('guild_data', { guildName: guild.name, categories, members });
    });

    socket.on('get_messages', async (channelId) => {
        if (!botClient) return;
        try {
            const channel = botClient.channels.cache.get(channelId);
            if (!channel) return;
            const msgs = await channel.messages.fetch({ limit: 50 });
            const formatted = msgs.map(m => ({
                author: m.author.username,
                content: m.content,
                channelId: m.channelId,
                avatar: m.author.displayAvatarURL({ dynamic: true }),
                timestamp: m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })).reverse();
            socket.emit('messages', formatted);
        } catch(e) {}
    });

    socket.on('send_message', async (data) => {
        if (!botClient) return;
        try {
            const channel = botClient.channels.cache.get(data.channelId);
            if (channel) await channel.send(data.content);
        } catch(e) {}
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
