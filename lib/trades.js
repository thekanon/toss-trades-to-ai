// lib/trades.js – ES Module version (updated parseText)
// ------------------------------------------------------------
//  Shared helpers to parse Toss Securities raw statements and
//  build AI‑friendly compact summaries.

/* ──── utility helpers ───────────────────────────────────── */
export const num = (x) => (x == null ? null : Number(String(x).replace(/,/g, "")));
export const isNumber   = (s) => /^[\d,]+(\.\d+)?$/.test(s);
export const looksLikeFx = (s) => isNumber(s) && s.includes(".");
export const normDate = (d) => d.replace(/\./g, "-");
export const toMonth  = (d) => d.slice(0, 7);

/* ──── ① parse a single line ────────────────────────────── */
export function parseLine(line) {
  const p = line.trim().split(/\s+/);
  if (p.length < 4) return null;

  let i = 0;
  const 거래일자 = p[i++];
  const 거래구분 = p[i++];

  const name = [];
  while (i < p.length && !isNumber(p[i])) name.push(p[i++]);
  const 종목명 = name.join(" ");

  let 환율 = null, 거래수량, 단가, 거래대금;
  if (looksLikeFx(p[i])) {
    환율 = p[i++];
    거래수량 = p[i++];
    거래대금 = p[i++];
  } else {
    거래수량 = p[i++];
    단가 = p[i++];
    거래대금 = p[i++];
  }

  const [수수료, 거래세, 제세금, 변제_연체합, 잔고, 잔액] =
    Array.from({ length: 6 }, () => p[i++] ?? null);

  return { 거래일자, 거래구분, 종목명, 환율, 거래수량, 거래대금, 단가,
           수수료, 거래세, 제세금, 변제_연체합, 잔고, 잔액 };
}

/* ──── ② text → rows(json)  (헤더/줄바꿈 정리 포함) ─── */
export function parseText(raw) {
  const dateRe = /^202\d\.\d{2}\.\d{2}/;      // 거래 시작 패턴
  const merged = [];
  let buf = "";
  let started = false;                            // 첫 거래 시작 여부

  raw.split(/\r?\n/).forEach((ln) => {
    const l = ln.trim();
    if (!l) return;                     // 빈줄
    if (/^\(\$/.test(l)) return;      // ($ …) 달러 환산 줄 무시

    if (dateRe.test(l)) {
      // 날짜로 시작: 새 레코드 시작
      if (started && buf) merged.push(buf.trim());
      buf = l;
      started = true;
    } else if (!started) {
      // 거래 시작 전 헤더/푸터 라인은 무시
      return;
    } else {
      // 이미 레코드 시작된 이후: 이어붙일지 판단
      if (/거래일자\s+거래구분/.test(l)) return;      // 중간 헤더 라인 skip
      if (!/^[\[{\"]/.test(l)) buf += " " + l;      // 일반 continuation 줄
    }
  });
  if (started && buf) merged.push(buf.trim());

  // 안전: 날짜로 시작하는 줄만 파싱 대상으로 유지
  return merged
    .filter((line) => dateRe.test(line))
    .map(parseLine)
    .filter(Boolean);
}

/* ──── ③ compact summary (unchanged) ───────────────────── */
export function compact(records, target = "date", period = "day") {
  const trades = [];
  const others = [];

  const pickAmount = (r) =>
    ["거래대금", "잔액", "거래수량"].map((f) => num(r[f])).find((v) => v) ?? 0;

  for (const r of records) {
    const kind = r["거래구분"]?.trim();
    const date = normDate(r["거래일자"]);

    if (["구매", "매수", "매도"].includes(kind)) {
      const symbol = r["종목명"]?.trim();
      const qty = num(r["거래수량"]);
      let price = num(r["단가"]);
      let amount = num(r["거래대금"]);

      if (price && amount && qty && price > 10_000 && amount < price && Math.abs(price - amount * qty) <= 2) {
        [price, amount] = [amount, price];
      }
      if (!price && amount && qty) price = amount / qty;
      if (symbol && qty && price) trades.push({ date, symbol, qty, price, amount: price * qty });
    } else {
      let amt = pickAmount(r);
      if (kind.includes("출금")) amt *= -1;
      others.push({ date, kind, amount: amt });
    }
  }

  const out = { _schema: ["d", "s", "q", "avgP", "sum"], _currency: "KRW" };

  if (period === "day") {
    for (const t of trades) {
      const k = target === "symbol" ? t.symbol : t.date;
      const row = target === "symbol" ? [t.date, t.qty, Math.round(t.price)]
                                        : [t.symbol, t.qty, Math.round(t.price)];
      (out[k] ||= []).push(row);
    }
    out.OTHERS = others.map((o) => [o.date, o.kind, o.amount]);
    return out;
  }

  const agg = {};
  const add = (k1, k2, qty, sum) => {
    ((agg[k1] ||= {})[k2] ||= { q: 0, s: 0 });
    agg[k1][k2].q += qty;
    agg[k1][k2].s += sum;
  };
  for (const t of trades) {
    const m = toMonth(t.date);
    if (target === "symbol") add(t.symbol, m, t.qty, t.amount);
    else add(m, t.symbol, t.qty, t.amount);
  }
  for (const [k1, inner] of Object.entries(agg)) {
    out[k1] = Object.entries(inner).map(([k2, v]) => [k2, +v.q.toFixed(6), Math.round(v.s / v.q), Math.round(v.s)]);
  }

  const oth = {};
  others.forEach((o) => {
    const key = `${toMonth(o.date)}|${o.kind}`;
    oth[key] = (oth[key] || 0) + o.amount;
  });
  out.OTHERS = Object.entries(oth).map(([k, v]) => {
    const [m, kind] = k.split("|");
    return [m, kind, Math.round(v)];
  });

  return out;
}

export default { parseLine, parseText, compact };
