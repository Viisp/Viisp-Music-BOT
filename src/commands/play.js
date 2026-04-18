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
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addAttachmentOption(opt =>
      opt
        .setName('fichier')
        .setDescription('Fichier MP3 à jouer directement')
        .setRequired(false),
    ),

  // Autocomplete handler — called as user types
  async autocomplete(interaction) {
    const query = interaction.options.getFocused();
    if (!query || query.length < 2) return interaction.respond([]);

    try {
      const tracks = await searchArtistTopTracks(query);
      if (!tracks) return interaction.respond([]);
      await interaction.respond(
        tracks.map(t => ({
          name: t.name.substring(0, 100),
          value: t.url,
        }))
      );
    } catch {
      await interaction.respond([]);
    }
  },

  async execute(interaction, client) {
    // Defer immediately — wrap in try/catch to survive latency issues
    try {
      await interaction.deferReply();
    } catch {
      // Interaction already acknowledged or expired — try to continue anyway
    }

    const reply = async (content) => {
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(typeof content === 'string' ? { content } : content);
        }
      } catch {}
    };

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return reply('❌ Tu dois être dans un salon vocal.');

    const query = interaction.options.getString('query');
    const attachment = interaction.options.getAttachment('fichier');

    if (!query && !attachment) return reply('❌ Fournis une recherche ou un fichier MP3.');

    // Fichier MP3 uploadé
    if (attachment) {
      const isAudio = attachment.name.toLowerCase().endsWith('.mp3') || attachment.contentType?.startsWith('audio/');
      if (!isAudio) return reply('❌ Seuls les fichiers audio (.mp3) sont supportés.');
      await client.distube.play(voiceChannel, attachment.url, { member: interaction.member, textChannel: interaction.channel });
      return reply(`🎵 Lecture de **${attachment.name}**...`);
    }

    const isUrl = query.startsWith('http://') || query.startsWith('https://');

    // URL directe (Spotify ou YouTube) ou valeur autocomplete (déjà une URL YouTube)
    if (isUrl) {
      await client.distube.play(voiceChannel, query, { member: interaction.member, textChannel: interaction.channel });
      return reply('🎵 Lecture en cours...');
    }

    // Recherche texte → top 5 résultats
    try {
      const tracks = await searchArtistTopTracks(query);
      if (tracks && tracks.length) return reply(searchSelectMenu(tracks, query));
    } catch (err) {
      console.error('Search error:', err.message);
    }

    // Fallback lecture directe
    await client.distube.play(voiceChannel, query, { member: interaction.member, textChannel: interaction.channel });
    return reply('🎵 Lecture en cours...');
  },
};
