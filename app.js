// Radar Mobile: suas posições da Hyperliquid no celular. Somente leitura (sem chave privada, sem ordens).
// O endereço fica só neste aparelho (localStorage). Nada vem preenchido.
import { hlState, hlOpenOrders, hlFills, hlFunding, hlFees, hlMarket, isAddress } from './lib/hyperliquid.js';
import { slimFill, slimFund, slimOrder, buildTrades } from './lib/hltrades.js';
import { ladder, restQty, origQty } from './lib/partials.js';
import { fmtPrice } from './lib/format.js';

const VERSION = '1.0.5';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get: (k, d = null) => { try { const v = localStorage.getItem('rm.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('rm.' + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  del: (k) => { try { localStorage.removeItem('rm.' + k); } catch { /* */ } },
};
const S = { addr: ls.get('addr'), meta: ls.get('meta', {}), metaAt: ls.get('metaAt'), tab: 'pos', sort: ls.get('sort', { k: 'pnl', d: 1 }), open: new Set(), data: null, err: null, loading: false, at: 0, histDays: 30 };

// ---------- formatos ----------
const br = (v, d = 2) => (v == null || !isFinite(v) ? '—' : Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const sgn = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
const usd = (v, sign = true) => (v == null || !isFinite(v) ? '—' : `${sign ? sgn(v) : v < 0 ? '−' : ''}$${br(v)}`);
const num = (v) => (v == null || !isFinite(v) ? '—' : `${sgn(v)}${br(v)}`);
const pct = (v, d = 1) => (v == null || !isFinite(v) ? '—' : `${sgn(v)}${Math.abs(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`);
const cls = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');
const coin = (t) => t.symbol.replace(/^HL:/, '');
const qty = (q) => q.toLocaleString('pt-BR', { maximumFractionDigits: q >= 100 ? 2 : q >= 1 ? 4 : 6 });
const ago = (ts) => { const s = Math.round((Date.now() - ts) / 1000); return s < 60 ? `há ${s} s` : s < 3600 ? `há ${Math.round(s / 60)} min` : `há ${Math.round(s / 3600)} h`; };
const dt = (ts) => { if (!ts) return '—'; const d = new Date(ts); return `${d.getDate()} ${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const SRC = { visto: 'visto por você', scanner: 'do Scanner', recon: 'reconstruído', plano: 'do plano', card: 'card salvo', manual: 'escolhido por você' };

// ---------- dados ----------
async function load() {
  if (!S.addr || S.loading) return;
  S.loading = true; render();
  try {
    const since = Date.now() - 90 * 86400e3;
    const [market, state, orders, fills, fund, fees] = await Promise.all([
      hlMarket(), hlState(S.addr), hlOpenOrders(S.addr), hlFills(S.addr, since), hlFunding(S.addr, since), hlFees(S.addr).catch(() => null),
    ]);
    const raw = { fills: fills.map(slimFill), funding: fund.filter((f) => f.delta?.usdc != null).map(slimFund), since };
    const { trades } = buildTrades(raw, state, orders);
    S.data = {
      market, trades, orders: (orders || []).map(slimOrder), rate: fees ? +fees.userCrossRate : 0.00045,
      account: { value: +state.marginSummary.accountValue, margin: +state.marginSummary.totalMarginUsed, free: +state.withdrawable },
    };
    S.err = null; S.at = Date.now();
  } catch (e) {
    S.err = e?.code === 'invalid' ? 'Endereço não encontrado na Hyperliquid.' : 'Sem conexão com a Hyperliquid. Tentando de novo…';
  } finally { S.loading = false; render(); }
}
const withMeta = (t) => { const m = S.meta[t.id] || {}; return { ...t, patternName: m.patternName || null, tf: m.tf || null, linkSrc: m.patternName ? (m.auto ? m.src : m.src || 'manual') : null }; };

// ---------- barra TP/SL (igual à Carteira) ----------
// largura real da barra: tela − margens da página (12+12) − recuo do card (12+12) − bordas (3+1)
const W = () => Math.max(220, Math.min(560, (document.documentElement.clientWidth || window.innerWidth) - 56));
function inTxt(v, frac) { if (v == null || !isFinite(v)) return ''; const t = num(v); return t.length * 6.2 + 8 <= frac * W() ? t : ''; }
function tag(pos, pl, roe) {
  if (pos == null) return '';
  const w = W(), pc = Math.max(0, Math.min(1, pos));
  if (pl == null || !isFinite(pl)) return `<i class="mk" style="left:${(pc * 100).toFixed(1)}%"></i>`;
  const a = usd(pl), b = roe != null && isFinite(roe) ? pct(roe) : '';
  const lw = (a.length + b.length) * 6 + (b ? 22 : 12);
  const x = pc * w, left = Math.max(0, Math.min(w - lw, x - lw / 2));
  return `<div class="ptag ${pl >= 0 ? 'up' : 'dn'}" style="left:${left.toFixed(0)}px"><span class="pv">${a}</span>${b ? `<span class="pr">${b}</span>` : ''}<i style="left:${(x - left).toFixed(0)}px"></i></div>`;
}
function labels(t, sl, ent, right, sub) {
  const cw = 6.4, w = W(), sT = fmtPrice(sl), eT = fmtPrice(t.entry);
  const lo = (sT.length * cw + eT.length * cw / 2 + 10) / w, hi = 1 - (right.length * cw + (sub ? sub.length * 5.4 + 8 : 0) + eT.length * cw / 2 + 10) / w;
  const x = lo <= hi ? Math.max(lo, Math.min(hi, ent)) : 0.5;
  return `<div class="lb"><span class="sh">${sT}</span><span class="md" style="left:${(x * 100).toFixed(1)}%">${eT}</span><span class="lg">${right}${sub ? ` <small>· ${sub}</small>` : ''}</span></div>`;
}
function bar(t, p, pl, roe, L) {
  const sl = t.sl, s = t.dir === 'baixa' ? -1 : 1;
  if (sl == null || !L.levels.length) {
    return `<div class="tpn">${pl != null ? `<span class="ptag st ${pl >= 0 ? 'up' : 'dn'}"><span class="pv">${usd(pl)}</span>${roe != null ? `<span class="pr">${pct(roe)}</span>` : ''}</span>` : ''}<span class="muted">entrada</span> <b class="mono">${fmtPrice(t.entry)}</b> ${sl == null ? '<span class="nosl">sem SL</span>' : `<span class="neg mono">SL ${fmtPrice(sl)}</span> <span class="muted">sem TP</span>`}</div>`;
  }
  const w = W();
  const RED = Math.max(0.22, Math.min(0.42, (fmtPrice(sl).length * 6.4 + 8) / w));
  const segs = L.levels.map((x) => ({ w: x.pctOrig, px: x.px, done: x.done, win: x.win !== false, net: x.net }));
  const unc = L.uncovered / (L.orig || 1);
  if (unc > 0.005) segs.push({ w: unc, px: null, unc: true });
  const tot = segs.reduce((a, x) => a + x.w, 0) || 1;
  const posAt = (q) => {
    const d = s * (q - t.entry);
    if (d <= 0) return RED * (1 - Math.min(1, -d / Math.abs(t.entry - sl)));
    let x = RED, prev = t.entry;
    for (const g of segs) {
      const gw = (1 - RED) * g.w / tot;
      if (g.px == null) break;
      const span = s * (g.px - prev), k = span > 0 ? (s * (q - prev)) / span : 1;
      if (k >= 1) { x += gw; prev = g.px; continue; }
      return Math.min(1, x + gw * Math.max(0, k));
    }
    return Math.min(x, 1);
  };
  const pos = p ? posAt(p) : null;
  // trecho percorrido (entrada → preço) e Máx/Mín desde a entrada
  const trav = pos != null && Math.abs(pos - RED) > 0.002 ? `<div class="trav ${pos >= RED ? 'up' : 'dn'}" style="left:${(Math.min(RED, pos) * 100).toFixed(2)}%;width:${(Math.abs(pos - RED) * 100).toFixed(2)}%"></div>` : '';

  const slV = L.ifSl != null ? L.ifSl - L.realized : null;
  const html = segs.map((g) => { const fr = (1 - RED) * g.w / tot; const tx = g.unc ? (fr * w > 44 ? 'sem TP' : '') : inTxt(g.net, fr - (g.done ? 0.04 : 0)); return `<div class="pg${g.done ? ' dn' : ''}${g.unc ? ' un' : ''}" style="flex:${(g.w / tot).toFixed(4)}">${g.done && tx ? '✓' : ''}${tx}</div>`; }).join('');
  const nD = L.done.length, nA = L.levels.length, last = L.pend.length ? L.pend[L.pend.length - 1].px : L.levels[nA - 1].px;
  return `<div class="tpb"><div class="trk">${trav}<div class="rk" style="width:${RED * 100}%">${inTxt(slV, RED)}</div><div class="pgs">${html}</div><i class="en" style="left:${RED * 100}%"></i>${tag(pos, pl, roe)}</div>
    ${labels(t, sl, RED, fmtPrice(last), nA > 1 ? (nD ? `${nD} de ${nA} TPs` : `${nA} TPs`) : '')}</div>`;
}

// ---------- telas ----------
function render() {
  const app = $('#app');
  if (!S.addr) { app.innerHTML = setupView(); bindSetup(); return; }
  const body = S.tab === 'pos' ? posView() : S.tab === 'ord' ? ordView() : S.tab === 'hist' ? histView() : cfgView();
  const titles = { pos: 'Posições', ord: 'Ordens', hist: 'Histórico', cfg: 'Ajustes' };
  const n = S.data ? S.data.trades.filter((t) => t.status === 'open').length : null;
  app.innerHTML = `<header><b>${titles[S.tab]}${S.tab === 'pos' && n != null ? ` (${n})` : ''}</b><button id="ref" class="upd">${S.loading ? '<span class="spin"></span> atualizando' : S.at ? `atualizado ${ago(S.at)} ↻` : '↻'}</button></header>
    ${S.err ? `<div class="err">${esc(S.err)}</div>` : ''}
    <main id="main">${body}</main>
    <nav>${[['pos', 'Posições'], ['ord', 'Ordens'], ['hist', 'Histórico'], ['cfg', 'Ajustes']].map(([k, l]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>`;
  bind();
}
function setupView() {
  return `<div class="setup"><div class="brand"><span class="logo">◎</span><b>Radar Mobile</b></div>
    <p>Veja suas posições da Hyperliquid no celular. <b>Somente leitura</b>: nunca pede chave privada e não envia ordens.</p>
    <label>Endereço da carteira<input id="addr" placeholder="0x…" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text"></label>
    <small>Fica guardado só neste celular. Nada vem preenchido.</small>
    <div class="err" id="aerr" hidden></div>
    <button id="go" class="primary">Ver posições</button>
    <p class="muted">Opcional, depois: em Ajustes, importe o <b>radar-backup-ultimo.json</b> para ver o padrão vinculado a cada trade.</p>
    <p class="ver">v${VERSION}</p></div>`;
}
function bindSetup() {
  $('#go').onclick = () => {
    const a = $('#addr').value.trim();
    if (!isAddress(a)) { const e = $('#aerr'); e.hidden = false; e.textContent = 'Endereço inválido: começa com 0x e tem 42 caracteres.'; return; }
    S.addr = a; ls.set('addr', a); render(); load();
  };
}

function posView() {
  if (!S.data) return S.loading ? '<div class="empty">Carregando suas posições…</div>' : '<div class="empty">Sem dados ainda.</div>';
  const { market, account, rate } = S.data;
  const open = S.data.trades.filter((t) => t.status === 'open').map(withMeta);
  const rows = open.map((t) => {
    const p = market[coin(t)]?.mark ?? null;
    const L = ladder(t, rate);
    const roe = t.margin ? t.upnl / t.margin : null;
    return { t, p, L, pl: t.upnl, roe, val: t.value || (p ? t.qty * p : 0), liqD: t.liq && p ? Math.abs(t.liq - p) / p : Infinity };
  });
  let tPl = 0, tSl = 0, tTp = 0, nSl = 0, nTp = 0;
  for (const r of rows) { tPl += r.pl || 0; if (r.L.ifSl != null) { tSl += r.L.ifSl - r.L.realized; nSl++; } if (r.L.pend.length) { tTp += r.L.pend.reduce((a, x) => a + x.net, 0); nTp++; } }
  const k = S.sort.k, d = S.sort.d;
  const key = { pnl: (r) => r.pl || 0, mkt: (r) => coin(r.t), size: (r) => r.val, liq: (r) => r.liqD, margin: (r) => r.t.margin || 0, funding: (r) => r.t.funding || 0 }[k] || ((r) => r.pl || 0);
  rows.sort((a, b) => { const x = key(a), y = key(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * d; });
  const chip = (kk, l) => `<button class="chip${k === kk ? ' on' : ''}" data-sort="${kk}">${l}${k === kk ? (d > 0 ? ' ▲' : ' ▼') : ''}</button>`;
  return `<section class="tiles"><div class="tile"><span>Valor da conta</span><b>${usd(account.value, false)}</b></div><div class="tile"><span>PNL aberto</span><b class="${cls(tPl)}">${usd(tPl)}</b></div>
    ${marginBar(account)}
    <div class="tot">${nSl ? `todos os SL <b class="neg">${num(tSl)}</b>` : ''}${nSl && nTp ? ' · ' : ''}${nTp ? `todos os TPs <b class="pos">${num(tTp)}</b>` : ''}</div></section>
    <div class="sorts">${chip('pnl', 'PNL')}${chip('mkt', 'Mercado')}${chip('size', 'Tamanho')}${chip('liq', 'Liq.')}${chip('margin', 'Margem')}${chip('funding', 'Funding')}</div>
    ${rows.length ? rows.map(card).join('') : '<div class="empty">Nenhuma posição aberta.</div>'}`;
}
// margem usada (soma das posições) e o que sobra livre; a barra fica laranja acima de 70% da conta e vermelha acima de 90%
function marginBar(a) {
  if (!a?.value) return '';
  const used = a.margin || 0, f = Math.max(0, Math.min(1, used / a.value)), free = Math.max(0, a.value - used);
  const lvl = f > 0.9 ? 'hi' : f > 0.7 ? 'mid' : '';
  // faixas como no mockup: verde até 70%, laranja de 70 a 90%, vermelho acima de 90%
  const seg = (a0, a1, c) => (f > a0 ? `<div class="${c}" style="left:${a0 * 100}%;width:${(Math.min(f, a1) - a0) * 100}%"></div>` : '');
  return `<div class="mg"><div class="mgt"><span>Margem usada <b>${usd(used, false)}</b> <em class="${lvl}">${Math.round(f * 100)}%</em></span><span>livre <b>${usd(free, false)}</b></span></div>
    <div class="mgb">${seg(0, 0.7, '')}${seg(0.7, 0.9, 'mid')}${seg(0.9, 1, 'hi')}<i style="left:70%"></i><i style="left:90%"></i></div></div>`;
}
function card({ t, p, L, pl, roe, liqD }) {
  const side = t.dir === 'baixa' ? 'sh' : 'lg', op = S.open.has(t.id);
  const partial = t.parts?.length;
  return `<article class="pc ${side}${op ? ' open' : ''}" data-id="${esc(t.id)}">
    <div class="h"><b>${esc(coin(t))}</b><span>${t.lev ? String(t.lev).replace('.', ',') + 'x · ' : ''}${t.dir === 'baixa' ? 'venda' : 'compra'}</span><span class="grow"></span><span class="q">${qty(t.qty)} ${esc(coin(t))}${partial ? ` <small>de ${qty(origQty(t))}</small>` : ''}</span></div>
    ${bar(t, p, pl, roe, L)}
    <div class="f"><span>Marca <b class="wht">${p ? fmtPrice(p) : '—'}</b></span><span>Liq. <b>${t.liq ? fmtPrice(t.liq) : '—'}</b>${isFinite(liqD) ? ` <small class="${liqD < 0.1 ? 'warn' : ''}">a ${liqD > 1 ? '> 100' : (liqD * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</small>` : ''}</span><span>Margem <b>${t.margin ? usd(t.margin, false) : '—'}</b></span></div>
    ${op ? detail(t, p, L) : ''}</article>`;
}
function detail(t, p, L) {
  const mg = t.margin;
  const dist = (px) => (p ? `a ${(Math.abs(px - p) / p * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '');
  const row = (x) => `<tr class="${x.done ? 'dn' : ''}"><td class="${x.done && !x.win ? 'neg' : 'pos'}">${x.done ? '✓ ' : ''}TP${x.n}</td><td>${fmtPrice(x.px)}</td><td class="muted">${Math.round(x.pctOrig * 100)}%</td><td class="${cls(x.net)}">${num(x.net)}</td><td class="muted">${x.done ? dt(x.time) : dist(x.px)}</td></tr>`;
  const slLeg = L.ifSl != null ? L.ifSl - L.realized : null;
  const fee = (t.fees > 0 ? t.fees : t.qty * t.entry * S.data.rate) + t.qty * (p || t.entry) * S.data.rate;
  return `<div class="det">
    <div class="g2"><div class="box"><span>Se o SL bater</span><b class="${cls(L.ifSl)}">${L.ifSl != null ? usd(L.ifSl) : 'sem SL'}</b><small>${L.ifSl != null && mg ? pct(L.ifSl / mg) + ' na margem' : ''}</small></div>
    <div class="box"><span>Se todos os TPs baterem</span><b class="${cls(L.ifAll)}">${L.ifAll != null ? usd(L.ifAll) : 'sem TP'}</b><small>${L.rrAvg != null ? 'R/R médio ' + L.rrAvg.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : ''}</small></div></div>
    ${L.realized ? `<div class="muted">Já realizado nas parciais: <b class="${cls(L.realized)}">${usd(L.realized)}</b></div>` : ''}
    ${L.lockHint ? `<div class="warn">TP executado e o SL ainda do lado do prejuízo: levando o SL para ${fmtPrice(t.entry)}, o trade termina com pelo menos ${usd(L.realized)}.</div>` : ''}
    <table>${L.levels.map(row).join('')}${t.sl != null ? `<tr><td class="neg">SL</td><td>${fmtPrice(t.sl)}</td><td class="muted">${L.done.length ? 'resto' : 'tudo'}</td><td class="${cls(slLeg)}">${num(slLeg)}</td><td class="muted">${dist(t.sl)}</td></tr>` : ''}</table>
    <div class="row muted"><span>Entrada ${fmtPrice(t.entry)} · ${t.openedAt ? dt(t.openedAt) : 'antes de 90 dias'}</span><span>Taxas ~${usd(fee, false)} · funding ${usd(t.funding || 0)}</span></div>
    ${t.patternName ? `<div class="row"><span class="selo">${esc(t.patternName)}${t.tf ? ' · ' + esc(t.tf) : ''}${t.linkSrc && SRC[t.linkSrc] ? ' · ' + SRC[t.linkSrc] : ''}</span>${S.metaAt ? `<small class="muted">do backup de ${dt(S.metaAt)}</small>` : ''}</div>` : ''}
  </div>`;
}
function ordView() {
  if (!S.data) return '<div class="empty">Carregando…</div>';
  const o = [...S.data.orders].sort((a, b) => b.time - a.time);
  if (!o.length) return '<div class="empty">Nenhuma ordem aberta.</div>';
  const T = { 'Take Profit Market': 'Take profit', 'Take Profit Limit': 'Take profit (limite)', 'Stop Market': 'Stop', 'Stop Limit': 'Stop (limite)', Limit: 'Limite' };
  return o.map((x) => `<article class="ord ${x.side === 'B' ? 'lg' : 'sh'}"><div class="h"><b>${esc(x.coin)}</b><span>${esc(T[x.type] || x.type)}</span><span class="grow"></span><span class="${x.side === 'B' ? 'pos' : 'neg'}">${x.side === 'B' ? 'Compra' : 'Venda'}</span></div>
    <div class="f"><span>${x.trig ? 'Gatilho' : 'Preço'} <b>${fmtPrice(x.trig || x.px)}</b></span><span>Tamanho <b>${x.sz ? qty(x.sz) : 'posição inteira'}</b></span><span class="muted">${dt(x.time)}</span></div></article>`).join('');
}
function histView() {
  if (!S.data) return '<div class="empty">Carregando…</div>';
  const lim = Date.now() - S.histDays * 86400e3;
  const c = S.data.trades.filter((t) => t.status === 'closed' && t.closedAt >= lim).map(withMeta).sort((a, b) => b.closedAt - a.closedAt);
  const tot = c.reduce((a, t) => a + (t.realized || 0), 0), wins = c.filter((t) => t.realized > 0).length;
  return `<div class="sorts">${[7, 30, 90].map((d) => `<button class="chip${S.histDays === d ? ' on' : ''}" data-days="${d}">${d} dias</button>`).join('')}</div>
    <div class="tot">${c.length} trades · <b class="${cls(tot)}">${usd(tot)}</b>${c.length ? ` · acerto ${Math.round(wins / c.length * 100)}%` : ''} · líquido de taxas e funding</div>
    ${c.length ? c.map((t) => `<article class="ord ${t.dir === 'baixa' ? 'sh' : 'lg'}"><div class="h"><b>${esc(coin(t))}</b><span>${t.dir === 'baixa' ? 'venda' : 'compra'}${t.parts?.length > 1 ? ` · ${t.parts.length} saídas` : ''}</span><span class="grow"></span><b class="${cls(t.realized)}">${usd(t.realized)}</b></div>
    <div class="f"><span>${fmtPrice(t.entry)} → ${fmtPrice(t.exit)}</span><span class="muted">${dt(t.closedAt)}</span></div>${t.patternName ? `<div class="f"><span class="selo">${esc(t.patternName)}${t.tf ? ' · ' + esc(t.tf) : ''}</span></div>` : ''}</article>`).join('') : '<div class="empty">Nenhum trade fechado no período.</div>'}`;
}
function cfgView() {
  const nMeta = Object.keys(S.meta || {}).length;
  return `<section class="cfg">
    <div class="box"><span>Carteira</span><b class="mono">${esc(S.addr.slice(0, 6))}…${esc(S.addr.slice(-4))}</b><small>Somente leitura · guardado só neste celular</small><button id="out" class="ghost">Trocar endereço</button></div>
    <div class="box"><span>Padrões vinculados (opcional)</span><b>${nMeta ? `${nMeta} trades` : 'nenhum importado'}</b><small>${S.metaAt ? 'backup de ' + dt(S.metaAt) : 'Importe o radar-backup-ultimo.json da pasta de backup do Radar Gráfico.'}</small>
      <label class="ghost file">Importar backup<input type="file" id="imp" accept="application/json,.json" hidden></label>${nMeta ? '<button id="clrm" class="ghost">Apagar do celular</button>' : ''}</div>
    <div class="box"><span>Atualização</span><b>a cada 15 s</b><small>com a página aberta; toque em “atualizado” para atualizar agora</small></div>
    <p class="ver">Radar Mobile v${VERSION}</p></section>`;
}

// ---------- eventos ----------
function bind() {
  $('#ref').onclick = () => load();
  document.querySelectorAll('nav [data-tab]').forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));
  document.querySelectorAll('[data-sort]').forEach((b) => (b.onclick = () => {
    const k = b.dataset.sort;
    S.sort = S.sort.k === k ? { k, d: -S.sort.d } : { k, d: k === 'mkt' || k === 'liq' ? 1 : k === 'pnl' ? 1 : -1 };
    ls.set('sort', S.sort); render();
  }));
  document.querySelectorAll('[data-days]').forEach((b) => (b.onclick = () => { S.histDays = +b.dataset.days; render(); }));
  document.querySelectorAll('article.pc').forEach((a) => (a.onclick = () => { const id = a.dataset.id; S.open.has(id) ? S.open.delete(id) : S.open.add(id); render(); }));
  const out = $('#out'); if (out) out.onclick = () => { if (!confirm('Trocar o endereço? As posições deste endereço deixam de aparecer.')) return; S.addr = null; S.data = null; ls.del('addr'); render(); };
  const clr = $('#clrm'); if (clr) clr.onclick = () => { S.meta = {}; S.metaAt = null; ls.del('meta'); ls.del('metaAt'); render(); };
  const imp = $('#imp');
  if (imp) imp.onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== 'radar-grafico' || !data.hlMeta) throw new Error('formato');
      // só os vínculos (padrão, tf, origem); nada de endereço ou valores
      const meta = {};
      for (const [id, m] of Object.entries(data.hlMeta)) if (m?.patternName) meta[id] = { patternName: m.patternName, tf: m.tf || null, src: m.src || null, auto: !!m.auto };
      S.meta = meta; S.metaAt = Date.parse(data.exportedAt) || Date.now();
      ls.set('meta', meta); ls.set('metaAt', S.metaAt); render();
    } catch { alert('Arquivo inválido. Use o radar-backup-ultimo.json da pasta de backup do Radar Gráfico.'); }
  };
}
// puxar para baixo atualiza
let y0 = null;
window.addEventListener('touchstart', (e) => { y0 = window.scrollY <= 0 ? e.touches[0].clientY : null; }, { passive: true });
window.addEventListener('touchend', (e) => { if (y0 != null && e.changedTouches[0].clientY - y0 > 80) load(); y0 = null; }, { passive: true });
// atualiza a cada 15 s com a página visível
setInterval(() => { if (document.visibilityState === 'visible' && S.addr) load(); else render(); }, 15000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.addr && Date.now() - S.at > 10000) load(); });
window.addEventListener('resize', () => render());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

render();
load();
