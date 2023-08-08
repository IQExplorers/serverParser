const express = require("express");
const cheerio = require("cheerio");
const axios = require("axios");
const cors = require("cors");
const selectors = require("./selectors.json");
require("dotenv").config();

//express config
const app = express();
app.use(cors({ origin: "*" }));
const port = process.env.PORT || 4000;

const CSGOSource = "https://liquipedia.net/counterstrike/Liquipedia:Matches";
const fakeDotaSource = "https://liquipedia.net/dota2/B8";
const valorantSource = "https://liquipedia.net/valorant/Liquipedia:Matches";
const teamToFind = process.env.TEAM_TO_FIND;

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
      const leftTeamElement = $(tableElement).find(".team-left");
      const rightTeamElement = $(tableElement).find(".team-right");
      const leftTemaName = leftTeamElement.text().trim();
      const rightTeamName = rightTeamElement.text().trim();

      if (leftTemaName === teamToFind || rightTeamName === teamToFind) {
        const enemyElement =
          leftTemaName === teamToFind ? rightTeamElement : leftTeamElement;

        const enemyName = enemyElement.text().trim();
        const enemyImageLink =
          "https://liquipedia.net" + enemyElement.find("img").attr("src");

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

        const status = utcDateObj.getTime() < Date.now() ? "going" : "upcoming";

        matches.push({
          Enemy: {
            name: enemyName,
            image: enemyImageLink,
          },
          Game: game,
          Date: utcDateObj,
          Format: format,
          Status: status,
          Tournament: {
            name: tournamentName,
            link: "https://liquipedia.net" + tournamentLink,
          },
        });
      }
    });
  console.log(`${game}`, matches);
  return matches;
}

async function parseDota(dotaSource, selector) {
  const { data: html } = await axios.get(dotaSource);

  let matches = [];
  const $ = cheerio.load(html);
  $(selector)
    .find("table")
    .each((tableId, tableElement) => {
      const leftTeamElement = $(tableElement).find(".team-left");
      const rightTeamElement = $(tableElement).find(".team-right");
      const leftTemaName = leftTeamElement.text().trim();
      const rightTeamName = rightTeamElement.text().trim();

      const enemyElement =
        leftTemaName === teamToFind ? rightTeamElement : leftTeamElement;

      const enemyName = enemyElement.text().trim();
      const enemyImageLink =
        "https://liquipedia.net" + enemyElement.find("img").attr("src");

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

      const utcDateObj = new Date(Date.parse(dateText));
      

      const status = utcDateObj.getTime() < Date.now() ? "going" : "upcoming" ;

      matches.push({
        Enemy: {
          name: enemyName,
          image: enemyImageLink,
        },
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
  const [valorantMatches, CSGOMatches, dotaMatches] = await Promise.all([
    parseMatches(valorantSource, selectors.valorantSelector, "Valorant"),
    parseMatches(CSGOSource, selectors.CSGOSelector, "CS:GO"),
    parseDota(fakeDotaSource, selectors.dotaSelector),
  ]);

  return [...CSGOMatches, ...dotaMatches, ...valorantMatches];
}
