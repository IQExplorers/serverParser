const express = require("express");
const cheerio = require("cheerio");
const axios = require("axios");
const cors = require("cors");
const selectors = require("./selectors.json");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;

const CSGOSource = "https://liquipedia.net/counterstrike/Liquipedia:Matches";
const fakeDotaSource = "https://liquipedia.net/dota2/B8";
const valorantSource = "https://liquipedia.net/valorant/Liquipedia:Matches";
const teamToFind = process.env.TEAM_TO_FIND;

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
      const leftTeam = $(tableElement).find(".team-left").text().trim();
      const rightTeam = $(tableElement).find(".team-right").text().trim();

      if (leftTeam === teamToFind || rightTeam === teamToFind) {
        const enemy = leftTeam === teamToFind ? rightTeam : leftTeam;

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

      const enemy = leftTeam === teamToFind ? rightTeam : leftTeam;

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
  const [valorantMatches, CSGOMatches, dotaMatches] = await Promise.all([
    parseMatches(valorantSource, selectors.valorantSelector, "Valorant"),
    parseMatches(CSGOSource, selectors.CSGOSelector, "CS:GO"),
    parseDota(fakeDotaSource, selectors.dotaSelector),
  ]);

  return [...CSGOMatches, ...dotaMatches, ...valorantMatches];
}
