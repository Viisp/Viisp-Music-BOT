const { SlashCommandBuilder } = require('discord.js');
const { searchArtistTopTracks } = require('../utils/spotify');
const { searchSelectMenu } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Joue une musique — artiste, titre, URL Spotify/YouTube, ou fichier MP3')
    .addStringOption(opt =>
      opt
        .setName('query')
        .setDescription("Nom d'artiste, titre, URL Spotify ou YouTube")
        .setRequired(false),
    )
    .addAttachmentOption(opt =>
      opt
        .setName('fichier')
        .setDescription('Fichier MP3 à jouer directement')
        .setRequired(false),
    ),

  async execute(interaction, client) {
    // Acknowledge immediately to avoid 3s Discord timeout
    await interaction.deferReply();

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({ content: '❌ Tu dois être dans un salon vocal.' });
    }

    const query = interaction.options.getString('query');
    const attachment = interaction.options.getAttachment('fichier');

    if (!query && !attachment) {
      return interaction.editReply({ content: '❌ Fournis une recherche ou un fichier MP3.' });
    }

    // Fichier MP3 uploadé
    if (attachment) {
      const isAudio =
        attachment.name.toLowerCase().endsWith('.mp3') ||
        attachment.contentType?.startsWith('audio/');
      if (!isAudio) {
        return interaction.editReply({ content: '❌ Seuls les fichiers audio (.mp3) sont supportés.' });
      }
      await client.distube.play(voiceChannel, attachment.url, {
        member: interaction.member,
        textChannel: interaction.channel,
      });
      return interaction.editReply({ content: `🎵 Lecture de **${attachment.name}**...` });
    }

    const isUrl = query.startsWith('http://') || query.startsWith('https://');

    // URL directe (Spotify ou YouTube)
    if (isUrl) {
      await client.distube.play(voiceChannel, query, {
        member: interaction.member,
        textChannel: interaction.channel,
      });
      return interaction.editReply({ content: '🎵 Lecture en cours...' });
    }

    // Recherche texte → top 5 résultats YouTube
    try {
      const tracks = await searchArtistTopTracks(query);
      if (tracks && tracks.length) {
        return interaction.editReply(searchSelectMenu(tracks, query));
      }
    } catch (err) {
      console.error('Search error:', err.message);
    }

    // Fallback : lecture directe
    await client.distube.play(voiceChannel, query, {
      member: interaction.member,
      textChannel: interaction.channel,
    });
    return interaction.editReply({ content: '🎵 Lecture en cours...' });
  },
};
