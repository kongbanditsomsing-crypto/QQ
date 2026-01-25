import { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Events 
} from 'discord.js';
import axios from "axios";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// === Bot Online Log ===
client.once(Events.ClientReady, () => {
    console.log(`BOT ONLINE: ${client.user.tag}`);
});

// === Slash Command /spam ===
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'spam') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('custom')
                .setLabel('กำหนดเอง')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('random')
                .setLabel('สุ่ม')
                .setStyle(ButtonStyle.Secondary),
        );

        await interaction.reply({
            content: 'เลือกโหมดยิง:',
            components: [row],
            ephemeral: true
        });
    }
});

// === ปุ่มกด ===
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'custom') {
        await interaction.reply({
            content: 'พิมพ์ข้อความที่จะยิงด้านล่าง '
        });
    }

    if (interaction.customId === 'random') {
        await interaction.reply({
            content: 'กำลังสุ่มยิง...'
        });
    }
});

// === ฟังก์ชันยิง NGL ===
async function sendNGL(username, msg) {
    await axios.post(`https://ngl.link/${username}`, {
        question: msg,
        deviceId: "ffffffff-ffff-ffff-ffff-ffffffffffff"
    });
}

// === Login Bot ===
const TOKEN = process.env.TOKEN;
client.login(TOKEN);