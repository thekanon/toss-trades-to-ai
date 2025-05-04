#!/usr/bin/env node
/* eslint-disable no-console */
// bin/toss-trades.mjs – unified CLI (ESM) + interactive ctl‑run
// -------------------------------------------------------------
//  dependencies: commander, inquirer, chalk  (npm i commander inquirer chalk)
//  usage:
//    toss-trades parse   raw.md  -o parsed.json
//    toss-trades compact parsed.json -o compact.json -t symbol -p month
//    toss-trades ctl-run           # interactive pipeline

import { program } from "commander";
import inquirerPkg from "inquirer";
const inquirer = inquirerPkg.prompt ? inquirerPkg : inquirerPkg.default; // v8/v9 호환
import chalkPkg from "chalk";
const chalk = chalkPkg.default || chalkPkg;                               // ESM/CJS 호환
import fs from "fs";
import { fileURLToPath } from "url";
import { resolve, extname, basename, dirname } from "path";
import Trades from "../lib/trades.js";              // CJS default import
const { parseText, compact } = Trades;               // named helpers 추출

// __dirname/__filename for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ─── 공통 I/O ───────────────────────────────────────────────
const read  = (p) => fs.readFileSync(resolve(p), "utf8");
const write = (p, d) => fs.writeFileSync(resolve(p), d);

program
  .name("toss-trades")
  .description("토스증권 거래내역 → AI 가공 툴체인 (ESM edition)")
  .version("0.3.1");

/* ───────── parse ─────────────────────────────────────────── */
program
  .command("parse <input>")
  .option("-o, --out <file>", "output json", "parsed.json")
  .action((input, { out }) => {
    const rows = parseText(read(input));
    write(out, JSON.stringify(rows, null, 2));
    console.log(chalk.green(`✅ parsed ${rows.length} rows → ${out}`));
  });

/* ───────── compact ───────────────────────────────────────── */
program
  .command("compact <input>")
  .option("-o, --out <file>", "output", "compact.json")
  .option("-t, --target <type>", "date | symbol", "symbol")
  .option("-p, --period <unit>", "day | month", "month")
  .action((input, opts) => {
    const { target, period } = opts;
    if (!["date", "symbol"].includes(target) || !["day", "month"].includes(period)) {
      console.error("target: date|symbol , period: day|month");
      process.exit(1);
    }
    const raw = read(input);
    const records = [".txt", ".md"].includes(extname(input)) ? parseText(raw) : JSON.parse(raw);
    const outJson = compact(records, target, period);
    write(opts.out, JSON.stringify(outJson));
    console.log(chalk.green(`✅ compacted → ${opts.out}`));
  });

/* ───────── ctl-run (interactive) ─────────────────────────── */
program
  .command("ctl-run")
  .description("raws/ 선택 → parse+compact 파이프라인 실행 (interactive)")
  .action(async () => {
    const RAW_DIR    = resolve(__dirname, "../data/raws");
    const PARSED_DIR = resolve(__dirname, "../data/input");
    const OUT_DIR    = resolve(__dirname, "../output");

    const rawFiles = fs.readdirSync(RAW_DIR).filter((f) => [".txt", ".md"].includes(extname(f)));
    if (!rawFiles.length) {
      console.error(chalk.red("⚠️  data/raws/ 안에 *.txt 또는 *.md 파일이 없습니다."));
      process.exit(1);
    }

    const answers = await inquirer.prompt([
      { type: "list", name: "files",  message: "어떤 raw 파일을 처리할까요?",
        choices: ["<모두>", ...rawFiles], default: "<모두>" },
      { type: "list", name: "target", message: "집계 기준(target)을 선택하세요.",
        choices: ["symbol", "date"], default: "symbol" },
      { type: "list", name: "period", message: "집계 주기(period)를 선택하세요.",
        choices: ["month", "day"], default: "month" }
    ]);

    const filesToRun = answers.files === "<모두>" ? rawFiles : [answers.files];

    filesToRun.forEach((file) => {
      const base = basename(file, extname(file));

      // 1) parse
      const rows = parseText(read(resolve(RAW_DIR, file)));
      write(resolve(PARSED_DIR, `${base}.json`), JSON.stringify(rows, null, 2));

      // 2) compact
      const comp = compact(rows, answers.target, answers.period);
      write(resolve(OUT_DIR, `${base}.json`), JSON.stringify(comp));

      console.log(chalk.green(`✅ ${file} → output/${base}.json (${rows.length} rows)`));
    });
  });

program.parse();
