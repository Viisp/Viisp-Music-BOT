# Viisp Music Bot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Discord music bot "Viisp Music" with slash commands, Spotify/YouTube/MP3 support, and an interactive embed with control buttons, hosted on Railway.

**Architecture:** Node.js bot using discord.js v14 + DisTube v4. Spotify URLs and artist text searches use the Spotify Web API (Client Credentials), bridging to YouTube for audio via yt-dlp. MP3 files are accepted as Discord attachment options on /play. Hosted on Railway via GitHub with nixpacks for system deps.

**Tech Stack:** Node.js 18+, discord.js v14, distube v4, @distube/spotify, @distube/yt-dlp, spotify-web-api-node, dotenv, ffmpeg-static, opusscript

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/index.js` | Entry point — loads env, starts bot |
| `src/bot.js` | Creates discord.js Client + DisTube instance with plugins |
| `src/deploy-commands.js` | One-time script to register slash commands via Discord REST |
| `src/handlers/commands.js` | Loads command files, dispatches slash command interactions |
| `src/handlers/events.js` | DisTube events (playSong, addSong, finish, error) + button/select menu interactions |
| `src/commands/play.js` | /play: text→Spotify artist search, Spotify/YouTube URL, MP3 attachment |
| `src/commands/skip.js` | /skip |
| `src/commands/stop.js` | /stop |
| `src/commands/leave.js` | /leave |
| `src/commands/queue.js` | /queue |
| `src/utils/embeds.js` | nowPlayingEmbed(), queueEmbed(), searchSelectMenu() builders |
| `src/utils/spotify.js` | Spotify Client Credentials auth + searchArtistTopTracks() |
| `.env.example` | Template for required env vars |
| `nixpacks.toml` | Railway config to install yt-dlp + ffmpeg system packages |
| `Procfile` | Railway process definition |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `nixpacks.toml`
- Create: `Procfile`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "viisp-music",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "deploy": "node src/deploy-commands.js"
  },
  "dependencies": {
    "@discordjs/rest": "^2.3.0",
    "@discordjs/voice": "^0.17.0",
    "@distube/spotify": "^2.0.0",
    "@distube/yt-dlp": "^2.0.0",
    "discord.js": "^14.14.1",
    "distube": "^4.2.0",
    "dotenv": "^16.4.5",
    "ffmpeg-static": "^5.2.0",
    "opusscript": "^0.1.1",
    "spotify-web-api-node": "^5.0.2"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
.env
*.log
```

- [ ] **Step 3: Create .env.example**

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_id_here
GUILD_ID=your_test_guild_id_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

- [ ] **Step 4: Create nixpacks.toml**

```toml
[phases.setup]
nixPkgs = ["yt-dlp", "ffmpeg"]
```

- [ ] **Step 5: Create Procfile**

```
web: node src/index.js
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore .env.example nixpacks.toml Procfile
git commit -m "feat: project scaffold"
```

---

### Task 2: Bot Core

**Files:**
- Create: `src/bot.js`
- Create: `src/index.js`

- [ ] **Step 1: Create src/bot.js**

```js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YtDlpPlugin } = require('@distube/yt-dlp');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

const distube = new DisTube(client, {
  plugins: [
    new SpotifyPlugin({
      api: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      },
    }),
    new YtDlpPlugin({ update: false }),
  ],
});

client.distube = distube;

module.exports = { client, distube };
```

- [ ] **Step 2: Create src/index.js**

```js
require('dotenv').config();
const { client } = require('./bot');
const { loadCommands } = require('./handlers/commands');
const { loadEvents } = require('./handlers/events');

loadCommands(client);
loadEvents(client);

client.login(process.env.DISCORD_TOKEN);
```

- [ ] **Step 3: Commit**

```bash
git add src/index.js src/bot.js
git commit -m "feat: bot core setup"
```

---

### Task 3: Embed Utilities

**Files:**
- Create: `src/utils/embeds.js`

- [ ] **Step 1: Create src/utils/embeds.js**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/embeds.js
git commit -m "feat: embed utility builders"
```

---

### Task 4: Spotify Service

**Files:**
- Create: `src/utils/spotify.js`

- [ ] **Step 1: Create src/utils/spotify.js**

```js
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

let tokenExpiresAt = 0;

async function ensureToken() {
  if (Date.now() < tokenExpiresAt) return;
  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body.access_token);
  tokenExpiresAt = Date.now() + (data.body.expires_in - 60) * 1000;
}

function formatMs(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function searchArtistTopTracks(query) {
  await ensureToken();

  const searchResult = await spotifyApi.searchArtists(query, { limit: 1 });
  const artists = searchResult.body.artists.items;
  if (!artists.length) return null;

  const artist = artists[0];
  const topTracksResult = await spotifyApi.getArtistTopTracks(artist.id, 'FR');
  const tracks = topTracksResult.body.tracks.slice(0, 5);

  return tracks.map(t => ({
    name: t.name,
    artists: t.artists.map(a => a.name).join(', '),
    duration: formatMs(t.duration_ms),
    url: t.external_urls.spotify,
  }));
}

module.exports = { searchArtistTopTracks };
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/spotify.js
git commit -m "feat: spotify artist search service"
```

---

### Task 5: Command Handler + Deploy Script

**Files:**
- Create: `src/handlers/commands.js`
- Create: `src/deploy-commands.js`

- [ ] **Step 1: Create src/handlers/commands.js**

```js
const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

function loadCommands(client) {
  client.commands = new Collection();
  const commandsPath = path.join(__dirname, '../commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  }

  console.log(`📦 ${client.commands.size} commande(s) chargée(s)`);
}

module.exports = { loadCommands };
```

- [ ] **Step 2: Create src/deploy-commands.js**

```js
require('dotenv').config();
const { REST, Routes } = require('@discordjs/rest');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of files) {
  const command = require(path.join(commandsPath, file));
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  console.log(`Enregistrement de ${commands.length} commande(s)...`);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands },
  );
  console.log('✅ Commandes enregistrées.');
})();
```

- [ ] **Step 3: Commit**

```bash
git add src/handlers/commands.js src/deploy-commands.js
git commit -m "feat: command handler and deploy script"
```

---

### Task 6: Events + Button/Select Interactions

**Files:**
- Create: `src/handlers/events.js`

- [ ] **Step 1: Create src/handlers/events.js**

```js
const { nowPlayingEmbed } = require('../utils/embeds');

function loadEvents(client) {
  const { distube } = client;

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
        const msg = { content: "❌ Erreur lors de l'exécution de la commande.", ephemeral: true };
        interaction.replied ? await interaction.followUp(msg) : await interaction.reply(msg);
      }
      return;
    }

    // Boutons de contrôle
    if (interaction.isButton()) {
      const queue = distube.getQueue(interaction.guildId);
      if (!queue) {
        return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
      }
      await interaction.deferUpdate();

      switch (interaction.customId) {
        case 'music_pause':
          queue.paused ? queue.resume() : queue.pause();
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
          queue.stop();
          break;
      }
      return;
    }

    // Select menu résultats de recherche
    if (interaction.isStringSelectMenu() && interaction.customId === 'music_search_select') {
      const spotifyUrl = interaction.values[0];
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.reply({ content: '❌ Rejoins un salon vocal.', ephemeral: true });
      }

      await interaction.deferUpdate();
      await distube.play(voiceChannel, spotifyUrl, {
        member: interaction.member,
        textChannel: interaction.channel,
      });
    }
  });

  // Events DisTube
  distube.on('playSong', (queue, song) => {
    queue.textChannel?.send(nowPlayingEmbed(song, queue));
  });

  distube.on('addSong', (queue, song) => {
    queue.textChannel?.send({ content: `➕ **${song.name}** ajouté à la file.` });
  });

  distube.on('finish', queue => {
    queue.textChannel?.send({ content: '✅ File terminée.' });
  });

  distube.on('error', (channel, error) => {
    console.error('DisTube error:', error);
    channel?.send({ content: `❌ Erreur : ${error.message}` });
  });

  distube.on('disconnect', queue => {
    queue.textChannel?.send({ content: '👋 Déconnecté du salon vocal.' });
  });
}

module.exports = { loadEvents };
```

- [ ] **Step 2: Commit**

```bash
git add src/handlers/events.js
git commit -m "feat: events handler with buttons and select menu"
```

---

### Task 7: /play Command

**Files:**
- Create: `src/commands/play.js`

- [ ] **Step 1: Create src/commands/play.js**

```js
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
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Tu dois être dans un salon vocal.', ephemeral: true });
    }

    const query = interaction.options.getString('query');
    const attachment = interaction.options.getAttachment('fichier');

    if (!query && !attachment) {
      return interaction.reply({
        content: '❌ Fournis une recherche ou un fichier MP3.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

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

    // Recherche texte → top tracks artiste Spotify
    try {
      const tracks = await searchArtistTopTracks(query);
      if (tracks && tracks.length) {
        return interaction.editReply(searchSelectMenu(tracks, query));
      }
    } catch (err) {
      console.error('Spotify search error:', err.message);
    }

    // Fallback : recherche YouTube directe
    await client.distube.play(voiceChannel, query, {
      member: interaction.member,
      textChannel: interaction.channel,
    });
    return interaction.editReply({ content: '🎵 Lecture en cours...' });
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/play.js
git commit -m "feat: /play command with Spotify search, URLs, and MP3 attachment"
```

---

### Task 8: Remaining Commands

**Files:**
- Create: `src/commands/skip.js`
- Create: `src/commands/stop.js`
- Create: `src/commands/leave.js`
- Create: `src/commands/queue.js`

- [ ] **Step 1: Create src/commands/skip.js**

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Passe à la track suivante'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
    await queue.skip();
    return interaction.reply({ content: '⏭ Track suivante !', ephemeral: true });
  },
};
```

- [ ] **Step 2: Create src/commands/stop.js**

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Arrête la musique et vide la file'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Aucune musique en cours.', ephemeral: true });
    queue.stop();
    return interaction.reply({ content: '⏹ Musique arrêtée.', ephemeral: true });
  },
};
```

- [ ] **Step 3: Create src/commands/leave.js**

```js
const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Fait quitter le bot du salon vocal'),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (queue) queue.stop();

    const connection = getVoiceConnection(interaction.guildId);
    connection?.destroy();

    return interaction.reply({ content: '👋 À bientôt !', ephemeral: true });
  },
};
```

- [ ] **Step 4: Create src/commands/queue.js**

```js
const { SlashCommandBuilder } = require('discord.js');
const { queueEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription("Affiche la file d'attente"),

  async execute(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '❌ La file est vide.', ephemeral: true });
    }
    return interaction.reply(queueEmbed(queue));
  },
};
```

- [ ] **Step 5: Commit**

```bash
git add src/commands/skip.js src/commands/stop.js src/commands/leave.js src/commands/queue.js
git commit -m "feat: skip, stop, leave, queue commands"
```

---

### Task 9: Setup Credentials & Test Locally

- [ ] **Step 1: Create a Discord application**

Aller sur https://discord.com/developers/applications :
1. **New Application** → nom "Viisp Music"
2. Onglet **Bot** → "Add Bot" → copier le token → `DISCORD_TOKEN` dans `.env`
3. Onglet **General Information** → copier l'Application ID → `CLIENT_ID` dans `.env`
4. Onglet **OAuth2 → URL Generator** → cocher `bot` + `applications.commands` → permissions bot : `Connect`, `Speak`, `Send Messages`, `Embed Links` → copier l'URL d'invitation → inviter le bot sur ton serveur
5. Clic droit sur ton serveur Discord → Copier l'ID → `GUILD_ID` dans `.env`

- [ ] **Step 2: Create a Spotify app**

Aller sur https://developer.spotify.com/dashboard :
1. **Create App** → copier Client ID et Client Secret → `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET` dans `.env`

- [ ] **Step 3: Register slash commands**

```bash
npm run deploy
```

Expected:
```
Enregistrement de 5 commande(s)...
✅ Commandes enregistrées.
```

- [ ] **Step 4: Start bot locally**

```bash
npm start
```

Expected: `✅ Connecté en tant que Viisp Music#XXXX`

- [ ] **Step 5: Test in Discord**

- Rejoindre un salon vocal
- `/play jul` → Select menu avec 5 tracks apparaît
- Sélectionner une track → bot rejoint et joue, embed Now Playing avec boutons
- Tester chaque bouton : ⏸ pause/resume, ⏭ skip, 🔉/🔊 volume ±10, ⏹ stop
- `/play https://www.youtube.com/watch?v=dQw4w9WgXcQ` → joue directement
- `/play` avec un fichier `.mp3` attaché → joue le fichier
- `/queue` → embed file d'attente
- `/skip`, `/stop`, `/leave`

---

### Task 10: Deploy to Railway

- [ ] **Step 1: Create GitHub repo and push**

```bash
git remote add origin https://github.com/TON_USERNAME/viisp-music-bot.git
git push -u origin main
```

- [ ] **Step 2: Create Railway project**

1. Aller sur railway.app → **New Project** → **Deploy from GitHub repo**
2. Sélectionner `viisp-music-bot`

- [ ] **Step 3: Set environment variables in Railway**

Dans Railway dashboard → **Variables** → ajouter :
```
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

- [ ] **Step 4: Verify deploy logs**

Railway détecte `nixpacks.toml` et installe `yt-dlp` + `ffmpeg`. Vérifier dans les logs :
```
✅ Connecté en tant que Viisp Music#XXXX
```

- [ ] **Step 5: (Optionnel) Passer en commandes globales pour tous les serveurs**

Dans `src/deploy-commands.js`, remplacer :
```js
// Avant (guild uniquement) :
Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)

// Après (global, tous serveurs) :
Routes.applicationCommands(process.env.CLIENT_ID)
```

Re-run `npm run deploy`. Les commandes globales prennent jusqu'à 1h pour se propager sur Discord.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete Viisp Music bot"
git push
```
