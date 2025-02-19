const request = require("./request");
require("dotenv").config();
const botHelper = require("./botHelper");
const winston = require("winston");

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Format de la date
  winston.format.printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

const logger = winston.createLogger({
  level: "info",
  format: customFormat,
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: "application.log" })],
});

const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const token = process.env.TOKEN;

let C1 = null;
let C2 = null;

client.once("ready", async () => {
  logger.info(`Connecté en tant que ${client.user.tag}`);

  C1 = await botHelper.getChannelID("edt_c1", client, process.env.ROLE_C1, logger);
  C2 = await botHelper.getChannelID("edt_c2", client, process.env.ROLE_C2, logger);

  // Chaque heure, vérifier les changements d'EDT
  setInterval(() => {
    botHelper.scheduleChanged(client, "C1", C1, new Date(/*2025, 1, 24*/), logger);
    botHelper.scheduleChanged(client, "C2", C2, new Date(/*2025, 1, 24*/), logger);
  }, 60 * 60 * 1000);

  // Chaque semaine, envoyer l'EDT
  botHelper.scheduleSaturdayTask(() => {
    botHelper.newWeekEDT(client, "C1", C1, new Date(/*2025, 1, 24*/), logger);
    botHelper.newWeekEDT(client, "C2", C2, new Date(/*2025, 1, 24*/), logger);
  });
});

client.login(token);
