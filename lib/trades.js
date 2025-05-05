// lib/trades.js – Unified ES Module with enhanced parsing
// ------------------------------------------------------------
// 1. convertTransactionData(raw)   → raw multiline text → filtered row strings
// 2. parseText(rawOrRows)         → row strings → structured objects (domestic + overseas)
// 3. compact(records, …)          → records → summary JSON
//
// The new parseText uses the same parsing logic as transaction-to-json.js.
// ---------------------------------------------------------------------

/* ──── utility helpers ───────────────────────────────────── */
export const num = (x) => {
  if (x == null) return null;
  const n = Number(String(x).replace(/,/g, ""));
  return isNaN(n) ? null : n;
};

export const isNumber = (s) => /^[\d,]+(\.\d+)?$/.test(s);
export const looksLikeFx = (s) => isNumber(s) && s.includes(".");
export const normDate = (d) => d.replace(/\./g, "-");
export const toMonth = (d) => d.slice(0, 7);

/* ──── convertTransactionData ───────────────────────────── */
/**
 * Merge multiline statement text into single-line records and filter out
 * pagination / headers / corporate actions / interest‑only rows.
 * @param {string} raw Multiline text from Toss PDF → txt converter
 * @returns {string[]} array of flattened record strings
 */
export function convertTransactionData(raw) {
  const dateRe = /^\d{4}\.\d{2}\.\d{2}/;
  const lines = raw.split(/\r?\n/);

  let current = null;
  const rows = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pagination (e.g., "14 / 1514 / …")
    if (/^\d+\s*\/\s*\d+/.test(trimmed)) continue;
    if (trimmed.startsWith("거래일자 거래구분")) continue;       // repeated header
    if (trimmed.includes("발급일자")) continue;                // issuance/footer
    if (trimmed.startsWith("수량단위")) continue;              // unit line
    if (trimmed === "원화 거래내역" || trimmed === "달러 거래내역") continue;

    if (dateRe.test(trimmed)) {
      if (current) rows.push(current.trim());
      current = trimmed;
    } else if (current) {
      current += " " + trimmed;
    }
  }
  if (current) rows.push(current.trim());

  // Filter out corporate actions & interest entries
  return rows.filter((rec) => {
    const parts = rec.split(/\s+/);
    const type = parts[1];
    return !(/분할/.test(type) || type === "이자입금");
  });
}

/* ──── advanced row‑parsing logic (domestic vs overseas) ───────────── */
function isOverseasTransaction(row) {
  const fields = row.split(" ");
  return fields.length >= 23 && row.includes("$");
}

function parseDomesticRow(row) {
  const fields = row.split(" ");
  const tradeDate = fields[0];

  // 거래구분(이체출금(…)) 캡처
  let tradeTypeEnd = 1;
  let tradeType = fields[1];
  if (fields[1] && fields[1].includes("이체출금(")) {
    let tmp = fields[1];
    let idx = 2;
    while (!tmp.includes(")") && idx < fields.length) {
      tmp += " " + fields[idx++];
    }
    tradeType = tmp;
    tradeTypeEnd = idx - 1;
  }

  // 종목명 없을 수도 있음
  const typesWithoutStock = [
    "환전원화출금",
    "환전원화입금",
    "이체입금",
    "이자입금",
  ];

  let stockName = null;
  let exchangeRate = null;
  let idx = tradeTypeEnd + 1;

  if (!typesWithoutStock.some((t) => tradeType.startsWith(t))) {
    if (tradeType.startsWith("이체출금")) {
      stockName = fields[idx++];
    } else {
      const codeRe = /\([A-Z0-9]+\)$/;
      let temp = "";
      let found = false;
      for (let i = idx; i < fields.length; i++) {
        temp += (temp ? " " : "") + fields[i];
        if (codeRe.test(temp)) {
          stockName = temp;
          idx = i + 1;
          found = true;
          break;
        }
      }
      if (!found) {
        stockName = fields[idx++];
      }
    }
  }

  if (tradeType.includes("환전")) {
    stockName = fields[idx++];
    exchangeRate = fields[idx++];
  }

  return {
    거래일자: tradeDate,
    거래구분: tradeType,
    종목명: stockName,
    환율: exchangeRate,
    거래수량: fields[idx++],
    거래대금: fields[idx++],
    단가: fields[idx++],
    수수료: fields[idx++],
    거래세: fields[idx++],
    제세금: fields[idx++],
    변제_연체합: fields[idx++],
    잔고: fields[idx++],
    잔액: fields[idx],
  };
}

function parseOverseasRow(row) {
  const f = row.split(" ");
  const tradeDate = f[0];
  const tradeType = f[1];

  let stockName = null;
  let idx = 2;
  const exchangeTypes = ["환전외화입금", "환전외화출금"];
  if (!exchangeTypes.includes(tradeType)) {
    let temp = "";
    const codeEnd = /\)$/;
    for (let i = idx; i < f.length; i++) {
      temp += (temp ? " " : "") + f[i];
      if (codeEnd.test(temp) || /^[0-9,]+\.?[0-9]*$/.test(f[i])) {
        stockName = temp;
        idx = i + 1;
        break;
      }
    }
    if (!stockName) {
      stockName = f[idx++];
    }
  }

  const exchangeRate = f[idx++];
  const quantity = f[idx++];

  const readKRWUSD = () => {
    let krw = f[idx++];
    while (f[idx] && !f[idx].includes("$")) krw += " " + f[idx++];
    let usd = "";
    while (f[idx] && !f[idx].endsWith(")")) usd += " " + f[idx++];
    usd += " " + f[idx++];
    return krw + " " + usd.trim();
  };

  const amount = readKRWUSD();
  const price = readKRWUSD();

  const readFee = () => {
    let fee = f[idx++];
    if (f[idx] && f[idx].includes("$")) {
      let usd = "";
      while (f[idx] && !f[idx].endsWith(")")) usd += " " + f[idx++];
      usd += " " + f[idx++];
      fee += " " + usd.trim();
    }
    return fee;
  };

  const commission = readFee();
  const tax = readFee();
  const otherFee = readFee();

  const balance = f[idx++];
  const totalBalKRW = f[idx++];
  let totalBalUSD = "";
  while (f[idx] && !f[idx].endsWith(")")) totalBalUSD += " " + f[idx++];
  totalBalUSD += " " + f[idx];
  const totalBalance = totalBalKRW + " " + totalBalUSD.trim();

  return {
    거래일자: tradeDate,
    거래구분: tradeType,
    종목명: stockName,
    환율: exchangeRate,
    거래수량: quantity,
    거래대금: amount,
    단가: price,
    수수료: commission,
    제세금: tax,
    변제_연체합: otherFee,
    잔고: balance,
    잔액: totalBalance,
  };
}

function parseRow(row) {
  return isOverseasTransaction(row) ? parseOverseasRow(row) : parseDomesticRow(row);
}

/* ──── parseText (public API) ───────────────────────────── */
/**
 * Accepts either raw multiline text or an array of flattened rows.
 * Returns structured record objects by delegating to the new parsing logic.
 */
export function parseText(input) {
  const rows = Array.isArray(input) ? input : convertTransactionData(input);
  return rows.map(parseRow);
}

/* ──── compact summarizer (unchanged from previous commit) ─────────── */
export function compact(records, target = "date", period = "day") {
  const BUY = ["구매", "매수"];
  const SELL = ["판매", "매도"];

  const numKRW = (str) => {
    if (!str) return null;
    const main = String(str).split(/[ (]/)[0].replace(/,/g, "");
    return main ? +main : null;
  };
  const nDate = (d) => d.replace(/\./g, "-").replace(/-$/, "").padStart(10, "0");
  const mOf = (d) => nDate(d).slice(0, 7);

  const pickAmt = (r) => ["거래대금", "단가", "거래수량"].map((f) => numKRW(r[f])).find((v) => v != null) ?? 0;

  const trades = [];
  const others = [];
  let totalInv = 0;
  let lastBal = null;

  for (const r of records) {
    const kind = r["거래구분"]?.trim() ?? "";
    const date = nDate(r["거래일자"]);
    const symbol = r["종목명"]?.trim() ?? null;
    const qRaw = numKRW(r["거래수량"]);
    const pRaw = numKRW(r["단가"]);
    const aRaw = numKRW(r["거래대금"]);

    const isBuy = BUY.includes(kind);
    const isSell = SELL.includes(kind);

    if (isBuy || isSell) {
      let q = qRaw,
        p = pRaw,
        a = aRaw;
      if (p && a && q && Math.abs(p * q - a) > 1) p = a / q;
      if (!p && a && q) p = a / q;
      if (!a && p && q) a = p * q;
      if (!q && p && a) q = a / p;
      if (isSell) {
        q *= -1;
        a *= -1;
      }
      if (symbol && q && p) {
        trades.push({ date, symbol, qty: q, price: p, amount: a });
        if (isBuy) totalInv += a;
      }
    } else {
      let amt = pickAmt(r);
      if (/출금|출고/.test(kind)) amt *= -1;
      others.push({ date, kind, amount: amt });
    }
    const bal = numKRW(r["잔액"]);
    if (bal != null) lastBal = bal;
  }

  const out = {
    _schema: ["d", "s", "q", "avgP", "sum"],
    _currency: "KRW",
    _summary: {
      totalInvestment: totalInv,
      lastBalance: lastBal,
      estimatedProfit: lastBal != null ? lastBal - totalInv : null,
      estimatedProfitRate: lastBal != null ? ((lastBal - totalInv) / totalInv) * 100 : null,
    },
  };

  if (period === "day") {
    trades.forEach((t) => {
      const key = target === "symbol" ? t.symbol : t.date;
      const row = target === "symbol" ? [t.date, t.qty, Math.round(t.price)] : [t.symbol, t.qty, Math.round(t.price)];
      (out[key] ||= []).push(row);
    });
    out.OTHERS = others.map((o) => [o.date, o.kind, o.amount]);
    return out;
  }

  const agg = {};
  const add = (k1, k2, q, s) => {
    ((agg[k1] ||= {})[k2] ||= { q: 0, s: 0 });
    agg[k1][k2].q += q;
    agg[k1][k2].s += s;
  };
  trades.forEach((t) => {
    const m = mOf(t.date);
    if (target === "symbol") add(t.symbol, m, t.qty, t.amount);
    else add(m, t.symbol, t.qty, t.amount);
  });

  for (const [k1, inner] of Object.entries(agg)) {
    out[k1] = Object.entries(inner).map(([k2, v]) => [k2, +v.q.toFixed(6), Math.round(v.s / v.q), Math.round(v.s)]);
  }

  const oth = {};
  others.forEach((o) => {
    const key = `${mOf(o.date)}|${o.kind}`;
    oth[key] = (oth[key] || 0) + o.amount;
  });
  out.OTHERS = Object.entries(oth).map(([k, v]) => {
    const [m, kind] = k.split("|");
    return [m, kind, Math.round(v)];
  });

  return out;
}

/* ──── default export ─────────────────────────────────── */
export default {
  convertTransactionData,
  parseText,
  compact,
};
