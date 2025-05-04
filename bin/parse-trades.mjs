#!/usr/bin/env node
// bin/parse-trades.mjs  (ESM wrapper)
import { parseText } from "../lib/trades.js";
import fs from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = new URL(".", import.meta.url).pathname;

if (process.argv.length < 4) {
  console.error("사용: parse-trades <raw.txt|md> <out.json>");
  process.exit(1);
}

const [, , inF, outF] = process.argv;
const raw  = fs.readFileSync(resolve(process.cwd(), inF), "utf8");
const json = parseText(raw);
fs.writeFileSync(resolve(process.cwd(), outF), JSON.stringify(json, null, 2));
console.log(`✅ ${json.length}행 → ${outF}`);
