#!/usr/bin/env node
/**
node compactTrades.js input/2021-2022.json output/2021-2022.json symbol month
node compactTrades.js input/2022-2023.json output/2022-2023.json symbol month
node compactTrades.js input/2023-2024.json output/2023-2024.json symbol month
node compactTrades.js input/2024-2025.json output/2024-2025.json symbol month
 */
/* 거래 JSON → 요약(compact) JSON
   txt/md 입력이면 자동 parseText → compact 까지 */

import fs from "fs";
import { resolve, extname } from "path";
import { fileURLToPath } from "url";
import { parseText, compact } from "../lib/trades.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = new URL(".", import.meta.url).pathname;

function usage() {
  console.error("사용: compact-trades <in.(json|txt|md)> <out.json> [date|symbol] [day|month]");
  process.exit(1);
}

(function main() {
  const [, , inF, outF, target = "date", period = "day"] = process.argv;
  if (!inF || !outF) usage();
  if (!["date", "symbol"].includes(target) ||
      !["day", "month"].includes(period))  usage();

  const raw = fs.readFileSync(resolve(__dirname, "..", inF), "utf8");
  const records =
    [".txt", ".md"].includes(extname(inF)) ? parseText(raw) : JSON.parse(raw);

  const outJson = compact(records, target, period);

  fs.writeFileSync(resolve(__dirname, "..", outF), JSON.stringify(outJson));
  console.log(`✅ ${inF} → ${outF} (target=${target}, period=${period})`);
})();
