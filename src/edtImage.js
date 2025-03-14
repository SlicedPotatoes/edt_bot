const puppeteer = require("puppeteer");
const fs = require("fs");
const request = require("./request");
const path = require("path");

async function generateImage(data, date, logger, group) {
  const originalHtml = fs.readFileSync("./edt.html", "utf-8");
  const tempHtmlPath = "./edt_temp_" + group + ".html";

  try {
    let htmlWithData = originalHtml
      .replace('"${dataEDT}"', `\`${JSON.stringify(data).replace("`", "`")}\``)
      .replace('"${years}"', date.getFullYear())
      .replace('"${month}"', date.getMonth())
      .replace('"${day}"', date.getDate());

    fs.writeFileSync(tempHtmlPath, htmlWithData, "utf-8");

    const browser = await puppeteer.launch();
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto("file:///" + path.resolve(tempHtmlPath));
      await page.screenshot({ path: "output_" + group + ".png" });
    } finally {
      await browser.close();
    }
  } catch (error) {
    logger.error("edtImage.generateImage : " + error);
    return false;
  }
  return true;
}

module.exports = {
  generateImage,
};
