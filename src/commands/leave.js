const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Fait quitter le bot du salon vocal'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (queue) await queue.stop();

    const connection = getVoiceConnection(interaction.guildId);
    connection?.destroy();

    return interaction.reply({ content: '👋 À bientôt !', flags: 64 });
  },
};
