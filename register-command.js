// register-command.js
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
    new SlashCommandBuilder()
        .setName('spamngl')
        .setDescription('ยิง NGL')
].map(cmd => cmd.toJSON());

const rest = new REST().setToken(process.env.TOKEN);

await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
);

console.log('Commands registered!');