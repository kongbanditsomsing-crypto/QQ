const cooldown = new Set();
import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import sendNGL from './send.js';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// --- Slash commands ---
const commands = [
  new SlashCommandBuilder()
    .setName('ngl')
    .setDescription('ส่งข้อความไป NGL')
    .addStringOption(o =>
      o.setName('user')
        .setDescription('เป้าหมาย')
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST().setToken(TOKEN);

async function register() {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log('Slash registered!');
}

await register();

// --- Bot ---
client.on('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {

  // slash
  if (interaction.isChatInputCommand() && interaction.commandName === 'ngl') {
    const user = interaction.options.getString('user');

    const embed = new EmbedBuilder()
      .setTitle('📩 ส่งข้อความ NGL')
      .setDescription(`เป้าหมาย: **${user}**`)
      .setFooter({ text: 'Made for NGL' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`random:${user}`)
          .setLabel('🎯 สุ่มข้อความ')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`custom:${user}`)
          .setLabel('✍️ กำหนดเอง')
          .setStyle(ButtonStyle.Primary)
      );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  // button
  if (interaction.isButton()) {
    const [mode, user] = interaction.customId.split(':');

    if (mode === 'random') {
      if (cooldown.has(user)) {
        return interaction.reply({
          content: 'รอ 60 วิแล้วค่อยยิงใหม่นะจ๊ะจุ๊บมั๊ววว',
          ephemeral: true
        });
      }

      cooldown.add(user);
      setTimeout(() => cooldown.delete(user), 60000);

      for (let i = 0; i < 500; i++) {
        await sendNGL(user, 'สุ่มข้อความ ❤️😃😁😆😘😘😚😙😗😍😉😌🥹🙂‍↕️🥹🥴🥹🫥🤔🥱🤔😐🤫😝🤫🤬🙄🤬😧🫤😣😵‍💫🤯💜💞💜🫂👅❣️🫦🧏🤦🧎🤦⛷️🚶🤺🤼🏇🏄🐟🐬🐠🐬🪲🕸️🪰🐛🦋🪰🐝🫛🥑🫐🥑🫚🥥🥯🥜🥒🥩🥩🥚🍲🍝🦞🍲🍘🥠🍩🥢🫗🥢🚥🛟🛵🛻🏎️🚓🚝🚂🚃');
      }

      return interaction.reply({ content: `ยิงให้ ${user} x500 เรียบร้อย 😈` });
    }

    if (mode === 'custom') {
      return interaction.reply({
        content: `พิมพ์เนื้อหาที่จะส่งให้ **${user}**`,
        ephemeral: true
      });
    }
  }
});

client.login(TOKEN);