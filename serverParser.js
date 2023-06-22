const express = require("express");
const cheerio = require("cheerio");
const axios = require("axios");
const cors = require("cors");

const app = express();
const port = 3000;

const CSGOSelector =
  "#mw-content-text > div > div.panel-box.wiki-bordercolor-light.toggle-area.toggle-area-1.matches-list > div:nth-child(2) > div:nth-child(1)";

const valorantSelector =
  "#mw-content-text > div > div.panel-box.wiki-bordercolor-light.toggle-area.toggle-area-1.matches-list > div:nth-child(2) > div:nth-child(1)";

const dotaSelector =
  "#mw-content-text > div > div.panel-box.wiki-bordercolor-light.toggle-area.toggle-area-1.matches-list > div:nth-child(2) > div:nth-child(1)";

const fakeDotaSelector = "#mw-content-text > div > div:nth-child(3) > div";

const CSGOSource = "https://liquipedia.net/counterstrike/Liquipedia:Matches";
const fakeDotaSource = "https://liquipedia.net/dota2/B8";
const valorantSource = "https://liquipedia.net/valorant/Liquipedia:Matches";

app.use(cors({ origin: "*" }));

app.get("/matches", async (req, res) => {
  try {
    const matches = await getMatches();
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

async function parseMatches(sourcePage, selector, game) {
  const { data: html } = await axios.get(sourcePage);

  let matches = [];
  const $ = cheerio.load(html);
  $(selector)
    .find("table")
    .each((tableId, tableElement) => {
      let enemy;
      let matchFound = false;

      const leftTeam = $(tableElement).find(".team-left").text().trim();
      const rightTeam = $(tableElement).find(".team-right").text().trim();

      if (leftTeam === "Sashi.A") {
        enemy = rightTeam;
        matchFound = true;
      } else if (rightTeam === "Sashi.A") {
        enemy = leftTeam;
        matchFound = true;
      }

      //if (enemy === "TBD") matchFound = false;

      if (matchFound) {
        const tournamentName = $(tableElement)
          .find("tr:nth-child(2) > td > div > div > a")
          .text();

        const tournamentLink = $(tableElement)
          .find("tr:nth-child(2) > td > div > div > a")
          .attr("href");

        const dateText = $(tableElement)
          .find(".match-countdown")
          .text()
          .replace("-", "")
          .trim();

        const format = $(tableElement)
          .find("tr:nth-child(1)")
          .find("abbr")
          .text();

        const utcDateObj = new Date(Date.parse(dateText));
        console.log("utcDateObj", utcDateObj);

        const status = utcDateObj.getTime() < Date.now() ? "going" : "upcoming";

        matches.push({
          Name: enemy,
          Game: game,
          Date: utcDateObj,
          Format: format,
          Status: status,
          Tournament: {
            name: tournamentName,
            link: "https://liquipedia.net" + tournamentLink,
          },
        });
        matchFound = false;
        enemy = null;
      }
    });
  console.log(`${game}`, matches);
  return matches;
}

async function parseDota() {
  const { data: html } = await axios.get(fakeDotaSource);

  let matches = [];
  const $ = cheerio.load(html);
  $(fakeDotaSelector)
    .find("table")
    .each((tableId, tableElement) => {
      const leftTeam = $(tableElement).find(".team-left").text().trim();
      const rightTeam = $(tableElement).find(".team-right").text().trim();

      const dateText = $(tableElement)
        .find(".match-countdown")
        .text()
        .replace("-", "")
        .trim();

      const tournamentName = $(tableElement)
        .find("tr:nth-child(2) > td > div > div > a")
        .text();

      const tournamentLink = $(tableElement)
        .find("tr:nth-child(2) > td > div > div > a")
        .attr("href");

      const format = $(tableElement)
        .find("tr:nth-child(1)")
        .find("abbr")
        .text();

      const enemy = leftTeam === "B8" ? rightTeam : leftTeam;

      const utcDateObj = new Date(Date.parse(dateText));
      console.log("utcDateObj", utcDateObj);

      const status = utcDateObj.getTime() < Date.now() ? "going" : "upcoming";

      matches.push({
        Name: enemy,
        Game: "Dota 2",
        Date: utcDateObj,
        Format: format,
        Status: status,
        Tournament: {
          name: tournamentName,
          link: "https://liquipedia.net" + tournamentLink,
        },
      });
    });
  console.log("Dota 2", matches);
  return matches;
}

async function getMatches() {
  const valorantMatches = await parseMatches(
    valorantSource,
    valorantSelector,
    "Valorant"
  );

  const CSGOMatches = await parseMatches(CSGOSource, CSGOSelector, "CS:GO");

  const dotaMatches = await parseDota();

  return [...CSGOMatches, ...dotaMatches, ...valorantMatches];
}