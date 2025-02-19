const request = require("./request");
require("dotenv").config();
const botHelper = require("./botHelper");

const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const token = process.env.TOKEN;

let C1 = null;
let C2 = null;

client.once("ready", async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  C1 = await botHelper.getChannelID("edt_c1", client);
  C2 = await botHelper.getChannelID("edt_c2", client);

  // Chaque heure vérifié l'EDT
  setInterval(() => {
    botHelper.scheduleChanged(client, "C1", C1);
    botHelper.scheduleChanged(client, "C2", C1);
  }, 60 * 60 * 1000);
});

client.login(token);
