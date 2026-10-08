// SL móvel sugerido: último fundo (compra) ou topo (venda) confirmado, com folga de ½ ATR.
// Puro e sem dependências: usado pela Carteira, pelo gráfico, pelo serviço de fundo e pelo Radar Mobile.

// regras: só chama atenção se travar pelo menos `min` USDC a mais que o SL de hoje; lembra de novo depois de
// `remind` horas; tf = '1h' (todas as posições) ou 'trade' (tempo gráfico de cada trade)
// mode = 'pivot' (só o último topo/fundo) · 'relevant' (último topo/fundo relevante no 1h: zigue-zague de 2 ATR) ·
// 'entry' (só levar para a entrada ao chegar em 1R) · 'best' (o que proteger mais)
export const DEFAULT_TRAIL = { min: 5, remind: 4, tf: '1h', mode: 'best' };
export const TRAIL_MODES = ['best', 'pivot', 'relevant', 'entry'];
// a regra "relevante" é sempre no 1h
export const trailTf = (cfg, tradeTf, valid = () => true) => (cfg?.mode !== 'relevant' && cfg?.tf === 'trade' && tradeTf && valid(tradeTf) ? tradeTf : '1h');
export const pivotOnly = (mode) => mode === 'pivot' || mode === 'relevant'; // regras que não levam o SL para a entrada sozinhas

const pivotK = (tf) => (tf === '1h' || tf === '4h' ? 4 : 3);
function pivots(c, k) {
  const highs = [], lows = [];
  for (let i = k; i < c.length - k; i++) {
    let isH = true, isL = true;
    for (let j = i - k; j <= i + k && (isH || isL); j++) {
      if (j === i) continue;
      if (j < i ? c[j].h > c[i].h : c[j].h >= c[i].h) isH = false;
      if (j < i ? c[j].l < c[i].l : c[j].l <= c[i].l) isL = false;
    }
    if (isH) highs.push({ i, p: c[i].h, conf: i + k });
    if (isL) lows.push({ i, p: c[i].l, conf: i + k });
  }
  return { highs, lows };
}
// Topos/fundos relevantes: zigue-zague que só vira quando o preço anda `m` ATRs contra o último extremo.
// conf = candle em que o topo/fundo ficou confirmado (o preço já se afastou m ATRs dele)
export function zigzag(c, m = 2, period = 14) {
  const highs = [], lows = [];
  const n = c.length; if (n < period + 2) return { highs, lows };
  const A = [];
  let prev = null, sum = 0;
  for (let i = 0; i < n; i++) {
    const x = c[i], tr = i === 0 ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - c[i - 1].c), Math.abs(x.l - c[i - 1].c));
    if (i < period) { sum += tr; if (i === period - 1) prev = sum / period; A.push(i === period - 1 ? prev : null); continue; }
    prev = (prev * (period - 1) + tr) / period; A.push(prev);
  }
  let dir = 0, hi = c[0].h, hiI = 0, lo = c[0].l, loI = 0;
  for (let i = 1; i < n; i++) {
    const th = m * (A[i] ?? A[period - 1]);
    if (dir >= 0 && c[i].h > hi) { hi = c[i].h; hiI = i; }
    if (dir <= 0 && c[i].l < lo) { lo = c[i].l; loI = i; }
    if (dir >= 0 && hiI < i && hi - c[i].l >= th) { highs.push({ i: hiI, p: hi, conf: i }); dir = -1; lo = c[i].l; loI = i; }
    else if (dir <= 0 && loI < i && c[i].h - lo >= th) { lows.push({ i: loI, p: lo, conf: i }); dir = 1; hi = c[i].h; hiI = i; }
  }
  return { highs, lows };
}
function atrLast(c, period = 14) {
  let prev = null, sum = 0;
  for (let i = 0; i < c.length; i++) {
    const x = c[i], tr = i === 0 ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - c[i - 1].c), Math.abs(x.l - c[i - 1].c));
    if (i < period) { sum += tr; if (i === period - 1) prev = sum / period; continue; }
    prev = (prev * (period - 1) + tr) / period;
  }
  return prev || 0;
}

// cs: candles fechados · t: { dir, entry, qty, sl, risk0? } · fee: taxa por lado (0 para trade manual)
// risk0 = distância original entrada→SL (para o 1R não "encolher" quando o SL anda); sem ele, usa o SL de hoje
export function trailSuggest(cs, tf, t, price, fee = 0, mode = DEFAULT_TRAIL.mode) {
  const n = cs?.length || 0;
  if (n < 20 || !t?.entry || !t?.qty) return null;
  const at = atrLast(cs), p = price || cs[n - 1].c;
  const s = t.dir === 'baixa' ? -1 : 1, sl = t.sl ?? null;
  // 1) último topo/fundo confirmado ± ½ ATR (folga para o SL não ficar colado no topo)
  let pivSug = null, piv = null;
  if (mode !== 'entry') {
    const { highs, lows } = mode === 'relevant' ? zigzag(cs) : pivots(cs, pivotK(tf));
    const list = (s > 0 ? lows : highs).filter((x) => x.conf <= n - 1 && s * (p - x.p) > 0);
    piv = list[list.length - 1] || null;
    if (piv) { pivSug = piv.p - s * 0.5 * at; if (s * (p - pivSug) <= 0) pivSug = null; }
  }
  // 2) entrada, depois que o preço andou 1R a favor (zera o risco)
  let beSug = null;
  const r0 = t.risk0 || (sl != null && s * (t.entry - sl) > 0 ? Math.abs(t.entry - sl) : 0);
  const reached1R = r0 > 0 && s * (p - t.entry) >= r0;
  if (!pivotOnly(mode) && reached1R) beSug = t.entry;
  // escolhe: no modo 'best', o que proteger mais
  const cands = [pivSug != null && { px: pivSug, be: false }, beSug != null && { px: beSug, be: true }].filter(Boolean);
  if (!cands.length) return { none: true, tf, rel: mode === 'relevant', wait1R: mode === 'entry' && !reached1R };
  const pick = cands.reduce((a, x) => (s * (x.px - a.px) > 0 ? x : a));
  const sug = pick.px;
  const res = (px) => s * (px - t.entry) * t.qty - px * t.qty * fee; // resultado se o SL bater (líquido da taxa de saída)
  const v = res(sug), cur = sl != null ? res(sl) : null;
  // "no ponto": o seu SL já é o da regra (diferença menor que 5% do ATR ou 0,02% do preço — arredondamento)
  const same = sl != null && Math.abs(sug - sl) <= Math.max(0.05 * at, Math.abs(sug) * 0.0002);
  return { tf, rel: mode === 'relevant', sug, be: pick.be, pivSug, piv: piv ? { p: piv.p, t: cs[piv.i].t } : null, atr: at, same, better: !same && (sl == null || s * (sug - sl) > 0), v, cur, more: cur != null ? v - cur : null };
}

// estado para mostrar: 'on' vale mudar · 'small' daria, mas trava pouco · 'at' o seu SL já é o da regra ·
// 'ok' o seu SL está melhor que a regra · 'none' sem topo/fundo ainda
export function trailState(r, min = DEFAULT_TRAIL.min) {
  if (!r) return null;
  if (r.none) return 'none';
  if (r.same) return 'at';
  if (!r.better) return 'ok';
  return r.be || r.more == null || r.more >= min ? 'on' : 'small'; // levar para a entrada sempre chama atenção (zera o risco)
}
export const trailOn = (r, min = DEFAULT_TRAIL.min) => trailState(r, min) === 'on';
