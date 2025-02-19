require("dotenv").config();
const { ChannelType, AttachmentBuilder, PermissionsBitField, PermissionOverwrites } = require("discord.js");
const fs = require("fs");

const request = require("./request");
const tools = require("./tools");
const edtImage = require("./edtImage");

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
            allow: [PermissionsBitField.Flags.SendMessages],
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

async function sendEDT(client, channelID, message, data, date, logger) {
  if (await edtImage.generateImage(data, tools.getStartOfWeek(date), logger)) {
    const channel = client.channels.cache.get(channelID);
    const attachment = new AttachmentBuilder("./output.png");
    await channel.send({ content: message, files: [attachment] });
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

  const oldSet = new Set(prevSchedule.plannings[0].events.map(JSON.stringify));
  const newSet = new Set(currSchedule.plannings[0].events.map(JSON.stringify));

  const removed = [...oldSet].filter((item) => !newSet.has(item)).map(JSON.parse);
  const added = [...newSet].filter((item) => !oldSet.has(item)).map(JSON.parse);

  const sortByStartTime = (a, b) => new Date(a.startDateTime) - new Date(b.startDateTime);
  removed.sort(sortByStartTime);
  added.sort(sortByStartTime);

  let message = "";

  if (removed.length != 0) {
    message += "Les cours suivant on été supprimé: ";

    for (let i = 0; i < removed.length; i++) {
      message += `\n - Le ${tools.formatDateHeure(new Date(removed[i].startDateTime))}: ${removed[i].course.label}`;
    }
    message += "\n\n";
  }
  if (added.length != 0) {
    message += "Les cours suivant on été ajouté: ";

    for (let i = 0; i < added.length; i++) {
      message += `\n - Le ${tools.formatDateHeure(new Date(added[i].startDateTime))}: ${added[i].course.label}`;
    }
    message += "\n";
  }

  if (message.length != 0) {
    sendEDT(client, channelID, message, currSchedule, date, logger);
    fs.writeFileSync(group == "C1" ? "lastEDTC1.txt" : "lastEDTC2.txt", JSON.stringify(currSchedule), "utf-8");
  }
}

async function scheduleSaturdayTask(action) {
  const timeUntilNextSaturday = tools.msUntilNextSaturday();

  setTimeout(() => {
    action();
    setInterval(action, 7 * 24 * 60 * 60 * 1000);
  }, timeUntilNextSaturday);
}

async function newWeekEDT(client, group, channelID, date, logger) {
  const data = await request.schedule(group, date, logger);

  if (!data || data.length == 0) {
    logger.error("botHelper.newWeekEDT : donnée vide");
    return false;
  }

  fs.writeFileSync(group == "C1" ? "lastEDTC1.txt" : "lastEDTC2.txt", JSON.stringify(data), "utf-8");

  sendEDT(client, channelID, "Emploi du temps de la semaine :", data, date, logger);
}

module.exports = {
  getChannelID,
  newWeekEDT,
  scheduleChanged,
  scheduleSaturdayTask,
};
