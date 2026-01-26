require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('เข้าห้องและเริ่มยิงข้อความ'),
        
    new SlashCommandBuilder()
        .setName('spam')
        .setDescription('ยิงข้อความแบบ spam')
        .addStringOption(option =>
            option.setName('text')
                  .setDescription('ข้อความที่จะ spam')
                  .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('ยิง emoji แบบ random'),
    
    new SlashCommandBuilder()
        .setName('promo')
        .setDescription('ยิง promo'),

    new SlashCommandBuilder()
        .setName('promo_boom')
        .setDescription('ยิง promo แบบหนักๆ'),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('เตะสมาชิก'),

    new SlashCommandBuilder()
        .setName('tell_off')
        .setDescription('ด่าแบบ random'),

    new SlashCommandBuilder()
        .setName('senddm')
        .setDescription('ส่งข้อความเข้า DM')
        .addStringOption(option =>
            option.setName('text')
                  .setDescription('ข้อความส่งเข้า DM')
                  .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('allowdm')
        .setDescription('ให้บอทรับ DM'),

    new SlashCommandBuilder()
        .setName('shootdm')
        .setDescription('ยิง DM random')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('⏳ Deploying slash commands...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('✅ Slash commands deployed success!');
    } catch (error) {
        console.error('❌ Error:', error);
    }
})();