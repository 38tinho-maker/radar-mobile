// Barra TP/SL "régua + cápsula bicolor" (B2·2·2): trilho fino, cotação do SL e do TP em etiquetas nas pontas,
// cápsula com o caminho que o preço já fez (vermelho do lado da perda, verde do lado do ganho),
// bolinha no preço de agora e chip colorido com o resultado. Embaixo: perda no SL · entrada · ganho no TP.
// Puro (só monta HTML): usado pela Carteira e pelo Radar Mobile.
const f1 = (x) => (Math.max(0, Math.min(1, x)) * 100).toFixed(2) + '%';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// o: { k, pos, cap:{a,b,at}, dots:[{x,done,loss}], tail, left:{t,cls,title}, right:{t,cls,title}, chip:{t,up},
//      bot:{l:{t,cls}, m:{t,cls}, r:{t,cls,sub}}, mode:''|'lk'|'nt', cls, tw (largura do trilho em px, para não encavalar embaixo) }
export function ruler(o) {
  const k = Math.max(0, Math.min(1, o.k));
  let trk = `<i class="rg-r" style="width:${f1(k)}"></i><i class="rg-g" style="left:${f1(k)};width:${f1(1 - k)}"></i>`;
  if (o.tail != null && o.tail < 1) trk += `<i class="rg-un" style="left:${f1(o.tail)};width:${f1(1 - o.tail)}"></i>`;
  if (o.cap) {
    // cap.at = ponto de divisão (padrão: a entrada). Depois de mexer no SL, a divisão é o preço de agora.
    const m = Math.max(0, Math.min(1, o.cap.at ?? k));
    const a = Math.max(0, Math.min(m, o.cap.a ?? m)), b = Math.min(1, Math.max(m, o.cap.b ?? m));
    if (m - a > 0.003) trk += `<i class="rg-c dn" style="left:${f1(a)};width:${f1(m - a)}"></i>`;
    if (b - m > 0.003) trk += `<i class="rg-c up" style="left:${f1(m)};width:${f1(b - m)}"></i>`;
  }
  for (const d of o.dots || []) trk += `<i class="rg-d${d.done ? ' dn' : ''}${d.loss ? ' ls' : ''}" style="left:${f1(d.x)}"${d.title ? ` title="${esc(d.title)}"` : ''}></i>`;
  trk += `<i class="rg-en" style="left:${f1(k)}"></i>`;
  if (o.pos != null) {
    const up = o.chip ? o.chip.up : true, c = up ? 'up' : 'dn', p = Math.max(0, Math.min(1, o.pos));
    trk += `<i class="rg-p ${c}" style="left:${f1(p)}"></i>`;
    if (o.chip) trk += `<span class="rg-ch ${c}${p < 0.1 ? ' el' : p > 0.9 ? ' er' : ''}" style="left:${f1(p)}">${esc(o.chip.t)}</span><i class="rg-bc ${c}" style="left:${f1(p)}"></i>`;
  }
  // embaixo: o preço de entrada fica sob o traço, mas sem encostar nos valores das pontas
  const b = o.bot || {}, tw = o.tw || 260, cw = 6.4;
  const lw = (b.l?.t || '').length * cw, rw = ((b.r?.t || '') + (b.r?.sub ? ' · ' + b.r.sub : '')).length * cw * 0.95, mw = (b.m?.t || '').length * cw;
  const lo = (lw + mw / 2 + 8) / tw, hi = 1 - (rw + mw / 2 + 8) / tw;
  const mx = lo <= hi ? Math.max(lo, Math.min(hi, k)) : k;
  const bot = `${b.l ? `<span class="rb-l c-${b.l.cls || 'x'}">${b.l.t}</span>` : ''}${b.m ? `<span class="rb-m c-${b.m.cls || 'x'}" style="left:${f1(mx)}">${b.m.t}</span>` : ''}${b.r ? `<span class="rb-r c-${b.r.cls || 'x'}">${b.r.t}${b.r.sub ? ` <small>· ${b.r.sub}</small>` : ''}</span>` : ''}`;
  const end = (e, side) => (e ? `<span class="rg-e c-${e.cls || 'x'}"${e.title ? ` title="${esc(e.title)}"` : ''}>${esc(e.t)}</span>` : '<span></span>');
  return `<div class="rg${o.mode ? ' rg-' + o.mode : ''} ${o.cls || ''}">${end(o.left, 'l')}<div class="rg-t">${trk}</div>${end(o.right, 'r')}<span></span><div class="rg-b">${bot}</div><span></span></div>`;
}

// CSS (copiado igual na Carteira e no Radar Mobile; as cores vêm das variáveis de cada um)
