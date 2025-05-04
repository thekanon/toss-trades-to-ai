#!/usr/bin/env node
/* txt|md 원시 파일 → 거래 JSON 배열 (ESM) */

import fs from "fs";
import { resolve } from "path";
import { parseText } from "../lib/trades.js";

function usage() {
  console.error("사용: parse-trades <input.txt|md> <output.json>");
  process.exit(1);
}

(function main() {
  const [, , inF, outF] = process.argv;
  if (!inF || !outF) usage();

  // 1️⃣ 원본 읽기
  const raw = fs.readFileSync(resolve(process.cwd(), inF), "utf8");

  // 2️⃣ 파싱
  const json = parseText(raw);

  // 3️⃣ 저장
  fs.writeFileSync(resolve(process.cwd(), outF), JSON.stringify(json, null, 2));
  console.log(`✅ ${json.length}행 → ${outF}`);
})();