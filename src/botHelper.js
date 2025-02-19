require("dotenv").config();
const { ChannelType, AttachmentBuilder } = require("discord.js");
const fs = require("fs");

const request = require("./request");
const tools = require("./tools");
const edtImage = require("./edtImage");

async function getChannelID(channelName, client) {
  const guild = client.guilds.cache.get(process.env.IDSERVER);

  if (!guild) {
    tools.logError("botHelper.getChannelID : Serveur introuvable.");
    return;
  }

  let channel = guild.channels.cache.find((ch) => ch.name === channelName);

  if (!channel) {
    try {
      channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: process.env.PARENTCHANNEL,
      });

      // Ajouter role autorisé
      // Enlever permission de parlé

      console.log(`Le canal ${channelName} a été crée avec l'ID : ${channel.id}`);
    } catch (error) {
      tools.logError("botHelper.getChannelID : " + error);
      return;
    }
  }

  return channel.id;
}

async function scheduleChanged(client, group, channelID) {
  const prevSchedule = tools.readJSONFile(group == "C1" ? "lastEDTC1.txt" : "lastEDTC2.txt");
  const currSchedule = await request.schedule(group);

  if (!currSchedule || currSchedule.length == 0) {
    tools.logError("botHelper.scheduleChanged : currSchedule is null or empty");
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
    edtImage.generateImage(tools.getStartOfWeek(), group);

    const channel = client.channels.cache.get(channelID);

    const attachment = new AttachmentBuilder("./output.png");

    await channel.send({ content: message, files: [attachment] });

    fs.writeFileSync(group == "C1" ? "lastEDTC1.txt" : "lastEDTC2.txt", JSON.stringify(currSchedule), "utf-8");
  }
}

module.exports = {
  getChannelID,
  scheduleChanged,
};
