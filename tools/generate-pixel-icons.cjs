#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const GRID = 16;
const SAMPLE = 16;
const CANVAS = GRID * SAMPLE;
const INNER = 12 * SAMPLE;
const INK = "#202020";
const VERSION = "6.7.2";
const CDN = `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@${VERSION}/svgs`;

const icons = {
  // Email and LinkedIn are intentionally excluded: their SVGs are hand-adjusted finals.
  x: { url: `${CDN}/brands/x-twitter.svg`, threshold: 0.25 },
  github: { url: `${CDN}/brands/github.svg`, threshold: 0.42 },
  scholar: { url: `${CDN}/brands/google-scholar.svg`, threshold: 0.42 },
};

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function pixelGrid(svg, threshold) {
  const fitted = await sharp(svg)
    .resize(INNER, INNER, { fit: "contain", position: "centre" })
    .png()
    .toBuffer();

  const canvas = await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: "#00000000" },
  })
    .composite([{ input: fitted, gravity: "centre" }])
    .ensureAlpha()
    .raw()
    .toBuffer();

  const cells = [];
  for (let gy = 0; gy < GRID; gy++) {
    const row = [];
    for (let gx = 0; gx < GRID; gx++) {
      let alpha = 0;
      for (let sy = 0; sy < SAMPLE; sy++) {
        for (let sx = 0; sx < SAMPLE; sx++) {
          const x = gx * SAMPLE + sx;
          const y = gy * SAMPLE + sy;
          alpha += canvas[(y * CANVAS + x) * 4 + 3];
        }
      }
      const coverage = alpha / (255 * SAMPLE * SAMPLE);
      row.push(coverage >= threshold);
    }
    cells.push(row);
  }
  return cells;
}

function gridPath(cells) {
  const segments = [];
  for (let y = 0; y < GRID; y++) {
    let x = 0;
    while (x < GRID) {
      if (!cells[y][x]) { x++; continue; }
      const start = x;
      while (x < GRID && cells[y][x]) x++;
      const width = x - start;
      segments.push(`M${start} ${y}h${width}v1H${start}z`);
    }
  }
  return segments.join("");
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const output = path.join(root, "static", "images", "icons");
  await fs.mkdir(output, { recursive: true });

  for (const [name, { url, threshold }] of Object.entries(icons)) {
    const source = await download(url);
    const cells = await pixelGrid(source, threshold);
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges">`,
      `  <path fill="${INK}" d="${gridPath(cells)}"/>`,
      `</svg>`,
      "",
    ].join("\n");
    await fs.writeFile(path.join(output, `mosaic-${name}.svg`), svg);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
