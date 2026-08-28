#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const catalogPath = path.join(root, "catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const descriptions = new Map();

for (const line of readme.split(/\r?\n/)) {
  const match = line.match(
    /^\|\s*(\d{2,3})\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*([^|]+?)\s*\|$/,
  );
  if (!match) continue;
  descriptions.set(Number.parseInt(match[1], 10), match[3].trim());
}

if (descriptions.size !== catalog.games.length) {
  throw new Error(
    `README game table contains ${descriptions.size} rows for ${catalog.games.length} catalog entries`,
  );
}

const casinoGames = new Set([35, 36, 50]);
const games = catalog.games.map((game) => {
  const {
    exclusionReason: _exclusionReason,
    selected: _selected,
    ...current
  } = game;
  const description = descriptions.get(game.number);
  if (!description) throw new Error(`missing README description for game ${game.number}`);
  return {
    ...current,
    description,
    category: casinoGames.has(game.number) ? "Casino" : current.category,
    playable: true,
    status: "active",
    quality: "Verified",
    contentTags: casinoGames.has(game.number)
      ? ["casino"]
      : game.number === 64
        ? ["word", "english"]
        : game.number === 97
          ? ["auction", "bluffing"]
          : [],
  };
});

const nextCatalog = {
  schemaVersion: 2,
  source: catalog.source,
  inventory: {
    total: games.length,
    playable: games.filter((game) => game.playable).length,
    policy: [
      "Keep every source-available browser game in the self-hosted catalog",
      "Represent audience, language, device, and content concerns as filterable metadata",
      "Do not use curation labels to remove playable source entries",
    ],
  },
  games,
};

fs.writeFileSync(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);
console.log(`[100games] synchronized ${games.length} Open Games catalog entries`);
