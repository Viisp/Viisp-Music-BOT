require('dotenv').config();
// Force IPv4 DNS resolution — fixes voice UDP on Railway
require('dns').setDefaultResultOrder('ipv4first');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { client } = require('./bot');
const { loadCommands } = require('./handlers/commands');
const { loadEvents } = require('./handlers/events');

// Auto-register slash commands on every start so options like autocomplete stay in sync
async function deployCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(commandsPath, file));
    if (cmd.data) commands.push(cmd.data.toJSON());
  }
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands },
  );
  console.log(`✅ ${commands.length} commande(s) enregistrée(s).`);
}

loadCommands(client);
loadEvents(client);

deployCommands().catch(err => console.error('Deploy error:', err.message));

client.login(process.env.DISCORD_TOKEN);
