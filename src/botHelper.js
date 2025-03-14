require("dotenv").config();
const { ChannelType, AttachmentBuilder, PermissionsBitField, PermissionOverwrites, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const request = require("./request");
const tools = require("./tools");
const edtImage = require("./edtImage");
const { stringify } = require("querystring");
const { add } = require("winston");
const { log } = require("console");

async function getChannelID(channelName, client, roleID, logger) {
  const guild = client.guilds.cache.get(process.env.IDSERVER);

  if (!guild) {
    logger.error("botHelper.getChannelID : Serveur introuvable.");
    return;
  }

  let channel = guild.channels.cache.find((ch) => ch.name === channelName);

  if (!channel) {
    try {
      channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: process.env.PARENTCHANNEL,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: roleID,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: process.env.ROLE_BOT,
            allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });

      logger.info(`Le canal ${channelName} a été crée avec l'ID : ${channel.id}`);
    } catch (error) {
      logger.error("botHelper.getChannelID : " + error);
      return;
    }
  }

  return channel.id;
}

async function sendEDT(client, channelID, embed, data, date, logger) {
  if (await edtImage.generateImage(data, tools.getStartOfWeek(date), logger)) {
    const channel = client.channels.cache.get(channelID);
    const attachment = new AttachmentBuilder("./output.png").setName("image.png");
    embed.setImage("attachment://image.png");
    await channel.send({ embeds: [embed], files: [attachment] });
  }
}

async function scheduleChanged(client, group, channelID, date, logger) {
  const prevSchedule = tools.readJSONFile(group == "C1" ? "lastEDTC1.txt" : "lastEDTC2.txt");
  const currSchedule = await request.schedule(group, date, logger);

  if (!currSchedule || currSchedule.length == 0) {
    logger.error("botHelper.scheduleChanged : currSchedule is null or empty");
    return;
  }

  if (!prevSchedule || prevSchedule.length == 0) {
    fs.writeFileSync(group == "C1" ? "lastEDTC1.txt" : "lastEDTC2.txt", JSON.stringify(currSchedule), "utf-8");
    return;
  }

  const oldS = {};
  const newS = {};

  for (const el of prevSchedule.plannings[0].events) {
    oldS[el.id] = el;
  }
  for (const el of currSchedule.plannings[0].events) {
    newS[el.id] = el;
  }

  const removed = [];
  const added = [];

  for (const el in oldS) {
    if (!(el in newS)) {
      removed.push(oldS[el]);
    }
  }
  for (const el in newS) {
    if (!(el in oldS)) {
      added.push(newS[el]);
    }
  }

  const sortByStartTime = (a, b) => new Date(a.startDateTime) - new Date(b.startDateTime);
  removed.sort(sortByStartTime);
  added.sort(sortByStartTime);

  let description = "";

  if (removed.length != 0) {
    description += "Les cours suivants ont été supprimés :";

    for (let i = 0; i < removed.length; i++) {
      description += `\n - Le ${tools.formatDateHeure(new Date(removed[i].startDateTime))}: ${removed[i].course.label}`;
    }
    description += "\n\n";
  }
  if (added.length != 0) {
    description += "Les cours suivants ont été ajoutés:";

    for (let i = 0; i < added.length; i++) {
      description += `\n - Le ${tools.formatDateHeure(new Date(added[i].startDateTime))}: ${added[i].course.label}`;
    }
    description += "\n";
  }

  if (description.length != 0) {
    const embed = new EmbedBuilder().setTitle("Changement d'emploi du temps").setDescription(description);
    sendEDT(client, channelID, embed, currSchedule, date, logger);
    fs.writeFileSync(group == "C1" ? "lastEDTC1.txt" : "lastEDTC2.txt", JSON.stringify(currSchedule), "utf-8");
  }
}

async function scheduleSaturdayTask(action) {
  const timeUntilNextSaturday = /*1000;*/ tools.msUntilNextSaturday();

  setTimeout(() => {
    action();
    setInterval(action, 7 * 24 * 60 * 60 * 1000);
    //setInterval(action, 60 * 1000);
  }, timeUntilNextSaturday);
}

async function newWeekEDT(client, group, channelID, date, logger) {
  const data = await request.schedule(group, date, logger);

  if (!data || data.length == 0) {
    logger.error("botHelper.newWeekEDT : donnée vide");
    return false;
  }

  fs.writeFileSync(group == "C1" ? "lastEDTC1.txt" : "lastEDTC2.txt", JSON.stringify(data), "utf-8");

  const embed = new EmbedBuilder().setTitle("Emploi du temps de la semaine");

  sendEDT(client, channelID, embed, data, date, logger);
}

async function notifyDS(client, channelsID, logger) {
  const dsNotified = tools.readJSONFile("./notifiedDS.txt"); // Récupérer les DS déjà notifié
  const data = tools.readJSONFile("./lastEDTC1.txt"); // Récupérer la liste des cours

  // Pas de données de cours
  if (data == null || data.length == 0) {
    logger.error("botHelper.notifyDS : donnée vide");
    return;
  }

  const ds = {};
  const events = data.plannings[0].events;

  if (dsNotified) {
    for (const el of dsNotified["ds"]) {
      ds[el.id] = el;
    }
  }

  // Supprimer les DS notifié qui sont passé
  for (let key in ds) {
    if (new Date(ds[key].startDateTime).getTime() < new Date().getTime()) {
      delete ds[key];
    }
  }

  // Notifié les DS qui se trouve dans la liste des cours
  // Si ils n'ont pas déjà été notifié
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.course.type == "CM" && new Date(event.startDateTime).getTime() >= new Date().getTime()) {
      if (!(event.id in ds)) {
        const C1 = client.guilds.cache.get(process.env.IDSERVER).roles.cache.get(process.env.ROLE_C1);
        const C2 = client.guilds.cache.get(process.env.IDSERVER).roles.cache.get(process.env.ROLE_C2);
        client.channels.cache.get(channelsID[0]).send(`${C1} DS en ${event.course.label}, le ${tools.formatDateHeure(new Date(event.startDateTime))}`);
        client.channels.cache.get(channelsID[1]).send(`${C2} DS en ${event.course.label}, le ${tools.formatDateHeure(new Date(event.startDateTime))}`);
        ds[event.id] = event;
      }
    }
  }

  // Créer un objet JSON des DS Notifié
  let jsonObject = {
    ds: [],
  };
  for (let key in ds) {
    jsonObject.ds.push(ds[key]);
  }

  // Mettre a jour les DS notifié
  fs.writeFileSync("./notifiedDS.txt", JSON.stringify(jsonObject), "utf-8");
}

module.exports = {
  getChannelID,
  newWeekEDT,
  scheduleChanged,
  scheduleSaturdayTask,
  notifyDS,
};
