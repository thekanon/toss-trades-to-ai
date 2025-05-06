#!/usr/bin/env node
/* txt|md raw  또는  flattened rows(JSON) → 표준 거래 JSON (ESM) */
import fs from "fs";
import { resolve, extname } from "path";
import { parseText } from "../lib/trades.js";

function usage() {
  console.error("사용: parse-trades <input.(txt|md|json)> <output.json>");
  process.exit(1);
}

(function main() {
  const [, , inF, outF] = process.argv;
  if (!inF || !outF) usage();

  const data = fs.readFileSync(resolve(process.cwd(), inF), "utf8");
  const ext  = extname(inF);

  let records;
  if ([".txt", ".md"].includes(ext)) {
    // 원시 텍스트 → parseText(raw)
    records = parseText(data);
  } else {
    // JSON 입력: rows[] 또는 이미 objects[]
    const parsed = JSON.parse(data);
    records = Array.isArray(parsed) && typeof parsed[0] === "string"
      ? parseText(parsed)   // rows[]
      : parsed;             // objects[]
  }

  fs.writeFileSync(resolve(process.cwd(), outF), JSON.stringify(records, null, 2));
  console.log(`✅ ${records.length} records → ${outF}`);
})();