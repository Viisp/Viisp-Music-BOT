const { SlashCommandBuilder } = require('discord.js');
const { queueEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription("Affiche la file d'attente"),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '❌ La file est vide.', flags: 64 });
    }
    return interaction.reply(queueEmbed(queue));
  },
};
