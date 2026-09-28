// Monta os trades (abertos e fechados) a partir das execuções, funding e ordens da Hyperliquid.
// Sem dependência do Chrome: usado pela extensão e pelo Radar Mobile.
const EPS = 1e-9;
export const slimFill = (f) => ({ coin: f.coin, px: +f.px, sz: +f.sz, side: f.side, time: f.time, start: +f.startPosition, pnl: +f.closedPnl, fee: +f.fee, tid: f.tid });
export const slimFund = (f) => ({ coin: f.delta.coin, usdc: +f.delta.usdc, time: f.time, szi: f.delta.szi != null ? +f.delta.szi : null, rate: f.delta.fundingRate != null ? +f.delta.fundingRate : null });
// ordens abertas (TP/SL e limites), só para exibir
export const slimOrder = (o) => ({ coin: o.coin, side: o.side, type: o.orderType || (o.isTrigger ? 'Trigger' : 'Limit'), sz: +o.sz, origSz: +(o.origSz ?? o.sz), px: +o.limitPx, trig: o.isTrigger ? +o.triggerPx : null, cond: o.triggerCondition || '', reduce: !!o.reduceOnly, tpsl: !!o.isPositionTpsl, time: o.timestamp, oid: o.oid });

// Reconstrói os trades a partir das execuções: um trade começa quando a posição sai de zero e termina quando volta.
export function buildTrades(raw, state, orders) {
  const byCoin = {};
  for (const f of raw.fills) (byCoin[f.coin] ||= []).push(f);
  const fundSum = (coin, a, b) => raw.funding.filter((f) => f.coin === coin && f.time >= a && f.time <= b).reduce((s, f) => s + f.usdc, 0);
  const trades = [];
  const openByCoin = {};

  for (const coin in byCoin) {
    let cur = null;
    // Posição aberta antes da janela importada: a abertura não está nos dados, mas o fechamento sim.
    // O preço médio de entrada sai do P/L de cada execução de fechamento: long → px − pnl/qtd; short → px + pnl/qtd.
    let skip = Math.abs(byCoin[coin][0].start) > EPS;
    let pre = skip ? { coin, dir: byCoin[coin][0].start > 0 ? 'alta' : 'baixa', max: Math.abs(byCoin[coin][0].start), cq: 0, cn: 0, eq: 0, en: 0, pnl: 0, fees: 0, first: byCoin[coin][0].time } : null;
    for (const f of byCoin[coin]) {
      const signed = f.side === 'B' ? f.sz : -f.sz;
      const start = f.start;
      const end = start + signed;
      if (skip) {
        const closing = Math.abs(start) > EPS && (Math.abs(end) < Math.abs(start) || Math.sign(end) !== Math.sign(start));
        pre.fees += f.fee; pre.pnl += f.pnl;
        if (closing) {
          const q = Math.min(f.sz, Math.abs(start));
          pre.cq += q; pre.cn += q * f.px;
          const ent = start > 0 ? f.px - f.pnl / q : f.px + f.pnl / q;
          if (isFinite(ent)) { pre.eq += q; pre.en += q * ent; }
        } else pre.max = Math.max(pre.max, Math.abs(end));
        if (Math.abs(end) < EPS || (Math.abs(start) > EPS && Math.sign(end) !== Math.sign(start))) {
          skip = false;
          const funding = fundSum(coin, raw.since || pre.first, f.time);
          trades.push({
            id: `hl:${coin}:antes`, source: 'hl', symbol: 'HL:' + coin, status: 'closed', closeReason: 'hl', preWindow: true,
            dir: pre.dir, qty: pre.max, entry: pre.eq ? pre.en / pre.eq : f.px, exit: pre.cq ? pre.cn / pre.cq : f.px,
            openedAt: null, closedAt: f.time, pnlGross: pre.pnl, fees: pre.fees, funding, realized: pre.pnl - pre.fees + funding,
          });
          pre = null;
          if (Math.abs(end) > EPS) {
            cur = newTrade(coin, f, 0);
            cur.oq = Math.abs(end); cur.on = Math.abs(end) * f.px; cur.dir = end > 0 ? 'alta' : 'baixa'; cur.max = Math.abs(end);
          }
        }
        continue;
      }
      if (!cur) {
        if (Math.abs(start) > EPS) continue;
        cur = newTrade(coin, f, 0);
      }
      const opening = Math.abs(end) > Math.abs(start) && (Math.abs(start) < EPS || Math.sign(end) === Math.sign(start));
      cur.fees += f.fee; cur.pnl += f.pnl;
      if (opening) {
        const add = Math.abs(end) - Math.abs(start);
        cur.oq += add; cur.on += add * f.px;
      } else {
        const closeSz = Math.min(f.sz, Math.abs(start));
        cur.cq += closeSz; cur.cn += closeSz * f.px;
        addExit(cur, f.px, closeSz, f.time, f.pnl - f.fee);
        if (Math.abs(end) < EPS || Math.sign(end) !== Math.sign(start)) {
          trades.push(finish(cur, f.time, fundSum));
          cur = null;
          if (Math.abs(end) > EPS) { cur = newTrade(coin, f, 0); cur.oq = Math.abs(end); cur.on = Math.abs(end) * f.px; cur.dir = end > 0 ? 'alta' : 'baixa'; }
        }
      }
      if (cur) cur.max = Math.max(cur.max, Math.abs(end));
    }
    if (cur) openByCoin[coin] = cur;
  }

  // Posições abertas: fonte da verdade é o clearinghouseState
  for (const ap of state.assetPositions || []) {
    const p = ap.position;
    const szi = +p.szi;
    if (Math.abs(szi) < EPS) continue;
    const c = openByCoin[p.coin];
    const openedAt = c ? c.openedAt : null;
    const tpsl = tpslOf(orders, p.coin, szi > 0, +p.entryPx, Math.abs(szi));
    trades.push({
      id: `hl:${p.coin}:${openedAt || 'antes'}`, source: 'hl', symbol: 'HL:' + p.coin, status: 'open',
      dir: szi > 0 ? 'alta' : 'baixa', qty: Math.abs(szi), entry: +p.entryPx, openedAt: openedAt || null,
      lev: p.leverage?.value, levType: p.leverage?.type, liq: p.liquidationPx != null ? +p.liquidationPx : null,
      upnl: +p.unrealizedPnl, margin: +p.marginUsed, value: +p.positionValue,
      funding: openedAt ? fundSum(p.coin, openedAt, Date.now()) : -(+p.cumFunding?.sinceOpen || 0),
      fees: c ? c.fees : 0,
      tp: tpsl.tp, sl: tpsl.sl, tps: tpsl.tps, slSz: tpsl.slSz,
      origQty: c && c.max > Math.abs(szi) ? c.max : Math.abs(szi), parts: c ? c.exits : [],
    });
  }
  return { trades };

  function newTrade(coin, f, _) {
    const signed = f.side === 'B' ? 1 : -1;
    return { coin, dir: signed > 0 ? 'alta' : 'baixa', openedAt: f.time, oq: 0, on: 0, cq: 0, cn: 0, fees: 0, pnl: 0, max: 0, exits: [] };
  }
}

function finish(c, closedAt, fundSum) {
  const funding = fundSum(c.coin, c.openedAt, closedAt);
  const entry = c.oq ? c.on / c.oq : 0, exit = c.cq ? c.cn / c.cq : 0;
  return {
    id: `hl:${c.coin}:${c.openedAt}`, source: 'hl', symbol: 'HL:' + c.coin, status: 'closed', closeReason: 'hl',
    dir: c.dir, qty: c.max || c.oq, entry, exit, openedAt: c.openedAt, closedAt,
    pnlGross: c.pnl, fees: c.fees, funding, realized: c.pnl - c.fees + funding,
    parts: c.exits.length > 1 ? c.exits : undefined,
  };
}

// Saídas: execuções de fechamento a menos de 2 min uma da outra contam como uma só (ordem dividida no livro)
function addExit(c, px, sz, time, pnl) {
  const l = c.exits[c.exits.length - 1];
  if (l && time - l.time < 120e3) { l.px = (l.px * l.sz + px * sz) / (l.sz + sz); l.sz += sz; l.pnl += pnl; l.time = time; return; }
  c.exits.push({ px, sz, time, pnl });
}

// TP/SL da posição. TPs parciais: todas as ordens de take profit (gatilho) e as limites "reduz posição" do lado do lucro.
// tp = o TP mais distante (fim da barra); tps = todos, do mais perto ao mais longe.
function tpslOf(orders, coin, isLong, entry, size) {
  let sl = null, slSz = null;
  const tps = [];
  for (const o of orders || []) {
    if (o.coin !== coin) continue;
    const closes = isLong ? o.side === 'A' : o.side === 'B';
    const t = String(o.orderType || '');
    const sz = +o.sz > 0 ? +o.sz : size; // TP/SL da posição com tamanho 0 = posição inteira
    if (o.isTrigger && (o.reduceOnly || o.isPositionTpsl)) {
      const px = +o.triggerPx;
      if (/take profit/i.test(t)) tps.push({ px, sz, oid: o.oid });
      else if (/stop/i.test(t)) { sl = px; slSz = sz; }
    } else if (!o.isTrigger && o.reduceOnly && closes && entry) {
      const px = +o.limitPx;
      if (isLong ? px > entry : px < entry) tps.push({ px, sz, oid: o.oid, limit: true });
    }
  }
  tps.sort((a, b) => (isLong ? a.px - b.px : b.px - a.px));
  return { tp: tps.length ? tps[tps.length - 1].px : null, sl, slSz, tps };
}

