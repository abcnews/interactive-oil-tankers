#!/usr/bin/env node
// Usage: node csv-to-geojson.js input.csv [output.geojson]

import { readFileSync, writeFileSync } from "fs";
import { resolve, basename, extname } from "path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node csv-to-geojson.js <input.csv> [output.geojson]");
  process.exit(1);
}

const outputPath =
  process.argv[3] ??
  resolve(basename(inputPath, extname(inputPath)) + ".geojson");

// Minimal RFC-4180 CSV parser that handles quoted fields
function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        // Quoted field
        let val = "";
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++;
            break;
          } else {
            val += line[i++];
          }
        }
        fields.push(val);
        if (line[i] === ",") i++; // skip comma
      } else {
        // Unquoted field
        const end = line.indexOf(",", i);
        if (end === -1) {
          fields.push(line.slice(i).trim());
          break;
        }
        fields.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
    rows.push(fields);
  }
  return rows;
}

const text = readFileSync(resolve(inputPath), "utf8");
const [headerRow, ...dataRows] = parseCSV(text);

// Normalise header names: lowercase, strip parens/spaces
const headers = headerRow.map((h) =>
  h
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, "")
    .trim(),
);

const countryIdx = headers.findIndex((h) => h === "country");
const portIdx = headers.findIndex((h) => h === "port");
const coordsIdx = headers.findIndex((h) => h.startsWith("coord"));
const shipsIdx = headers.findIndex((h) => h === "ships");

if ([countryIdx, portIdx, coordsIdx, shipsIdx].includes(-1)) {
  console.error("Could not find expected columns. Headers found:", headers);
  process.exit(1);
}

const features = dataRows
  .filter((row) => row.length > coordsIdx)
  .map((row, i) => {
    const coordStr = row[coordsIdx].trim();
    const parts = coordStr.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length !== 2 || parts.some(isNaN)) {
      console.warn(`Row ${i + 2}: skipping invalid coords "${coordStr}"`);
      return null;
    }
    const [longitude, latitude] = parts;
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: {
        country: row[countryIdx]?.trim() ?? null,
        port: row[portIdx]?.trim() ?? null,
        ships: shipsIdx !== -1 ? Number(row[shipsIdx]) : undefined,
      },
    };
  })
  .filter(Boolean);

const geojson = { type: "FeatureCollection", features };

writeFileSync(outputPath, JSON.stringify(geojson, null, 2), "utf8");
console.log(`✓ Wrote ${features.length} features → ${outputPath}`);
