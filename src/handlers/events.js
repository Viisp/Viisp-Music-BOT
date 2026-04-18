const { nowPlayingEmbed } = require('../utils/embeds');
const { MessageFlags } = require('discord.js');

function loadEvents(client) {
  const { distube } = client;

  // Prevent unhandled errors from crashing the process
  client.on('error', err => console.error('Client error:', err));

  client.on('ready', () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
  });

  client.on('interactionCreate', async interaction => {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(err);
        const msg = { content: "❌ Erreur lors de l'exécution de la commande.", flags: MessageFlags.Ephemeral };
        try {
          (interaction.replied || interaction.deferred)
            ? await interaction.followUp(msg)
            : await interaction.reply(msg);
        } catch (e) {
          console.error('Could not send error reply:', e.message);
        }
      }
      return;
    }

    // Boutons de contrôle
    if (interaction.isButton()) {
      const queue = distube.getQueue(interaction.guildId);
      if (!queue) {
        return interaction.reply({ content: '❌ Aucune musique en cours.', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();

      try {
        switch (interaction.customId) {
          case 'music_pause':
            queue.paused ? await queue.resume() : await queue.pause();
            break;
          case 'music_skip':
            await queue.skip();
            break;
          case 'music_vol_down':
            queue.setVolume(Math.max(0, queue.volume - 10));
            break;
          case 'music_vol_up':
            queue.setVolume(Math.min(100, queue.volume + 10));
            break;
          case 'music_stop':
            await queue.stop();
            break;
        }
      } catch (err) {
        console.error('Button handler error:', err);
      }
      return;
    }

    // Select menu résultats de recherche
    if (interaction.isStringSelectMenu() && interaction.customId === 'music_search_select') {
      const url = interaction.values[0];
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        try { await interaction.reply({ content: '❌ Rejoins un salon vocal.', flags: MessageFlags.Ephemeral }); } catch {}
        return;
      }

      // Acknowledge interaction — ignore errors (latency can cause 404)
      try { await interaction.deferUpdate(); } catch {}

      // Always attempt to play regardless of interaction ack result
      try {
        await distube.play(voiceChannel, url, {
          member: interaction.member,
          textChannel: interaction.channel,
        });
        try { await interaction.editReply({ components: [] }); } catch {}
      } catch (err) {
        console.error('Play error:', err.message);
        try { await interaction.followUp({ content: `❌ Erreur : ${err.message}`, flags: MessageFlags.Ephemeral }); } catch {}
      }
    }
  });

  // Events DisTube
  // v5: playSong signature is (queue, song)
  distube.on('playSong', (queue, song) => {
    queue.textChannel?.send(nowPlayingEmbed(song, queue));
  });

  // v5: addSong signature is (queue, song)
  distube.on('addSong', (queue, song) => {
    queue.textChannel?.send({ content: `➕ **${song.name}** ajouté à la file.` });
  });

  // v5: finish signature is (queue)
  distube.on('finish', queue => {
    queue.textChannel?.send({ content: '✅ File terminée.' });
  });

  // v5: error signature is (error, queue, song?) — NOT (channel, error)
  distube.on('error', (error, queue) => {
    console.error('DisTube error:', error);
    queue?.textChannel?.send({ content: `❌ Erreur : ${error.message}` });
  });

  // v5: disconnect signature is (queue)
  distube.on('disconnect', queue => {
    queue.textChannel?.send({ content: '👋 Déconnecté du salon vocal.' });
  });
}

module.exports = { loadEvents };
