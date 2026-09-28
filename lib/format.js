export const VERSION = '1.5.5';

// idioma dos números (o Radar Mobile troca para en-US em inglês)
let LOC = 'pt-BR';
export function setPriceLocale(l) { LOC = l; }

export function fmtPrice(v) {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  const d = a >= 1000 ? 0 : a >= 10 ? 2 : a >= 1 ? 3 : a >= 0.01 ? 5 : 8;
  return v.toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtPct(r) { return Math.round(r * 100) + '%'; }

export function fmtAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pad = (n) => String(n).padStart(2, '0');

export function fmtDate(ts, withTime = true) {
  const d = new Date(ts);
  const s = `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
  return withTime ? `${s} ${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
}

export function fmtDuration(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return r ? `${h}h ${r}min` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function riskReward(p) {
  const risk = Math.abs(p.entry - p.stop), rew = Math.abs(p.target - p.entry);
  return risk ? rew / risk : 0;
}

export function statusText(p, tfLabel) {
  if (p.outcome === 'formacao') return 'em formação';
  return `${tfLabel} · ${fmtAgo(p.t)}`;
}
