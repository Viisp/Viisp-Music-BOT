const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Arrête la musique et vide la file'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours.', flags: 64 });
    await queue.stop();
    return interaction.reply({ content: '⏹ Musique arrêtée.', flags: 64 });
  },
};
