// SL móvel sugerido: último fundo (compra) ou topo (venda) confirmado, com folga de ¼ ATR.
// Puro e sem dependências: usado pela Carteira, pelo gráfico, pelo serviço de fundo e pelo Radar Mobile.

// regras: só chama atenção se travar pelo menos `min` USDC a mais que o SL de hoje; lembra de novo depois de
// `remind` horas; tf = '1h' (todas as posições) ou 'trade' (tempo gráfico de cada trade)
export const DEFAULT_TRAIL = { min: 5, remind: 4, tf: '1h' };
export const trailTf = (cfg, tradeTf, valid = () => true) => (cfg?.tf === 'trade' && tradeTf && valid(tradeTf) ? tradeTf : '1h');

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
function atrLast(c, period = 14) {
  let prev = null, sum = 0;
  for (let i = 0; i < c.length; i++) {
    const x = c[i], tr = i === 0 ? x.h - x.l : Math.max(x.h - x.l, Math.abs(x.h - c[i - 1].c), Math.abs(x.l - c[i - 1].c));
    if (i < period) { sum += tr; if (i === period - 1) prev = sum / period; continue; }
    prev = (prev * (period - 1) + tr) / period;
  }
  return prev || 0;
}

// cs: candles fechados · t: { dir, entry, qty, sl } · fee: taxa por lado (0 para trade manual)
export function trailSuggest(cs, tf, t, price, fee = 0) {
  const n = cs?.length || 0;
  if (n < 20 || !t?.entry || !t?.qty) return null;
  const at = atrLast(cs), p = price || cs[n - 1].c;
  const { highs, lows } = pivots(cs, pivotK(tf));
  const s = t.dir === 'baixa' ? -1 : 1, sl = t.sl ?? null;
  const list = (s > 0 ? lows : highs).filter((x) => x.conf <= n - 1 && s * (p - x.p) > 0);
  const piv = list[list.length - 1];
  if (!piv) return { none: true, tf };
  const sug = piv.p - s * 0.25 * at;
  if (s * (p - sug) <= 0) return { none: true, tf };
  const res = (px) => s * (px - t.entry) * t.qty - px * t.qty * fee; // resultado se o SL bater (líquido da taxa de saída)
  const v = res(sug), cur = sl != null ? res(sl) : null;
  // "no ponto": o seu SL já é o da regra (diferença menor que 5% do ATR ou 0,02% do preço — arredondamento)
  const same = sl != null && Math.abs(sug - sl) <= Math.max(0.05 * at, Math.abs(sug) * 0.0002);
  return { tf, sug, piv: { p: piv.p, t: cs[piv.i].t }, atr: at, same, better: !same && (sl == null || s * (sug - sl) > 0), v, cur, more: cur != null ? v - cur : null };
}

// estado para mostrar: 'on' vale mudar · 'small' daria, mas trava pouco · 'at' o seu SL já é o da regra ·
// 'ok' o seu SL está melhor que a regra · 'none' sem topo/fundo ainda
export function trailState(r, min = DEFAULT_TRAIL.min) {
  if (!r) return null;
  if (r.none) return 'none';
  if (r.same) return 'at';
  if (!r.better) return 'ok';
  return r.more == null || r.more >= min ? 'on' : 'small';
}
export const trailOn = (r, min = DEFAULT_TRAIL.min) => trailState(r, min) === 'on';
