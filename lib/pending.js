// Ordens que ainda não executaram (limites de entrada ou de aumento) e o "plano" se executarem:
// preço médio, risco no SL, ganho no TP e R/R. Puro: usado pela Carteira e pelo gráfico.

// abertas + filhas (SL/TP colocados junto com a ordem de entrada), sem repetir
function flat(orders) {
  const out = [], seen = new Set();
  const add = (o, parent) => { if (!o || seen.has(o.oid)) return; seen.add(o.oid); out.push(parent ? { ...o, child: true } : o); for (const k of o.children || []) add(k, o); };
  for (const o of orders || []) add(o, null);
  return out;
}
const isTp = (o) => /take profit/i.test(String(o.type || ''));
const isSl = (o) => /stop/i.test(String(o.type || ''));

// pos: posição aberta do ativo { dir, qty, entry, sl, tps:[{px}] } ou null
export function pendingPlan({ coin, orders, pos = null, price = null, rate = 0.00045 }) {
  const os = flat(orders).filter((o) => o.coin === coin);
  if (!os.length) return null;
  const entries = os.filter((o) => !o.child && !o.reduce && !o.tpsl && !(o.trig && (isTp(o) || isSl(o)) && o.reduce));
  let side;
  if (pos) side = pos.dir === 'baixa' ? 'A' : 'B';
  else {
    const b = entries.filter((o) => o.side === 'B').reduce((a, o) => a + o.sz, 0), a = entries.filter((o) => o.side === 'A').reduce((x, o) => x + o.sz, 0);
    side = b >= a ? 'B' : 'A';
  }
  const s = side === 'B' ? 1 : -1;
  const lims = entries.filter((o) => o.side === side && o.sz > 0).map((o) => ({ px: o.trig || o.px, sz: o.sz, oid: o.oid, stop: !!o.trig }));
  // SL/TP: da posição (se houver) ou das ordens de saída (soltas ou filhas da entrada)
  const exits = os.filter((o) => o.side !== side && (o.reduce || o.tpsl || o.child) && (o.trig || o.child));
  const slO = exits.filter(isSl).map((o) => o.trig || o.px), tpO = exits.filter(isTp).map((o) => o.trig || o.px)
    .concat(os.filter((o) => o.side !== side && !o.trig && o.reduce).map((o) => o.px));
  const sl = pos ? pos.sl ?? null : slO.length ? (s > 0 ? Math.max(...slO) : Math.min(...slO)) : null;
  const tps = pos ? (pos.tps || []).map((x) => x.px) : [...new Set(tpO)].sort((a, b) => s * (a - b));
  const tp = tps.length ? tps[tps.length - 1] : pos?.tp ?? null;
  // com posição aberta: limite além do SL não é aumento — o SL fecha a posição antes; se ela executar depois,
  // abre uma posição nova sem SL/TP. Fica fora das contas de aumento e vai em `beyond`.
  const beyond = [];
  if (pos && sl != null) for (let i = lims.length - 1; i >= 0; i--) if (s * (lims[i].px - sl) < 0) beyond.push(...lims.splice(i, 1));
  beyond.sort((a, b) => s * (b.px - a.px)); // na ordem em que o preço chega
  let bq = 0, bn = 0;
  const after2 = beyond.map((x) => { bq += x.sz; bn += x.sz * x.px; return { px: x.px, sz: x.sz, qty: bq, avg: bn / bq }; });
  if (!lims.length && !beyond.length && pos) return null; // posição sem limite de aumento: nada a projetar
  const q0 = pos?.qty || 0, e0 = pos?.entry || 0;
  const lq = lims.reduce((a, x) => a + x.sz, 0), ln = lims.reduce((a, x) => a + x.sz * x.px, 0);
  const qty = q0 + lq, avg = qty ? (q0 * e0 + ln) / qty : null;
  const fees = (q, e, x) => q * (e + x) * rate;
  const at = (q, e) => ({
    risk: sl != null && q ? s * (e - sl) * q + fees(q, e, sl) : null, // > 0 = perde; < 0 = trava lucro
    gain: tp != null && q ? s * (tp - e) * q - fees(q, e, tp) : null,
  });
  const after = { qty, avg, ...at(qty, avg) };
  after.rr = after.risk > 0 && after.gain > 0 ? after.gain / after.risk : null;
  const before = pos ? { qty: q0, avg: e0, ...at(q0, e0) } : null;
  if (before) before.rr = before.risk > 0 && before.gain > 0 ? before.gain / before.risk : null;
  // a limite mais perto do preço (a primeira a executar) e quanto falta
  const byNear = [...lims].sort((a, b) => (price ? Math.abs(a.px - price) - Math.abs(b.px - price) : 0));
  const first = byNear[0] || null;
  const dist = first && price ? Math.abs(first.px - price) / price : null;
  // degraus: como fica depois da 1ª, depois das 2… (na ordem em que o preço chega nelas)
  const steps = []; let sq = q0, sn = q0 * e0;
  for (const x of [...lims].sort((a, b) => (price ? Math.abs(a.px - price) - Math.abs(b.px - price) : s * (b.px - a.px)))) {
    sq += x.sz; sn += x.sz * x.px;
    const avg = sn / sq; steps.push({ px: x.px, sz: x.sz, qty: sq, avg, ...at(sq, avg) });
  }
  lims.sort((a, b) => s * (a.px - b.px));
  return { coin, side, steps, beyond: after2, dir: s > 0 ? 'alta' : 'baixa', lims, sl, tp, tps, slFromOrders: !pos && slO.length > 0, before, after, first, dist, nOrders: os.length, pos: !!pos };
}

// ativos com ordem aberta e sem posição
export function waitingCoins(orders, openCoins) {
  const set = new Set(openCoins);
  return [...new Set(flat(orders).map((o) => o.coin))].filter((c) => !set.has(c));
}
