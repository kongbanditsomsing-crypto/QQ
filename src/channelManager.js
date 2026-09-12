const { ChannelType } = require('discord.js');

async function getGuildStructure(guild) {
    try {
        await guild.channels.fetch();
        await guild.members.fetch().catch(() => {});

        const categoriesMap = new Map();

        // 1. ดึง Categories ทั้งหมด
        const categories = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .sort((a, b) => a.position - b.position);

        categories.forEach(cat => {
            categoriesMap.set(cat.id, {
                id: cat.id,
                name: cat.name.toUpperCase(),
                channels: []
            });
        });

        // หมวดหมู่สำหรับห้องที่ไม่มีหมวดหมู่
        categoriesMap.set('uncategorized', {
            id: 'uncategorized',
            name: 'TEXT CHANNELS',
            channels: []
        });

        // 2. จัดสรรห้อง Text และ Voice ลงตามหมวดหมู่
        const channels = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice)
            .sort((a, b) => a.position - b.position);

        channels.forEach(ch => {
            const channelData = {
                id: ch.id,
                name: ch.name,
                type: ch.type === ChannelType.GuildVoice ? 'voice' : 'text',
                members: ch.type === ChannelType.GuildVoice ? ch.members.map(m => ({
                    id: m.id,
                    username: m.user.username,
                    avatar: m.user.displayAvatarURL({ dynamic: true }),
                    selfMute: m.voice.selfMute,
                    selfDeaf: m.voice.selfDeaf
                })) : []
            };

            const parentId = ch.parentId && categoriesMap.has(ch.parentId) ? ch.parentId : 'uncategorized';
            categoriesMap.get(parentId).channels.push(channelData);
        });

        // แปลงเป็น Array ลบหมวดหมู่เปล่า
        const result = Array.from(categoriesMap.values()).filter(cat => cat.channels.length > 0);

        const membersList = guild.members.cache.map(m => ({
            username: m.user.username,
            avatar: m.user.displayAvatarURL({ dynamic: true }),
            status: m.presence?.status || 'offline'
        }));

        return {
            guildName: guild.name,
            categories: result,
            members: membersList
        };
    } catch (err) {
        console.error("Error getting guild structure:", err);
        return null;
    }
}

module.exports = { getGuildStructure };
