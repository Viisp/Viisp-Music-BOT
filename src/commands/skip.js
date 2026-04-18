const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Passe à la track suivante'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours.', flags: 64 });
    await queue.skip();
    return interaction.reply({ content: '⏭ Track suivante !', flags: 64 });
  },
};
