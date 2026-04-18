# Viisp Music Bot — Design Spec
Date: 2026-04-18

## Overview

Discord music bot "Viisp Music" — bot public hébergé sur Railway, accessible à tous les utilisateurs d'un serveur Discord. Interface 100% Discord native (embeds + boutons), pas de dashboard web.

## Stack

- **Runtime:** Node.js
- **Discord:** discord.js v14 (slash commands, interactions, boutons, select menus)
- **Musique:** DisTube v4 + plugin `@distube/spotify` + plugin `@distube/yt-dlp`
- **Audio source:** yt-dlp (binaire) — YouTube comme source audio
- **Spotify bridge:** API Spotify (Client Credentials) → résolution titre/artiste → recherche YouTube
- **Hébergement:** Railway (déploiement via GitHub)
- **Fichiers locaux:** `/play` supporte les fichiers `.mp3` uploadés en pièce jointe Discord (attachement)

## Structure des fichiers

```
Viisp Music/
├── src/
│   ├── index.js              # Entry point, login bot
│   ├── bot.js                # Setup client discord.js + DisTube + plugins
│   ├── commands/
│   │   ├── play.js           # /play <query|url|attachment>
│   │   ├── skip.js           # /skip
│   │   ├── stop.js           # /stop
│   │   ├── queue.js          # /queue
│   │   └── leave.js          # /leave
│   ├── handlers/
│   │   ├── commands.js       # Chargement + enregistrement slash commands (REST)
│   │   └── events.js         # Events DisTube : playSong, addSong, finish, error
│   └── utils/
│       └── embeds.js         # Constructeurs d'embeds + rows de boutons
├── .env                      # DISCORD_TOKEN, CLIENT_ID, SPOTIFY_ID, SPOTIFY_SECRET
├── .gitignore                # node_modules, .env
├── package.json
├── Procfile                  # web: node src/index.js (Railway)
└── docs/
    └── superpowers/specs/
        └── 2026-04-18-viisp-music-bot-design.md
```

## Commandes slash

| Commande | Paramètre | Description |
|----------|-----------|-------------|
| `/play` | `query` (texte ou URL) | Nom artiste, titre, URL Spotify, URL YouTube, ou texte libre |
| `/skip` | — | Passe à la track suivante dans la queue |
| `/stop` | — | Arrête la lecture et vide la queue |
| `/queue` | — | Affiche la file d'attente (embed paginé) |
| `/leave` | — | Le bot quitte le canal vocal |

**Fichiers locaux :** `/play` accepte aussi une pièce jointe `.mp3` envoyée avec la commande (Discord attachment). Le bot stream le fichier directement depuis l'URL temporaire Discord.

## Flux `/play <query>`

1. L'utilisateur tape `/play jul` (ou une URL Spotify/YouTube)
2. **Si URL Spotify** → API Spotify résout titre + artiste → recherche YouTube → joue directement
3. **Si URL YouTube** → joue directement via DisTube
4. **Si fichier .mp3 attaché** → stream depuis l'URL Discord attachment
5. **Si texte libre** → recherche Spotify pour les top tracks de l'artiste :
   - Retourne un Select Menu avec 5 résultats (titre - artiste - durée)
   - L'utilisateur sélectionne → bridge Spotify→YouTube → lecture
6. Bot rejoint le canal vocal de l'utilisateur
7. Embed "Now Playing" affiché avec boutons de contrôle

## Interface Discord

### Embed "Now Playing"
```
🎵 Now Playing                          [thumbnail pochette]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Titre — Artiste
⏱ 0:00 / 3:45  |  🔊 Volume : 80%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ⏸ Pause ] [ ⏭ Skip ] [ 🔉 Vol− ] [ 🔊 Vol+ ] [ ⏹ Stop ]
```

### Select Menu (recherche artiste)
```
🔍 Résultats pour "jul"
▼ Choisir une track...
  1. Tout là-haut — Jul (3:12)
  2. Bande organisée — Jul, SCH... (4:01)
  3. Chocolat — Jul (2:58)
  4. Les règles — Jul (3:45)
  5. Tchoin — Jul (3:22)
```

### Embed Queue
- Liste paginée (10 tracks par page)
- Numéro, titre, artiste, durée
- Track en cours mise en avant

## Variables d'environnement

```env
DISCORD_TOKEN=        # Token du bot Discord
CLIENT_ID=            # Application ID Discord
SPOTIFY_CLIENT_ID=    # API Spotify (Client Credentials)
SPOTIFY_CLIENT_SECRET=
```

## Hébergement Railway

- Dépôt GitHub connecté à Railway
- `Procfile` : `web: node src/index.js`
- Variables d'env configurées dans Railway dashboard
- Déploiement automatique sur push `main`
- Free tier Railway suffit pour usage personnel (500h/mois)

## Ce qui n'est PAS inclus (YAGNI)

- Dashboard web
- Système de permissions par rôle
- Playlists sauvegardées
- Equalizer / effets audio
- Support multi-serveurs avancé (fonctionne nativement via discord.js)
