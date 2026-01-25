// register-command.js
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config'; // ให้โหลด TOKEN / CLIENT_ID จาก .env

// --- Register commands ตรงนี้ ---
const commands = [
    new SlashCommandBuilder()
        .setName('spam')
        .setDescription('ยิง NGL')
].map(cmd => cmd.toJSON());

// --- REST API ของ Discord ---
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function main() {
    try {
        console.log('กำลังส่ง Slash Commands ไปที่ Discord...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('ส่ง Commands เสร็จแล้ว!');
    } catch (err) {
        console.error(err);
    }
}

main();