const { ChannelType } = require('discord.js');

async function getGuildStructure(guild) {
    try {
        await guild.channels.fetch();
        await guild.members.fetch().catch(() => {});

        const categoriesMap = new Map();

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

        categoriesMap.set('uncategorized', {
            id: 'uncategorized',
            name: 'TEXT CHANNELS',
            channels: []
        });

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

        const resultCategories = Array.from(categoriesMap.values()).filter(cat => cat.channels.length > 0);

        const membersList = guild.members.cache.map(m => ({
            username: m.user.username,
            avatar: m.user.displayAvatarURL({ dynamic: true })
        }));

        return {
            guildName: guild.name,
            categories: resultCategories,
            members: membersList
        };
    } catch (err) {
        console.error("Error structuring channels:", err);
        return null;
    }
}

module.exports = { getGuildStructure };
