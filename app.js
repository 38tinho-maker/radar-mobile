// Radar Mobile: suas posições da Hyperliquid no celular. Somente leitura (sem chave privada, sem ordens).
// O endereço fica só neste aparelho (localStorage). Nada vem preenchido.
import { hlState, hlOpenOrders, hlFills, hlFunding, hlFees, hlMarket, isAddress } from './lib/hyperliquid.js';
import { slimFill, slimFund, slimOrder, buildTrades } from './lib/hltrades.js';
import { ladder, restQty, origQty } from './lib/partials.js';
import { fmtPrice, setPriceLocale } from './lib/format.js';
import { t as tr, setLang, lang, loc, month, patName, defaultLang } from './lib/i18n.js';
import { extStore, bestWorst } from './lib/runext.js';

const VERSION = '1.0.7';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get: (k, d = null) => { try { const v = localStorage.getItem('rm.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('rm.' + k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  del: (k) => { try { localStorage.removeItem('rm.' + k); } catch { /* */ } },
};
// idioma: o salvo, ou o do celular na primeira vez
function applyLang(l) { setLang(l); setPriceLocale(loc()); }
applyLang(ls.get('lang') || defaultLang());
const S = { addr: ls.get('addr'), meta: ls.get('meta', {}), metaAt: ls.get('metaAt'), tab: 'pos', sort: ls.get('sort', { k: 'pnl', d: 1 }), open: new Set(), data: null, err: null, loading: false, at: 0, histDays: 30 };

// ---------- formatos ----------
const br = (v, d = 2) => (v == null || !isFinite(v) ? '—' : Math.abs(v).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }));
const sgn = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
const usd = (v, sign = true) => (v == null || !isFinite(v) ? '—' : `${sign ? sgn(v) : v < 0 ? '−' : ''}$${br(v)}`);
const num = (v) => (v == null || !isFinite(v) ? '—' : `${sgn(v)}${br(v)}`);
const pct = (v, d = 1) => (v == null || !isFinite(v) ? '—' : `${sgn(v)}${Math.abs(v * 100).toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d })}%`);
const cls = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');
const coin = (t) => t.symbol.replace(/^HL:/, '');
const qty = (q) => q.toLocaleString(loc(), { maximumFractionDigits: q >= 100 ? 2 : q >= 1 ? 4 : 6 });
const ago = (ts) => { const s = Math.round((Date.now() - ts) / 1000); return s < 60 ? tr('ago.s', { n: s }) : s < 3600 ? tr('ago.m', { n: Math.round(s / 60) }) : tr('ago.h', { n: Math.round(s / 3600) }); };
const dt = (ts) => { if (!ts) return '—'; const d = new Date(ts); const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; return lang() === 'en' ? `${month(d.getMonth())} ${d.getDate()} ${hm}` : `${d.getDate()} ${month(d.getMonth())} ${hm}`; };
const SRC = (k) => (['visto', 'scanner', 'recon', 'plano', 'card', 'manual'].includes(k) ? tr('src.' + k) : null);
const fmt1 = (v) => v.toLocaleString(loc(), { maximumFractionDigits: 1 });
const sideTxt = (t) => tr(t.dir === 'baixa' ? 'short' : 'long');

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
    // máxima e mínima desde a entrada (candles da Hyperliquid), em segundo plano
    EXT.refresh(trades.filter((t) => t.status === 'open' && t.openedAt).map((t) => ({ id: t.id, coin: coin(t), since: t.openedAt })), () => { if (S.tab === 'pos') render(); });
  } catch (e) {
    S.err = e?.code === 'invalid' ? 'err.notfound' : 'err.net';
  } finally { S.loading = false; render(); }
}
const EXT = extStore({ load: async () => ls.get('ext', {}), save: async (m) => ls.set('ext', m) });
EXT.init();
const withMeta = (t) => { const m = S.meta[t.id] || {}; return { ...t, patternName: m.patternName || null, tf: m.tf || null, linkSrc: m.patternName ? (m.auto ? m.src : m.src || 'manual') : null }; };

// ---------- barra TP/SL (igual à Carteira) ----------
// largura real da barra: tela − margens da página (12+12) − recuo do card (12+12) − bordas (3+1)
const W = () => Math.max(220, Math.min(560, (document.documentElement.clientWidth || window.innerWidth) - 56));
function inTxt(v, frac) { if (v == null || !isFinite(v)) return ''; const t = num(v); return t.length * 6.2 + 8 <= frac * W() ? t : ''; }
// seta no preço de agora, na cor do resultado (o valor fica no título do card)
function arrow(pos, pl) {
  if (pos == null) return '';
  return `<i class="mk ${pl == null ? '' : pl >= 0 ? 'up' : 'dn'}" style="left:${(Math.max(0, Math.min(1, pos)) * 100).toFixed(1)}%"></i>`;
}
// trecho percorrido: forte = entrada → agora; claro com brilho = até o melhor e o pior ponto desde a entrada.
// Os preenchimentos passam por baixo dos segmentos (o TP executado fica na cor cheia); por cima, só o contorno.
function traveled(ent, pos, run) {
  const box = (a, b, c) => { const x = Math.max(0, Math.min(a, b)), y = Math.min(1, Math.max(a, b)); return y - x < 0.002 ? '' : `<div class="${c}" style="left:${(x * 100).toFixed(2)}%;width:${((y - x) * 100).toFixed(2)}%"></div>`; };
  let out = '';
  if (run?.fav != null) out += box(ent, run.fav, 'ext up') + box(ent, run.fav, 'glow up');
  if (run?.adv != null) out += box(run.adv, ent, 'ext dn') + box(run.adv, ent, 'glow dn');
  if (pos != null) out += box(ent, pos, `trav ${pos >= ent ? 'up' : 'dn'}`);
  return out;
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
    return `<div class="tpn"><span class="muted">${tr('entry')}</span> <b class="mono">${fmtPrice(t.entry)}</b> ${sl == null ? `<span class="nosl">${tr('noSl')}</span>` : `<span class="neg mono">SL ${fmtPrice(sl)}</span> <span class="muted">${tr('noTp')}</span>`}</div>`;
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
  const bw = bestWorst(EXT.get(t.id), t, p);
  const trav = traveled(RED, pos, bw && { fav: bw.best != null ? posAt(bw.best) : null, adv: bw.worst != null ? posAt(bw.worst) : null });

  const slV = L.ifSl != null ? L.ifSl - L.realized : null;
  const html = segs.map((g) => { const fr = (1 - RED) * g.w / tot; const tx = g.unc ? (fr * w > 44 ? tr('noTp') : '') : inTxt(g.net, fr - (g.done ? 0.04 : 0)); return `<div class="pg${g.done ? ' dn' : ''}${g.unc ? ' un' : ''}" style="flex:${(g.w / tot).toFixed(4)}">${g.done && tx ? '✓' : ''}${tx}</div>`; }).join('');
  const nD = L.done.length, nA = L.levels.length, last = L.pend.length ? L.pend[L.pend.length - 1].px : L.levels[nA - 1].px;
  return `<div class="tpb"><div class="trk">${trav}<div class="rk" style="width:${RED * 100}%">${inTxt(slV, RED)}</div><div class="pgs">${html}</div><i class="en" style="left:${RED * 100}%"></i>${arrow(pos, pl)}</div>
    ${labels(t, sl, RED, fmtPrice(last), nA > 1 ? (nD ? tr('tpsOf', { d: nD, a: nA }) : tr('tps', { a: nA })) : '')}</div>`;
}

// ---------- telas ----------
function render() {
  const app = $('#app');
  if (!S.addr) { app.innerHTML = setupView(); bindSetup(); return; }
  const body = S.tab === 'pos' ? posView() : S.tab === 'ord' ? ordView() : S.tab === 'hist' ? histView() : cfgView();
  const n = S.data ? S.data.trades.filter((t) => t.status === 'open').length : null;
  app.innerHTML = `<header><b>${tr('tab.' + S.tab)}${S.tab === 'pos' && n != null ? ` (${n})` : ''}</b><button id="ref" class="upd">${S.loading ? `<span class="spin"></span> ${tr('upd.loading')}` : S.at ? `${tr('upd.at', { t: ago(S.at) })} ↻` : '↻'}</button></header>
    ${S.err ? `<div class="err">${esc(tr(S.err))}</div>` : ''}
    <main id="main">${body}</main>
    <nav>${['pos', 'ord', 'hist', 'cfg'].map((k) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${tr('tab.' + k)}</button>`).join('')}</nav>`;
  bind();
}
const langSeg = () => `<div class="lang">${[['pt', '🇧🇷 Português'], ['en', '🇺🇸 English']].map(([k, l]) => `<button type="button" data-lang="${k}" class="${lang() === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
function setupView() {
  return `<div class="setup"><div class="brand"><span class="logo">◎</span><b>Radar Mobile</b></div>
    ${langSeg()}
    <p>${tr('setup.lead')}</p>
    <label>${tr('setup.addr')}<input id="addr" placeholder="0x…" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text"></label>
    <small>${tr('setup.local')}</small>
    <div class="err" id="aerr" hidden></div>
    <button id="go" class="primary">${tr('setup.go')}</button>
    <p class="muted">${tr('setup.opt')}</p>
    <p class="ver">v${VERSION}</p></div>`;
}
function bindSetup() {
  bindLang();
  $('#go').onclick = () => {
    const a = $('#addr').value.trim();
    if (!isAddress(a)) { const e = $('#aerr'); e.hidden = false; e.textContent = tr('setup.bad'); return; }
    S.addr = a; ls.set('addr', a); render(); load();
  };
}
// troca de idioma (guarda no celular); o endereço já digitado não se perde
function bindLang() {
  document.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => {
    const typed = $('#addr')?.value;
    applyLang(b.dataset.lang); ls.set('lang', lang()); render();
    if (typed && $('#addr')) $('#addr').value = typed;
  }));
}

function posView() {
  if (!S.data) return `<div class="empty">${tr(S.loading ? 'loadingPos' : 'noData')}</div>`;
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
  return `<section class="tiles"><div class="tile"><span>${tr('acct')}</span><b>${usd(account.value, false)}</b></div><div class="tile"><span>${tr('openPnl')}</span><b class="${cls(tPl)}">${usd(tPl)}</b></div>
    ${marginBar(account)}
    <div class="tot">${nSl ? `${tr('allSl')} <b class="neg">${num(tSl)}</b>` : ''}${nSl && nTp ? ' · ' : ''}${nTp ? `${tr('allTp')} <b class="pos">${num(tTp)}</b>` : ''}</div></section>
    <div class="sorts">${chip('pnl', 'PNL')}${['mkt', 'size', 'liq', 'margin', 'funding'].map((x) => chip(x, tr('sort.' + x))).join('')}</div>
    ${rows.length ? rows.map(card).join('') : `<div class="empty">${tr('noPos')}</div>`}`;
}
// margem usada (soma das posições) e o que sobra livre; a barra fica laranja acima de 70% da conta e vermelha acima de 90%
function marginBar(a) {
  if (!a?.value) return '';
  const used = a.margin || 0, f = Math.max(0, Math.min(1, used / a.value)), free = Math.max(0, a.value - used);
  const lvl = f > 0.9 ? 'hi' : f > 0.7 ? 'mid' : '';
  // faixas como no mockup: verde até 70%, laranja de 70 a 90%, vermelho acima de 90%
  const seg = (a0, a1, c) => (f > a0 ? `<div class="${c}" style="left:${a0 * 100}%;width:${(Math.min(f, a1) - a0) * 100}%"></div>` : '');
  return `<div class="mg"><div class="mgt"><span>${tr('mg.used')} <b>${usd(used, false)}</b> <em class="${lvl}">${Math.round(f * 100)}%</em></span><span>${tr('mg.free')} <b>${usd(free, false)}</b></span></div>
    <div class="mgb">${seg(0, 0.7, '')}${seg(0.7, 0.9, 'mid')}${seg(0.9, 1, 'hi')}<i style="left:70%"></i><i style="left:90%"></i></div></div>`;
}
function card({ t, p, L, pl, roe, liqD }) {
  const side = t.dir === 'baixa' ? 'sh' : 'lg', op = S.open.has(t.id);
  const partial = t.parts?.length;
  return `<article class="pc ${side}${op ? ' open' : ''}" data-id="${esc(t.id)}">
    <div class="h"><b>${esc(coin(t))}</b><span>${t.lev ? fmt1(t.lev) + 'x · ' : ''}${sideTxt(t)}</span><span class="grow"></span>${pl != null && isFinite(pl) ? `<span class="now ${cls(pl)}"><small>${tr('now')}</small><b>${usd(pl)}</b> <em>${roe != null && isFinite(roe) ? pct(roe) : ''}</em></span>` : ''}</div>
    ${bar(t, p, pl, roe, L)}
    <div class="f"><span>${tr('mark')} <b class="wht">${p ? fmtPrice(p) : '—'}</b></span><span>${tr('liq')} <b>${t.liq ? fmtPrice(t.liq) : '—'}</b>${isFinite(liqD) ? ` <small class="${liqD < 0.1 ? 'warn' : ''}">${tr('away', { p: (liqD > 1 ? '> 100' : fmt1(liqD * 100)) + '%' })}</small>` : ''}</span><span>${tr('margin')} <b>${t.margin ? usd(t.margin, false) : '—'}</b></span></div>
    <div class="f"><span>${tr('size')} <b>${qty(t.qty)} ${esc(coin(t))}</b>${partial ? ` <small>${tr('of', { q: qty(origQty(t)) })}</small>` : ''}</span></div>
    ${op ? detail(t, p, L) : ''}</article>`;
}
function detail(t, p, L) {
  const mg = t.margin;
  const dist = (px) => (p ? tr('away', { p: fmt1(Math.abs(px - p) / p * 100) + '%' }) : '');
  const row = (x) => `<tr class="${x.done ? 'dn' : ''}"><td class="${x.done && !x.win ? 'neg' : 'pos'}">${x.done ? '✓ ' : ''}TP${x.n}</td><td>${fmtPrice(x.px)}</td><td class="muted">${Math.round(x.pctOrig * 100)}%</td><td class="${cls(x.net)}">${num(x.net)}</td><td class="muted">${x.done ? dt(x.time) : dist(x.px)}</td></tr>`;
  const slLeg = L.ifSl != null ? L.ifSl - L.realized : null;
  const fee = (t.fees > 0 ? t.fees : t.qty * t.entry * S.data.rate) + t.qty * (p || t.entry) * S.data.rate;
  return `<div class="det">
    <div class="g2"><div class="box"><span>${tr('ifSl')}</span><b class="${cls(L.ifSl)}">${L.ifSl != null ? usd(L.ifSl) : tr('noSl')}</b><small>${L.ifSl != null && mg ? tr('onMargin', { p: pct(L.ifSl / mg) }) : ''}</small></div>
    <div class="box"><span>${tr('ifAll')}</span><b class="${cls(L.ifAll)}">${L.ifAll != null ? usd(L.ifAll) : tr('noTp')}</b><small>${L.rrAvg != null ? tr('rr', { v: fmt1(L.rrAvg) }) : ''}</small></div></div>
    ${L.realized ? `<div class="muted">${tr('realized')} <b class="${cls(L.realized)}">${usd(L.realized)}</b></div>` : ''}
    ${L.lockHint ? `<div class="warn">${tr('lock', { e: fmtPrice(t.entry), v: usd(L.realized) })}</div>` : ''}
    <table>${L.levels.map(row).join('')}${t.sl != null ? `<tr><td class="neg">SL</td><td>${fmtPrice(t.sl)}</td><td class="muted">${tr(L.done.length ? 'rest' : 'all')}</td><td class="${cls(slLeg)}">${num(slLeg)}</td><td class="muted">${dist(t.sl)}</td></tr>` : ''}</table>
    <div class="row muted"><span>${tr('entryAt', { p: fmtPrice(t.entry), d: t.openedAt ? dt(t.openedAt) : tr('before90') })}</span><span>${tr('fees', { f: usd(fee, false), g: usd(t.funding || 0) })}</span></div>
    ${t.patternName ? `<div class="row"><span class="selo">${esc(patName(t.patternName))}${t.tf ? ' · ' + esc(t.tf) : ''}${SRC(t.linkSrc) ? ' · ' + SRC(t.linkSrc) : ''}</span>${S.metaAt ? `<small class="muted">${tr('fromBackup', { d: dt(S.metaAt) })}</small>` : ''}</div>` : ''}
  </div>`;
}
function ordView() {
  if (!S.data) return `<div class="empty">${tr('loading')}</div>`;
  const o = [...S.data.orders].sort((a, b) => b.time - a.time);
  if (!o.length) return `<div class="empty">${tr('noOrd')}</div>`;
  const T = { 'Take Profit Market': tr('ot.tpm'), 'Take Profit Limit': tr('ot.tpl'), 'Stop Market': tr('ot.sm'), 'Stop Limit': tr('ot.sl'), Limit: tr('ot.l') };
  return o.map((x) => `<article class="ord ${x.side === 'B' ? 'lg' : 'sh'}"><div class="h"><b>${esc(x.coin)}</b><span>${esc(T[x.type] || x.type)}</span><span class="grow"></span><span class="${x.side === 'B' ? 'pos' : 'neg'}">${tr(x.side === 'B' ? 'buy' : 'sell')}</span></div>
    <div class="f"><span>${tr(x.trig ? 'trig' : 'price')} <b>${fmtPrice(x.trig || x.px)}</b></span><span>${tr('size')} <b>${x.sz ? qty(x.sz) : tr('wholePos')}</b></span><span class="muted">${dt(x.time)}</span></div></article>`).join('');
}
function histView() {
  if (!S.data) return `<div class="empty">${tr('loading')}</div>`;
  const lim = Date.now() - S.histDays * 86400e3;
  const c = S.data.trades.filter((t) => t.status === 'closed' && t.closedAt >= lim).map(withMeta).sort((a, b) => b.closedAt - a.closedAt);
  const tot = c.reduce((a, t) => a + (t.realized || 0), 0), wins = c.filter((t) => t.realized > 0).length;
  return `<div class="sorts">${[7, 30, 90].map((d) => `<button class="chip${S.histDays === d ? ' on' : ''}" data-days="${d}">${tr('days', { d })}</button>`).join('')}</div>
    <div class="tot">${c.length} trades · <b class="${cls(tot)}">${usd(tot)}</b>${c.length ? ` · ${tr('winrate', { p: Math.round(wins / c.length * 100) })}` : ''} · ${tr('net')}</div>
    ${c.length ? c.map((t) => `<article class="ord ${t.dir === 'baixa' ? 'sh' : 'lg'}"><div class="h"><b>${esc(coin(t))}</b><span>${sideTxt(t)}${t.parts?.length > 1 ? ` · ${tr('exits', { n: t.parts.length })}` : ''}</span><span class="grow"></span><b class="${cls(t.realized)}">${usd(t.realized)}</b></div>
    <div class="f"><span>${fmtPrice(t.entry)} → ${fmtPrice(t.exit)}</span><span class="muted">${dt(t.closedAt)}</span></div>${t.patternName ? `<div class="f"><span class="selo">${esc(patName(t.patternName))}${t.tf ? ' · ' + esc(t.tf) : ''}</span></div>` : ''}</article>`).join('') : `<div class="empty">${tr('noClosed')}</div>`}`;
}
function cfgView() {
  const nMeta = Object.keys(S.meta || {}).length;
  return `<section class="cfg">
    <div class="box"><span>${tr('cfg.lang')}</span>${langSeg()}<small>${tr('cfg.langSub')}</small></div>
    <div class="box"><span>${tr('cfg.wallet')}</span><b class="mono">${esc(S.addr.slice(0, 6))}…${esc(S.addr.slice(-4))}</b><small>${tr('cfg.walletSub')}</small><button id="out" class="ghost">${tr('cfg.change')}</button></div>
    <div class="box"><span>${tr('cfg.linked')}</span><b>${nMeta ? (nMeta === 1 ? '1 trade' : tr('cfg.nTrades', { n: nMeta })) : tr('cfg.none')}</b><small>${S.metaAt ? tr('cfg.backupOf', { d: dt(S.metaAt) }) : tr('cfg.impHint')}</small>
      <label class="ghost file">${tr('cfg.imp')}<input type="file" id="imp" accept="application/json,.json" hidden></label>${nMeta ? `<button id="clrm" class="ghost">${tr('cfg.clr')}</button>` : ''}</div>
    <div class="box"><span>${tr('cfg.refresh')}</span><b>${tr('cfg.every')}</b><small>${tr('cfg.refreshSub')}</small></div>
    <p class="ver">Radar Mobile v${VERSION}</p></section>`;
}

// ---------- eventos ----------
function bind() {
  $('#ref').onclick = () => load();
  bindLang();
  document.querySelectorAll('nav [data-tab]').forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));
  document.querySelectorAll('[data-sort]').forEach((b) => (b.onclick = () => {
    const k = b.dataset.sort;
    S.sort = S.sort.k === k ? { k, d: -S.sort.d } : { k, d: k === 'mkt' || k === 'liq' ? 1 : k === 'pnl' ? 1 : -1 };
    ls.set('sort', S.sort); render();
  }));
  document.querySelectorAll('[data-days]').forEach((b) => (b.onclick = () => { S.histDays = +b.dataset.days; render(); }));
  document.querySelectorAll('article.pc').forEach((a) => (a.onclick = () => { const id = a.dataset.id; S.open.has(id) ? S.open.delete(id) : S.open.add(id); render(); }));
  const out = $('#out'); if (out) out.onclick = () => { if (!confirm(tr('confirmOut'))) return; S.addr = null; S.data = null; ls.del('addr'); render(); };
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
    } catch { alert(tr('badFile')); }
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
