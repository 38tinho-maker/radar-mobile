// Trades finalizados: como terminou (TP, TP · PARCIAIS, STOP, MANUAL) e a barra "congelada" no ponto de saída.
// Puro (sem chrome): usado pela Carteira e pelo Radar Mobile.
import { partsOf, partPl } from './partials.js';

const ok = (v) => v != null && isFinite(v) && v > 0;

// kind: 'tp' | 'sl' | 'man' | 'unk' (sem TP/SL conhecidos: não dá para dizer como saiu)
export function finKind(t) {
  const sl = (t.source === 'hl' ? t.sl : t.stop) ?? null, tp = (t.source === 'hl' ? t.tp : t.target) ?? null;
  const wins = exitsOf(t).filter((p) => sgn(t) * (p.px - t.entry) > 0).length;
  if (t.closeReason === 'stop') return { k: 'sl', label: 'STOP' };
  if (t.closeReason === 'alvo') return { k: 'tp', label: wins > 1 ? 'TP · PARCIAIS' : 'TP' };
  if (!ok(sl) && !ok(tp) && !(t.tps || []).length) return { k: 'unk', label: 'ENCERRADO' };
  return { k: 'man', label: 'MANUAL' };
}

const sgn = (t) => (t.dir === 'baixa' ? -1 : 1);
// saídas em ordem (trade sem parciais: uma saída só, com o resultado do trade)
function exitsOf(t) {
  const p = partsOf(t);
  if (p.length) return [...p].sort((a, b) => a.time - b.time);
  return ok(t.exit) ? [{ px: t.exit, sz: t.qty, time: t.closedAt, pnl: t.realized ?? null }] : [];
}

export const finResult = (t) => t.realized ?? (partsOf(t).length ? partsOf(t).reduce((a, p) => a + partPl(t, p), 0) : sgn(t) * (t.exit - t.entry) * t.qty);

// Modelo da barra: segmentos verdes (TPs que saíram ✓ e os planejados que não bateram), perda/risco no vermelho
export function finModel(t) {
  const s = sgn(t), orig = t.qty || 0;
  const sl = (t.source === 'hl' ? t.sl : t.stop) ?? null;
  const ex = exitsOf(t);
  const wins = ex.filter((p) => s * (p.px - t.entry) > 0);
  const losses = ex.filter((p) => s * (p.px - t.entry) <= 0);
  const segs = wins.map((p) => ({ w: orig ? p.sz / orig : 0, px: p.px, done: true, net: partPl(t, p) }));
  // TPs planejados que não chegaram a bater (além do último que saiu)
  const far = wins.length ? Math.max(...wins.map((p) => s * p.px)) : -Infinity;
  let plan = t.source === 'hl'
    ? (t.tps || []).map((x) => ({ px: x.px, sz: x.sz || 0 }))
    : (t.tps || []).map((x) => ({ px: x.px, sz: ((x.pct || 0) / 100) * orig }));
  const tp = (t.source === 'hl' ? t.tp : t.target) ?? null;
  if (!plan.length && ok(tp)) plan = [{ px: tp, sz: 0 }];
  plan = plan.filter((x) => ok(x.px) && s * x.px > far).sort((a, b) => s * (a.px - b.px));
  let left = Math.max(0, orig - wins.reduce((a, p) => a + p.sz, 0));
  plan.forEach((x, i) => { const sz = i === plan.length - 1 ? left : Math.min(x.sz || left, left); left -= sz; x.sz = sz; });
  for (const x of plan) if (x.sz > 1e-12) segs.push({ w: orig ? x.sz / orig : 0, px: x.px, done: false, net: s * (x.px - t.entry) * x.sz });
  const lossNet = losses.length ? losses.reduce((a, p) => a + partPl(t, p), 0) : null;
  const risk = ok(sl) ? -Math.abs(sl - t.entry) * orig : null;
  const last = ex[ex.length - 1] || null;
  return {
    sl: ok(sl) ? sl : null, segs, lossNet, risk,
    exitPx: last?.px ?? t.exit, win: finResult(t) >= 0,
    // a marca de saída segue o lado em que saiu (stop depois de um TP: ✕ mesmo com o total positivo)
    exitWin: s * ((last?.px ?? t.exit) - t.entry) > 0,
    lastPx: segs.length ? segs[segs.length - 1].px : null,
    nDone: wins.length, nAll: segs.length,
  };
}

// posição (0–1) de um preço na barra: vermelho = [0, red], verde repartido pelos segmentos
export function finPosAt(t, M, red) {
  const s = sgn(t), tot = M.segs.reduce((a, g) => a + g.w, 0) || 1;
  return (q) => {
    const d = s * (q - t.entry);
    if (d <= 0) return M.sl ? red * (1 - Math.min(1, -d / Math.abs(t.entry - M.sl))) : red;
    let x = red, prev = t.entry;
    for (const g of M.segs) {
      const gw = (1 - red) * g.w / tot;
      const span = s * (g.px - prev), k = span > 0 ? (s * (q - prev)) / span : 1;
      if (k >= 1) { x += gw; prev = g.px; continue; }
      return Math.min(1, x + gw * Math.max(0, k));
    }
    return Math.min(1, x);
  };
}

// o que aparece em Finalizados: fechou depois de "since" e não foi dispensado
export function finList(closed, view) {
  const hid = new Set(view?.hidden || []);
  return closed.filter((t) => t.closedAt && t.closedAt >= (view?.since || 0) && !hid.has(t.id) && !t.preWindow).sort((a, b) => b.closedAt - a.closedAt);
}
