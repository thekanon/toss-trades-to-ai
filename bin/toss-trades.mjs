#!/usr/bin/env node
/* eslint-disable no-console */
// bin/toss-trades.mjs – unified CLI (ESM) + interactive ctl‑run
// -------------------------------------------------------------
// deps:  commander, inquirer, chalk  (npm i commander inquirer chalk)
// usage:
//   toss-trades flatten raw.md                  -o flattened.json
//   toss-trades parse   flattened.json|raw.md   -o parsed.json
//   toss-trades compact parsed.json             -o compact.json -t symbol -p month
//   toss-trades ctl-run                         # interactive pipeline

import { program } from "commander";
import inquirerPkg from "inquirer";
const inquirer = inquirerPkg.prompt ? inquirerPkg : inquirerPkg.default;
import chalkPkg from "chalk";
const chalk = chalkPkg.default || chalkPkg;
import fs from "fs";
import { fileURLToPath } from "url";
import { resolve, extname, basename, dirname } from "path";

import {
  convertTransactionData,
  parseText,
  compact,
} from "../lib/trades.js";

// __dirname/__filename for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// I/O helpers
const read = (p) => fs.readFileSync(resolve(p), "utf8");
const write = (p, d) => fs.writeFileSync(resolve(p), d);

program
  .name("toss-trades")
  .description("토스증권 거래내역 → AI 가공 툴체인 (ESM edition)")
  .version("0.4.0");

/* ───────── flatten (raw → rows[]) ───────────────────────── */
program
  .command("flatten <input>")
  .option("-o, --out <file>", "output json", "flattened.json")
  .action((input, { out }) => {
    const rows = convertTransactionData(read(input));
    write(out, JSON.stringify(rows, null, 2));
    console.log(chalk.green(`✅ flattened ${rows.length} rows → ${out}`));
  });

/* ───────── parse (rows|raw → objects[]) ─────────────────── */
program
  .command("parse <input>")
  .option("-o, --out <file>", "output json", "parsed.json")
  .action((input, { out }) => {
    const ext = extname(input);
    let objects;

    if ([".txt", ".md"].includes(ext)) {
      // raw 파일 → 직접 파싱
      objects = parseText(read(input));
    } else {
      // JSON 입력: rows(JSON string) 또는 raw‑objects(JSON)
      const data = JSON.parse(read(input));
      objects = Array.isArray(data) && typeof data[0] === "string"
        ? parseText(data)   // rows[]
        : data;            // 이미 object[]
    }

    write(out, JSON.stringify(objects, null, 2));
    console.log(chalk.green(`✅ parsed ${objects.length} records → ${out}`));
  });

/* ───────── compact ──────────────────────────────────────── */
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

    const ext = extname(input);
    const records =
      [".txt", ".md"].includes(ext)
        ? parseText(read(input))                // raw
        : JSON.parse(read(input));              // already objects

    const summary = compact(records, target, period);
    write(opts.out, JSON.stringify(summary));
    console.log(chalk.green(`✅ compacted → ${opts.out}`));
  });

/* ───────── ctl-run (interactive pipeline) ───────────────── */
program
  .command("ctl-run")
  .description("raws/ 선택 → flatten+parse+compact 파이프라인 실행 (interactive)")
  .action(async () => {
    const RAW_DIR = resolve(__dirname, "../data/raws");
    const PARSED_DIR = resolve(__dirname, "../data/input");
    const OUT_DIR = resolve(__dirname, "../output");

    const rawFiles = fs
      .readdirSync(RAW_DIR)
      .filter((f) => [".txt", ".md"].includes(extname(f)));

    if (!rawFiles.length) {
      console.error(chalk.red("⚠️  data/raws/ 안에 *.txt 또는 *.md 파일이 없습니다."));
      process.exit(1);
    }

    const { files, target, period } = await inquirer.prompt([
      {
        type: "list",
        name: "files",
        message: "어떤 raw 파일을 처리할까요?",
        choices: ["<모두>", ...rawFiles],
        default: "<모두>",
      },
      {
        type: "list",
        name: "target",
        message: "집계 기준(target)을 선택하세요.",
        choices: ["symbol", "date"],
        default: "symbol",
      },
      {
        type: "list",
        name: "period",
        message: "집계 주기(period)를 선택하세요.",
        choices: ["month", "day"],
        default: "month",
      },
    ]);

    const batch = files === "<모두>" ? rawFiles : [files];

    batch.forEach((file) => {
      const base = basename(file, extname(file));

      // 1) flatten
      const rows = convertTransactionData(read(resolve(RAW_DIR, file)));
      write(resolve(PARSED_DIR, `${base}.rows.json`), JSON.stringify(rows, null, 2));

      // 2) parse
      const objs = parseText(rows);
      write(resolve(PARSED_DIR, `${base}.json`), JSON.stringify(objs, null, 2));

      // 3) compact
      const comp = compact(objs, target, period);
      write(resolve(OUT_DIR, `${base}.summary.json`), JSON.stringify(comp));

      console.log(chalk.green(`✅ ${file} → ${base}.summary.json (${objs.length} records)`));
    });
  });

program.parse();
