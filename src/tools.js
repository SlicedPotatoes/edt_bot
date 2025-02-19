const fs = require("fs");

function getStartOfWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay();

  let startOfWeek = new Date(today);

  // En semaine (lundi à vendredi), renvoyé la date du lundi 8h
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    const daysToMonday = dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysToMonday);
  }
  // Le weekend (samedi - dimanche), renvoyé la date du prochain lundi 8h
  else {
    const daysToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + daysToNextMonday);
  }

  startOfWeek.setHours(8, 0, 0, 0);

  return startOfWeek;
}

function getEndOfWeek() {
  date = getStartOfWeek();

  date.setDate(date.getDate() + 6);

  return date;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateHeure(date) {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");

  return formatDate(date) + ` ${h}h${m}`;
}

function readJSONFile(path) {
  const strJSON = fs.readFileSync(path, "utf8");

  if (strJSON.length == 0) {
    return null;
  }

  return JSON.parse(strJSON);
}

function logError(error) {
  console.error(formatDateHeure(new Date()), error);
}

module.exports = {
  getStartOfWeek,
  getEndOfWeek,
  formatDate,
  formatDateHeure,
  readJSONFile,
  logError,
};
