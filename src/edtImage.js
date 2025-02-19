const puppeteer = require("puppeteer");
const fs = require("fs");
const request = require("./request");
const path = require("path");

async function generateImage(data, date, logger) {
  try {
    // Lancer un navigateur
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Récupérer l'html
    const html = fs.readFileSync("./edt.html", "utf-8");

    // Modifier le fichier html
    let htmlWithData = html.replace('"${dataEDT}"', "'" + JSON.stringify(data) + "'");
    htmlWithData = htmlWithData.replace('"${years}"', date.getFullYear());
    htmlWithData = htmlWithData.replace('"${month}"', date.getMonth());
    htmlWithData = htmlWithData.replace('"${day}"', date.getDate());
    fs.writeFileSync("./edt.html", htmlWithData, "utf-8");

    // Ouvrir le fichier sur le navigateur
    await page.goto("file:///" + path.resolve("edt.html"));

    // Générer l'image
    await page.screenshot({ path: "output.png" });

    // Fermer le navigateur
    await browser.close();

    // Remettre le fichier par default
    fs.writeFileSync("./edt.html", html, "utf-8");

    return true;
  } catch (error) {
    logger.error("edtImage.generateImage : " + error);
    return false;
  }
}

//generateImage(new Date(2025, 1, 24), "C1");

module.exports = {
  generateImage,
};
