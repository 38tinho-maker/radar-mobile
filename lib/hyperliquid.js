// API pública da Hyperliquid (somente leitura, sem chave). POST https://api.hyperliquid.xyz/info
const URL_INFO = 'https://api.hyperliquid.xyz/info';
const TF_MS = { '1m': 60e3, '15m': 900e3, '1h': 3600e3, '4h': 4 * 3600e3, '1d': 86400e3, '1w': 7 * 86400e3 };

export class HLError extends Error { constructor(msg, code) { super(msg); this.code = code; } }

// Limite: 1200 de peso por minuto por IP. Mantemos folga (900) por contexto.
const WINDOW = 60000, BUDGET = 900;
const spent = [];
async function reserve(w, budget = BUDGET) {
  for (;;) {
    const now = Date.now();
    while (spent.length && now - spent[0].t > WINDOW) spent.shift();
    const used = spent.reduce((a, x) => a + x.w, 0);
    if (used + w <= budget || !spent.length) { spent.push({ t: now, w }); return; }
    await new Promise((r) => setTimeout(r, Math.min(5000, WINDOW - (now - spent[0].t) + 50)));
  }
}

// prioridade: conta e mercado passam na frente da varredura (usam a folga até 1150)
export async function info(body, weight = 20, priority = false) {
  await reserve(weight, priority ? 1150 : BUDGET);
  for (let attempt = 0; attempt < 3; attempt++) {
    let r;
    try {
      r = await fetch(URL_INFO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch { throw new HLError('Sem conexão com a Hyperliquid', 'net'); }
    if (r.status === 429) { await new Promise((res) => setTimeout(res, 4000 * (attempt + 1))); continue; }
    if (r.status >= 400 && r.status < 500) throw new HLError('Requisição inválida', 'invalid');
    if (!r.ok) throw new HLError('HTTP ' + r.status, 'http');
    return r.json();
  }
  throw new HLError('Limite de requisições da Hyperliquid', 'rate');
}

const toCandle = (k, ms) => ({ t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v, ct: k.t + ms - 1 });

// Últimos `limit` candles (inclui o em andamento).
export async function hlKlines(coin, tf, limit = 1000, priority = false) {
  const ms = TF_MS[tf];
  const end = Date.now();
  const data = await info({ type: 'candleSnapshot', req: { coin, interval: tf, startTime: end - (limit + 1) * ms, endTime: end } }, 20 + Math.ceil(limit / 60), priority);
  if (!Array.isArray(data)) throw new HLError('Resposta inesperada', 'invalid');
  if (!data.length) throw new HLError(`${coin} sem candles`, 'invalid');
  return data.map((k) => toCandle(k, ms)).slice(-limit);
}

// Histórico (a Hyperliquid guarda só os 5000 candles mais recentes). Só fechados.
export async function hlHistory(coin, tf, startMs) {
  const ms = TF_MS[tf];
  const out = [];
  let start = Math.max(startMs, Date.now() - 5000 * ms);
  for (let guard = 0; guard < 4; guard++) {
    const data = await info({ type: 'candleSnapshot', req: { coin, interval: tf, startTime: start, endTime: Date.now() } }, 20 + 84);
    if (!Array.isArray(data) || !data.length) break;
    for (const k of data) if (!out.length || k.t > out[out.length - 1].t) out.push(toCandle(k, ms));
    const lastT = data[data.length - 1].t;
    if (data.length < 4900 || lastT + ms > Date.now()) break;
    start = lastT + 1;
  }
  return out.filter((c) => c.ct < Date.now());
}

// Universo + contexto de mercado (preço, funding/h, open interest, volume). Uma chamada por corretora.
// dexes: perps HIP-3 (outras corretoras dentro da Hyperliquid, ex.: "xyz" → "xyz:GOLD"), só as pedidas.
function addMarket(map, meta, ctxs, dex) {
  (meta?.universe || []).forEach((u, i) => {
    const c = ctxs?.[i] || {};
    const name = !dex || String(u.name).includes(':') ? u.name : `${dex}:${u.name}`; // a API já manda "xyz:GOLD"; nunca prefixa duas vezes
    map[name] = {
      coin: name, dex: dex || null, maxLev: u.maxLeverage, szDec: u.szDecimals, delisted: !!u.isDelisted,
      price: +(c.midPx ?? c.markPx), mark: +c.markPx, funding: +c.funding, oi: +c.openInterest,
      vol: +c.dayNtlVlm, prevDay: +c.prevDayPx,
    };
  });
}
export async function hlMarket(dexes = [], { base = true } = {}) {
  const map = {};
  if (base) { const [meta, ctxs] = await info({ type: 'metaAndAssetCtxs' }, 20, true); addMarket(map, meta, ctxs, null); }
  for (const d of [...new Set(dexes || [])].filter(Boolean)) {
    try { const [meta, ctxs] = await info({ type: 'metaAndAssetCtxs', dex: d }, 20, true); addMarket(map, meta, ctxs, d); } catch { /* corretora fora do ar: segue sem ela */ }
  }
  return map;
}
// corretoras HIP-3 que existem (lista guardada por 6 h)
let DEX = null;
export async function hlDexes() {
  if (DEX && Date.now() - DEX.ts < 6 * 3600e3) return DEX.list;
  try {
    const r = await info({ type: 'perpDexs' }, 20, true);
    DEX = { ts: Date.now(), list: (Array.isArray(r) ? r : []).filter(Boolean).map((d) => d.name).filter(Boolean) };
  } catch { DEX = { ts: Date.now() - 5.5 * 3600e3, list: DEX?.list || [] }; } // tenta de novo em 30 min
  return DEX.list;
}
export const dexOf = (coin) => (String(coin || '').includes(':') ? String(coin).split(':')[0] : null);
export function topByVolume(market, n = 25) {
  return Object.values(market).filter((m) => !m.delisted && !m.dex && m.vol > 0).sort((a, b) => b.vol - a.vol).slice(0, n).map((m) => m.coin);
}

// ----- Conta (pelo endereço, somente leitura) -----
// posições: a corretora principal + cada corretora HIP-3 (ex.: xyz:GOLD); soma o valor da conta e a margem
const pre = (coin, d) => (String(coin).includes(':') ? coin : `${d}:${coin}`);
const ORD = { full: 0, used: new Set() };
export async function hlState(user) {
  const base = await info({ type: 'clearinghouseState', user }, 2, true);
  let dexes = [];
  try { dexes = await hlDexes(); } catch { /* só a principal */ }
  const extra = await Promise.all(dexes.map((d) => info({ type: 'clearinghouseState', user, dex: d }, 2, true).then((r) => ({ d, r })).catch(() => null)));
  const ms = { ...(base.marginSummary || {}) };
  base.assetPositions = [...(base.assetPositions || [])];
  for (const x of extra) {
    if (!x?.r) continue;
    const aps = (x.r.assetPositions || []).filter((ap) => Math.abs(+ap.position?.szi || 0) > 0);
    if (aps.length) ORD.used.add(x.d);
    for (const ap of aps) base.assetPositions.push({ ...ap, position: { ...ap.position, coin: pre(ap.position.coin, x.d) } });
    const m = x.r.marginSummary || {};
    for (const k of ['accountValue', 'totalMarginUsed', 'totalNtlPos', 'totalRawUsd']) if (m[k] != null) ms[k] = String((+ms[k] || 0) + (+m[k] || 0));
  }
  base.marginSummary = ms;
  return base;
}
// ordens abertas: principal + corretoras HIP-3 (as que você usa a cada rodada; todas a cada 10 min)
export async function hlOpenOrders(user) {
  const base = await info({ type: 'frontendOpenOrders', user }, 20, true);
  let dexes = [];
  try { dexes = await hlDexes(); } catch { /* só a principal */ }
  const full = Date.now() - ORD.full > 10 * 60e3;
  if (full) ORD.full = Date.now();
  const ask = full ? dexes : dexes.filter((d) => ORD.used.has(d));
  const extra = await Promise.all(ask.map((d) => info({ type: 'frontendOpenOrders', user, dex: d }, 20, true).then((r) => ({ d, r })).catch(() => ({ d, r: null }))));
  const out = [...(base || [])];
  for (const { d, r } of extra) {
    if (!Array.isArray(r)) continue;
    if (r.length) ORD.used.add(d);
    const fix = (o) => ({ ...o, coin: pre(o.coin, d), ...(o.children?.length ? { children: o.children.map(fix) } : {}) });
    out.push(...r.map(fix));
  }
  return out;
}
// histórico de ordens (as 2000 mais recentes: criadas, canceladas, executadas), com hora de criação e de fim
export const hlHistOrders = (user) => info({ type: 'historicalOrders', user }, 20, true);
export const hlFees = (user) => info({ type: 'userFees', user }, 20, true);

export async function hlFills(user, startTime) {
  const out = [];
  let start = startTime;
  for (let guard = 0; guard < 6; guard++) {
    const data = await info({ type: 'userFillsByTime', user, startTime: start, aggregateByTime: true }, 20 + 100, true);
    if (!Array.isArray(data) || !data.length) break;
    out.push(...data);
    if (data.length < 2000) break;
    start = Math.max(...data.map((f) => f.time)) + 1;
  }
  const seen = new Set();
  return out.filter((f) => { const k = f.tid + '|' + f.time; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.time - b.time);
}

export async function hlFunding(user, startTime) {
  const out = [];
  let start = startTime;
  for (let guard = 0; guard < 6; guard++) {
    const data = await info({ type: 'userFunding', user, startTime: start }, 20 + 25, true);
    if (!Array.isArray(data) || !data.length) break;
    out.push(...data);
    if (data.length < 500) break;
    start = Math.max(...data.map((f) => f.time)) + 1;
  }
  return out;
}

export const isAddress = (a) => /^0x[0-9a-fA-F]{40}$/.test(String(a || '').trim());
