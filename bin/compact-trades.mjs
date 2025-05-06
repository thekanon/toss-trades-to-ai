#!/usr/bin/env node
/* 거래 JSON | rows | raw → 요약(compact) JSON (ESM) */
import fs from "fs";
import { resolve, extname } from "path";
import { parseText, compact } from "../lib/trades.js";

function usage() {
  console.error("사용: compact-trades <input.(json|txt|md)> <output.json> [date|symbol] [day|month]");
  process.exit(1);
}

(function main() {
  const [, , inF, outF, target = "symbol", period = "month"] = process.argv;
  if (!inF || !outF) usage();
  if (!["date", "symbol"].includes(target) || !["day", "month"].includes(period)) usage();

  const raw = fs.readFileSync(resolve(process.cwd(), inF), "utf8");
  const ext = extname(inF);

  let records;
  if ([".txt", ".md"].includes(ext)) {
    records = parseText(raw);
  } else {
    const parsed = JSON.parse(raw);
    records = Array.isArray(parsed) && typeof parsed[0] === "string" ? parseText(parsed) : parsed;
  }

  const summary = compact(records, target, period);
  fs.writeFileSync(resolve(process.cwd(), outF), JSON.stringify(summary, null, 2));
  console.log(`✅ ${inF} → ${outF} (target=${target}, period=${period})`);
})();
