// Máxima e mínima desde a entrada, pelos candles da Hyperliquid (não depende do app estar aberto).
// A Hyperliquid só entrega as ~5000 velas mais recentes de cada tempo gráfico, então a vela
// é a menor que cobre o período: 1m (~3 dias), 5m (~17 dias), 15m (~52 dias), 1h, 4h.
// Guarda por trade e, a cada atualização, busca só as velas novas.
import { info } from './hyperliquid.js';

const MS = { '1m': 60e3, '5m': 300e3, '15m': 900e3, '1h': 3600e3, '4h': 14400e3 };
const ORDER = ['1m', '5m', '15m', '1h', '4h'];
const MAXN = 4800;
const avail = (tf, from, now = Date.now()) => now - from <= MAXN * MS[tf];
const tfFor = (from, now) => ORDER.find((tf) => avail(tf, from, now)) || '4h';

async function candles(coin, tf, start, end) {
  const n = Math.ceil((end - start) / MS[tf]) + 1;
  const d = await info({ type: 'candleSnapshot', req: { coin, interval: tf, startTime: start, endTime: end } }, 20 + Math.ceil(n / 60), true);
  return Array.isArray(d) ? d.map((k) => ({ t: k.t, h: +k.h, l: +k.l })).filter((k) => isFinite(k.h) && isFinite(k.l)) : [];
}
function fold(e, list) {
  for (const k of list) {
    if (e.hi == null || k.h > e.hi) e.hi = k.h;
    if (e.lo == null || k.l < e.lo) e.lo = k.l;
  }
}

// e = { since, tf, hi, lo, from } — from = início da última vela lida
// (é relida na próxima vez, pois podia estar em andamento). A vela da entrada começa um pouco
// antes dela; por isso a vela é sempre a menor disponível para o período.
export async function updateExt(prev, coin, since, now = Date.now()) {
  const e = prev && prev.since === since && prev.tf ? { ...prev } : { since, tf: tfFor(since, now), hi: null, lo: null, from: since };
  // parado há muito tempo: as velas desse tamanho já não cobrem o buraco → sobe para uma maior
  if (!avail(e.tf, e.from, now)) e.tf = tfFor(e.from, now);
  const ms = MS[e.tf];
  const start = Math.floor(e.from / ms) * ms;
  if (start < now) {
    const list = (await candles(coin, e.tf, start, now)).filter((k) => k.t >= start);
    fold(e, list);
    if (list.length) e.from = Math.max(e.from, list[list.length - 1].t);
  }
  return e;
}

// Posição do melhor e do pior preço em relação à entrada (null se nunca foi para aquele lado)
export function bestWorst(e, t, price) {
  if (!e || e.hi == null || e.lo == null) return null;
  let hi = e.hi, lo = e.lo;
  if (price != null && isFinite(price)) { hi = Math.max(hi, price); lo = Math.min(lo, price); }
  const long = t.dir !== 'baixa';
  const best = long ? hi : lo, worst = long ? lo : hi;
  const s = long ? 1 : -1;
  return { best: s * (best - t.entry) > 0 ? best : null, worst: s * (worst - t.entry) < 0 ? worst : null };
}

// Guarda por trade, com intervalo mínimo entre buscas. io = { load: async () => obj, save: async (obj) => {} }
export function extStore(io, gap = 60e3) {
  let map = null;
  const busy = new Set();
  return {
    async init() { if (!map) { try { map = (await io.load()) || {}; } catch { map = {}; } } return this; },
    get(id) { return map?.[id] || null; },
    // list: [{ id, coin, since }] = todas as posições abertas (as que saíram da lista são apagadas)
    async refresh(list, onChange) {
      await this.init();
      let changed = false;
      const now = Date.now();
      await Promise.all(list.map(async (x) => {
        const e = map[x.id];
        if (!x.coin || !x.since || busy.has(x.id)) return;
        if (e && e.since === x.since && now - (e.at || 0) < gap) return;
        busy.add(x.id);
        try { const n = await updateExt(e, x.coin, x.since); n.at = Date.now(); map[x.id] = n; changed = true; } catch { /* tenta de novo na próxima */ } finally { busy.delete(x.id); }
      }));
      const ids = new Set(list.map((x) => x.id));
      for (const k of Object.keys(map)) if (!ids.has(k)) { delete map[k]; changed = true; }
      if (changed) { try { await io.save(map); } catch { /* só na memória */ } onChange?.(); }
    },
  };
}

// Depois de mexer no SL a faixa recomeça: guarda o SL de cada posição e quando ele mudou.
// memo = { id: { sl, at } } · marca t.slAt nas posições abertas (null = SL nunca mudou desde que acompanhamos)
export function trackSl(memo, trades, now = Date.now()) {
  const open = trades.filter((t) => t.status === 'open');
  for (const t of open) {
    const sl = t.sl ?? null, m = memo[t.id];
    if (!m) memo[t.id] = { sl, at: null };
    else if (m.sl !== sl) { m.sl = sl; m.at = now; }
    t.slAt = memo[t.id].at;
  }
  const ids = new Set(open.map((t) => t.id));
  for (const k of Object.keys(memo)) if (!ids.has(k)) delete memo[k];
  return memo;
}
// Faixa desde a mudança do SL: até onde voltou em direção ao SL (adv) e até onde foi a favor (fav)
export function sinceSl(e, t, price) {
  if (!e || e.hi == null || e.lo == null) return price != null ? { adv: price, fav: price } : null;
  let hi = e.hi, lo = e.lo;
  if (price != null && isFinite(price)) { hi = Math.max(hi, price); lo = Math.min(lo, price); }
  return t.dir !== 'baixa' ? { adv: lo, fav: hi } : { adv: hi, fav: lo };
}
