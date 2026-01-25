import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('ngl')
    .setDescription('ส่งข้อความไป NGL')
    .addStringOption(option =>
      option.setName('user')
        .setDescription('ชื่อผู้ใช้ NGL')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('text')
        .setDescription('ข้อความที่จะส่ง')
        .setRequired(true))
].map(cmd => cmd.toJSON());

export async function register() {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log('✔ Slash Command registered');
}