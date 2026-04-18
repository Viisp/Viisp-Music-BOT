const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

function nowPlayingEmbed(song, queue) {
  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle('🎵 Now Playing')
    .setDescription(`**[${song.name}](${song.url})**`)
    .addFields(
      { name: '⏱ Durée', value: song.formattedDuration, inline: true },
      { name: '🔊 Volume', value: `${queue.volume}%`, inline: true },
      { name: '📋 File', value: `${queue.songs.length - 1} track(s) suivante(s)`, inline: true },
    )
    .setFooter({ text: `Demandé par ${song.member?.displayName ?? 'inconnu'}` });

  if (song.thumbnail) embed.setThumbnail(song.thumbnail);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_pause').setEmoji('⏸').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_vol_down').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_vol_up').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹').setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

function queueEmbed(queue) {
  const songs = queue.songs.slice(1, 11);
  const description = songs.length
    ? songs.map((s, i) => `**${i + 1}.** [${s.name}](${s.url}) — ${s.formattedDuration}`).join('\n')
    : '*La file est vide*';

  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle("📋 File d'attente")
    .setDescription(description)
    .addFields({ name: '▶️ En cours', value: `[${queue.songs[0].name}](${queue.songs[0].url})` })
    .setFooter({ text: `${queue.songs.length} track(s) au total` });

  return { embeds: [embed], ephemeral: true };
}

function searchSelectMenu(tracks, query) {
  const options = tracks.map(t => ({
    label: t.name.substring(0, 100),
    description: `${t.artists} — ${t.duration}`.substring(0, 100),
    value: t.url,
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('music_search_select')
      .setPlaceholder('Choisir une track...')
      .addOptions(options),
  );

  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle(`🔍 Résultats pour "${query}"`)
    .setDescription('Sélectionne une track ci-dessous :');

  return { embeds: [embed], components: [row] };
}

module.exports = { nowPlayingEmbed, queueEmbed, searchSelectMenu };
