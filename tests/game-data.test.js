import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { JSDOM } from "jsdom";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");

function extractGamesArray(htmlPath) {
  const html = readFileSync(resolve(ROOT, htmlPath), "utf-8");
  const match = html.match(/const GAMES\s*=\s*\[([\s\S]*?)\];/);
  if (!match) throw new Error(`GAMES array not found in ${htmlPath}`);
  // Evaluate safely by wrapping in array brackets
  const fn = new Function(`return [${match[1]}];`);
  return fn();
}

const indexGames = extractGamesArray("index.html");
const playGames = extractGamesArray("play.html");

describe("GAMES data integrity", () => {
  it("index.html contains exactly 100 games", () => {
    expect(indexGames).toHaveLength(100);
  });

  it("play.html contains exactly 100 games", () => {
    expect(playGames).toHaveLength(100);
  });

  it("game numbers run from 01 to 100", () => {
    const nums = indexGames.map((g) => g.num);
    for (let i = 1; i <= 100; i++) {
      const expected = i < 10 ? `0${i}` : `${i}`;
      expect(nums).toContain(expected);
    }
  });

  it("every game has required fields", () => {
    for (const g of indexGames) {
      expect(g).toHaveProperty("num");
      expect(g).toHaveProperty("name");
      expect(g).toHaveProperty("folder");
      expect(g).toHaveProperty("file");
      expect(g).toHaveProperty("color");
      expect(g).toHaveProperty("desc");
    }
  });

  it("every game name is non-empty", () => {
    for (const g of indexGames) {
      expect(g.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("every game has a valid hex color", () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    for (const g of indexGames) {
      expect(g.color).toMatch(hexRegex);
    }
  });

  it("game folders match expected naming pattern", () => {
    for (const g of indexGames) {
      expect(g.folder).toMatch(/^game-\d{1,3}-\w+$/);
    }
  });

  it("all game files are index.html", () => {
    for (const g of indexGames) {
      expect(g.file).toBe("index.html");
    }
  });
});

describe("GAMES consistency between index.html and play.html", () => {
  it("same number of games in both files", () => {
    expect(indexGames.length).toBe(playGames.length);
  });

  it("game numbers match between files", () => {
    const indexNums = indexGames.map((g) => g.num);
    const playNums = playGames.map((g) => g.num);
    expect(indexNums).toEqual(playNums);
  });

  it("game names match between files", () => {
    const indexNames = indexGames.map((g) => g.name);
    const playNames = playGames.map((g) => g.name);
    expect(indexNames).toEqual(playNames);
  });

  it("game folders match between files", () => {
    const indexFolders = indexGames.map((g) => g.folder);
    const playFolders = playGames.map((g) => g.folder);
    expect(indexFolders).toEqual(playFolders);
  });

  it("game colors match between files", () => {
    const indexColors = indexGames.map((g) => g.color);
    const playColors = playGames.map((g) => g.color);
    expect(indexColors).toEqual(playColors);
  });
});

describe("game file structure", () => {
  it("every game directory exists", () => {
    for (const g of indexGames) {
      const dir = resolve(ROOT, g.folder);
      expect(existsSync(dir), `Missing directory: ${g.folder}`).toBe(true);
    }
  });

  it("every game has an index.html file", () => {
    for (const g of indexGames) {
      const file = resolve(ROOT, g.folder, g.file);
      expect(existsSync(file), `Missing file: ${g.folder}/${g.file}`).toBe(
        true,
      );
    }
  });

  it("every game HTML file is non-empty", () => {
    for (const g of indexGames) {
      const file = resolve(ROOT, g.folder, g.file);
      const content = readFileSync(file, "utf-8");
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("every game HTML file has a canvas or valid HTML structure", () => {
    for (const g of indexGames) {
      const file = resolve(ROOT, g.folder, g.file);
      const content = readFileSync(file, "utf-8");
      expect(content).toContain("<!DOCTYPE html");
    }
  });
});

describe("hexGlow utility function", () => {
  // Extracted from index.html
  function hexGlow(hex, a = 0.45) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  it("converts hex to rgba with default alpha", () => {
    expect(hexGlow("#ff6b6b")).toBe("rgba(255,107,107,0.45)");
  });

  it("converts hex to rgba with custom alpha", () => {
    expect(hexGlow("#00e5ff", 0.8)).toBe("rgba(0,229,255,0.8)");
  });

  it("handles black color", () => {
    expect(hexGlow("#000000")).toBe("rgba(0,0,0,0.45)");
  });

  it("handles white color", () => {
    expect(hexGlow("#ffffff")).toBe("rgba(255,255,255,0.45)");
  });
});

describe("hub page HTML structure", () => {
  it("index.html has correct title", () => {
    const html = readFileSync(resolve(ROOT, "index.html"), "utf-8");
    const dom = new JSDOM(html);
    expect(dom.window.document.title).toBe("100 GAMES");
  });

  it("play.html has correct title", () => {
    const html = readFileSync(resolve(ROOT, "play.html"), "utf-8");
    const dom = new JSDOM(html);
    expect(dom.window.document.title).toBe("100 GAMES");
  });

  it("index.html has viewport meta tag", () => {
    const html = readFileSync(resolve(ROOT, "index.html"), "utf-8");
    expect(html).toContain('name="viewport"');
  });

  it("play.html has viewport meta tag", () => {
    const html = readFileSync(resolve(ROOT, "play.html"), "utf-8");
    expect(html).toContain('name="viewport"');
  });

  it("play.html has game iframe", () => {
    const html = readFileSync(resolve(ROOT, "play.html"), "utf-8");
    const dom = new JSDOM(html);
    const iframe = dom.window.document.getElementById("game-frame");
    expect(iframe).not.toBeNull();
  });

  it("play.html has carousel track", () => {
    const html = readFileSync(resolve(ROOT, "play.html"), "utf-8");
    const dom = new JSDOM(html);
    const track = dom.window.document.getElementById("carousel-track");
    expect(track).not.toBeNull();
  });

  it("index.html has grid container", () => {
    const html = readFileSync(resolve(ROOT, "index.html"), "utf-8");
    const dom = new JSDOM(html);
    const grid = dom.window.document.getElementById("grid");
    expect(grid).not.toBeNull();
  });

  it("play.html links back to index.html", () => {
    const html = readFileSync(resolve(ROOT, "play.html"), "utf-8");
    expect(html).toContain('href="index.html"');
  });
});

describe("no duplicate games", () => {
  it("no duplicate game numbers", () => {
    const nums = indexGames.map((g) => g.num);
    expect(new Set(nums).size).toBe(nums.length);
  });

  it("no duplicate game folders", () => {
    const folders = indexGames.map((g) => g.folder);
    expect(new Set(folders).size).toBe(folders.length);
  });

  it("no duplicate game names", () => {
    const names = indexGames.map((g) => g.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
