const axios = require("axios");
require("dotenv").config();
const tools = require("./tools");

const api = axios.create({
  baseURL: "https://appmob.uphf.fr/backend/",
  timeout: 10000,
});

// Récupération du token de connexion en fonction du groupe
async function login(group) {
  try {
    const data = {
      username: group == "C1" ? process.env.LOGIN_C1 : process.env.LOGIN_C2,
      password: group == "C1" ? process.env.PASSWORD_C1 : process.env.PASSWORD_C2,
    };

    const response = await api.post("keep-auth/auth", data);

    return response.data.authToken;
  } catch (error) {
    tools.logError("request.login : " + error);
    return null;
  }
}

// Récupération de l'EDT en fonction du groupe
async function schedule(group) {
  try {
    const token = await login(group);
    const start = tools.getStartOfWeek();
    const end = tools.getEndOfWeek();

    const data = {
      authToken: token,
      startDate: tools.formatDate(start),
      endDate: tools.formatDate(end),
      asUser: null,
    };

    const response = await api.post("schedule", data);

    return response.data;
  } catch (error) {
    tools.logError("request.schedule : " + error);
  }
}

module.exports = {
  schedule,
};
