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
