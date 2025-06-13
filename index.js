const { Client, GatewayIntentBits, Partials, REST, Routes, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

const vouchData = {
  vouchChannel: null,
  vouchBackups: {}
};

function saveVouchData() {
  fs.writeFileSync('vouchData.json', JSON.stringify(vouchData, null, 2));
}

if (fs.existsSync('vouchData.json')) {
  const savedData = fs.readFileSync('vouchData.json');
  Object.assign(vouchData, JSON.parse(savedData));
}

const commands = [
  {
    name: 'vouchchannelset',
    description: 'Sets Vouch Channel',
    options: [
      {
        name: 'channel',
        type: 7,
        description: 'The vouch channel',
        required: true
      }
    ]
  },
  {
    name: 'vouchchannel',
    description: 'Views Current Vouch Channel'
  },
  {
    name: 'vouchchannelremove',
    description: 'Removes vouch channel'
  },
  {
    name: 'vouchbackup',
    description: 'Backs up your vouches'
  },
  {
    name: 'vouchrestore',
    description: 'Restores vouch messages',
    options: [
      {
        name: 'channel',
        type: 7,
        description: 'The channel to restore vouches to',
        required: true
      }
    ]
  },
  {
    name: 'vouchclear',
    description: 'Clears Vouch Backups'
  },
  {
    name: 'vouchcount',
    description: 'Shows the total number of vouches'
  }
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error reloading application (/) commands:', error);
  }
}

function isAdmin(interaction) {
  return interaction.user.id === config.adminId;
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (!isAdmin(interaction)) {
    return interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
  }

  const { commandName, options } = interaction;

  if (commandName === 'vouchchannelset') {
    const channel = options.getChannel('channel');
    vouchData.vouchChannel = channel.id;
    saveVouchData();
    await interaction.reply({ content: "Vouch channel set to ${channel.name}", ephemeral: true });
  }

  else if (commandName === 'vouchchannel') {
    if (vouchData.vouchChannel) {
      const channel = client.channels.cache.get(vouchData.vouchChannel);
      await interaction.reply({ content: "Current vouch channel is: ${channel.name}", ephemeral: true });
    } else {
      await interaction.reply({ content: "No vouch channel set.", ephemeral: true });
    }
  }

  else if (commandName === 'vouchchannelremove') {
    vouchData.vouchChannel = null;
    saveVouchData();
    await interaction.reply({ content: "Vouch channel removed.", ephemeral: true });
  }

  else if (commandName === 'vouchbackup') {
    if (!vouchData.vouchChannel) {
      return interaction.reply({ content: "No vouch channel set.", ephemeral: true });
    }
  
    const channel = client.channels.cache.get(vouchData.vouchChannel);
    
    let allMessages = [];
    let lastMessageId;
  
    try {
      while (true) {
        const fetchedMessages = await channel.messages.fetch({
          limit: 100,
          before: lastMessageId
        });
  
        if (fetchedMessages.size === 0) break;
  
        allMessages.push(...fetchedMessages.values());
        lastMessageId = fetchedMessages.last().id;
      }
  
      console.log(`Fetched ${allMessages.length} messages from ${channel.name}.`);
  
      vouchData.vouchBackups[vouchData.vouchChannel] = allMessages
        .filter(msg => msg.content.startsWith('+rep') || msg.content.startsWith('+vouch'))
        .map(msg => {
          return {
            author: msg.author.tag,
            content: msg.content,
            avatar: msg.author.displayAvatarURL(),
            createdAt: Math.floor(msg.createdTimestamp / 1000)
          };
        });
  
      saveVouchData();
      await interaction.reply({ content: "Vouches backed up successfully.", ephemeral: true });
    } catch (error) {
      console.error('Error fetching messages:', error);
      await interaction.reply({ content: "An error occurred while backing up vouches.", ephemeral: true });
    }
  }

  else if (commandName === 'vouchrestore') {
    const targetChannel = options.getChannel('channel');

    if (!vouchData.vouchChannel) {
      return interaction.reply({ content: "No vouch channel set.", ephemeral: true });
    }

    const vouches = vouchData.vouchBackups[vouchData.vouchChannel];

    if (!vouches || vouches.length === 0) {
      return interaction.reply({ content: "No vouch backup found.", ephemeral: true });
    }

    let webhook;
    try {
      const webhooks = await targetChannel.fetchWebhooks();
      webhook = webhooks.first();

      if (!webhook) {
        webhook = await targetChannel.createWebhook({
          name: 'Vouch Webhook',
          avatar: client.user.displayAvatarURL(),
        });
        console.log(`Webhook created: ${webhook.name}`);
      }
    } catch (error) {
      console.error('Error fetching or creating webhook:', error);
      return interaction.reply({ content: "An error occurred while creating the webhook.", ephemeral: true });
    }

    const sortedVouches = vouches.slice().reverse();

    for (const vouch of sortedVouches) {
      try {
        await webhook.send({
          content: vouch.content,
          username: vouch.author,
          avatarURL: vouch.avatar,
        });
      } catch (error) {
        console.error(`Failed to send vouch for ${vouch.author}:`, error);
      }
    }

    await interaction.reply({ content: "Vouches restored successfully to ${targetChannel}.", ephemeral: true });
  }

  else if (commandName === 'vouchclear') {
    if (!vouchData.vouchChannel) {
      return interaction.reply({ content: "No vouch channel set.", ephemeral: true });
    }

    vouchData.vouchBackups[vouchData.vouchChannel] = [];
    saveVouchData();
    await interaction.reply({ content: "Vouch backups cleared.", ephemeral: true });
  }

  else if (commandName === 'vouchcount') {
    if (!vouchData.vouchChannel) {
      return interaction.reply({ content: "No vouch channel set.", ephemeral: true });
    }

    const vouches = vouchData.vouchBackups[vouchData.vouchChannel];

    if (!vouches || vouches.length === 0) {
      return interaction.reply({ content: "No vouches found.", ephemeral: true });
    }

    const vouchCount = vouches.length;
    
    const embed = new EmbedBuilder()
      .setTitle('Vouch Count')
      .setDescription(`Total number of vouches backed up: **${vouchCount}**`)
      .setColor(0x00AE86);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  registerCommands();
});

client.login(config.token);