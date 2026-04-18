require('dotenv').config();
const { client } = require('./bot');
const { loadCommands } = require('./handlers/commands');
const { loadEvents } = require('./handlers/events');

loadCommands(client);
loadEvents(client);

client.login(process.env.DISCORD_TOKEN);
