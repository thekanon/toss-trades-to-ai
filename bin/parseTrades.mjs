#!/usr/bin/env node
/* txt|md 원시 파일 → 거래 JSON 배열 */

import fs from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { parseText } from "../lib/trades.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = new URL(".", import.meta.url).pathname;

function usage() {
  console.error("사용: parse-trades <input.txt|md> <output.json>");
  process.exit(1);
}

(function main() {
  const [, , inF, outF] = process.argv;
  if (!inF || !outF) usage();

  const raw  = fs.readFileSync(resolve(process.cwd(), inF), "utf8");
  const json = parseText(raw);

  fs.writeFileSync(resolve(process.cwd(), outF), JSON.stringify(json, null, 2));

  console.log(`✅ ${json.length}행 → ${outF}`);
})();
