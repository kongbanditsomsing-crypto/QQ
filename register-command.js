import dotenv from 'dotenv';
dotenv.config();

import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
    new SlashCommandBuilder()
        .setName('spamngl')
        .setDescription('ยิง NGL')
].map(cmd => cmd.toJSON());

const rest = new REST().setToken(TOKEN);

async function register() {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log('Commands registered!');
    } catch (err) {
        console.error(err);
    }
}

register();
process.exit(0);