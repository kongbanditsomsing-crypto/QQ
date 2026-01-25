import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from 'discord.js';

const TOKEN = process.env.TOKEN;
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once(Events.ClientReady, () => {
  console.log(`BOT ON: ${client.user.tag}`);
});

// คำสั่ง /spam
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'spam') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('custom').setLabel('กำหนดเอง').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('random').setLabel('สุ่ม').setStyle(ButtonStyle.Secondary),
      );

    await interaction.reply({ content: 'เลือกโหมดยิง:', components: [row] });
  }
});

// ปุ่ม
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'custom') {
    await interaction.reply('พิมพ์ข้อความที่ต้องการยิง');
    
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 10 });

    collector.on('collect', async (msg) => {
      for (let i = 0; i < 99; i++) {
        await msg.channel.send(msg.content);
      }
    });
  }

  if (interaction.customId === 'random') {
    const list = ['วะวะวะเว็กช็อปมาเว้ว', 'เอ็นจอยย', 'ควEEE'];
    const pick = list[Math.floor(Math.random() * list.length)];

    for (let i = 0; i < 99; i++) {
      await interaction.reply(pick);
    }
  }
});

client.login(TOKEN);