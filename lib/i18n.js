// Textos do app em Português (Brasil) e English. t('chave', { n: 1 }) troca {n} pelo valor.
const D = {
  pt: {
    'setup.lead': 'Veja suas posições da Hyperliquid no celular. <b>Somente leitura</b>: nunca pede chave privada e não envia ordens.',
    'setup.addr': 'Endereço da carteira',
    'setup.local': 'Fica guardado só neste celular. Nada vem preenchido.',
    'setup.go': 'Ver posições',
    'setup.opt': 'Opcional, depois: em Ajustes, importe o <b>radar-backup-ultimo.json</b> para ver o padrão vinculado a cada trade.',
    'setup.bad': 'Endereço inválido: começa com 0x e tem 42 caracteres.',
    'err.notfound': 'Endereço não encontrado na Hyperliquid.',
    'err.net': 'Sem conexão com a Hyperliquid. Tentando de novo…',
    'tab.pos': 'Posições', 'tab.ord': 'Ordens', 'tab.hist': 'Histórico', 'tab.cfg': 'Ajustes',
    'upd.loading': 'atualizando', 'upd.at': 'atualizado {t}',
    'ago.s': 'há {n} s', 'ago.m': 'há {n} min', 'ago.h': 'há {n} h', 'ago.d': 'há {n} d',
    'fin.title': 'Finalizados', 'fin.final': 'RESULTADO FINAL', 'fin.closed': 'fechou {t}', 'fin.lasted': 'durou {d}', 'fin.all': 'Dispensar todos', 'fin.x': 'Dispensar (continua no Histórico)',
    'fin.tp': 'TP', 'fin.tpp': 'TP · PARCIAIS', 'fin.sl': 'STOP', 'fin.man': 'MANUAL', 'fin.unk': 'ENCERRADO', 'fin.exit': 'saída',
    'loadingPos': 'Carregando suas posições…', 'noData': 'Sem dados ainda.', 'loading': 'Carregando…', 'noPos': 'Nenhuma posição aberta.',
    'acct': 'Valor da conta', 'openPnl': 'PNL aberto', 'allSl': 'todos os SL', 'slLose': 'se os SL baterem: perde', 'slLock': 'trava', 'allTp': 'todos os TPs',
    'far': 'longe', 'mg.full': 'Margem {p} usada · sem margem livre', 'cfg.theme': 'Aparência', 'cfg.themeSub': 'Auto segue o modo do iPhone (escuro ou claro).', 'th.dark': 'Escuro', 'th.light': 'Claro',
    'noRisk': 'sem risco', 'to1r': 'sem TP · a 1R: {p}', 'past1r': 'sem TP · passou de 1R', 'locked': '🔒 travado {v} · SL {p}', 'sort.open': 'Abertura', 'sort.nsl': 'Perto do SL', 'sort.ntp': 'Perto do TP', 'distSl': 'SL: {p} do caminho', 'distTp': '{n}: {p} do caminho',
    'sort.mkt': 'Mercado', 'sort.size': 'Tamanho', 'sort.liq': 'Liq.', 'sort.margin': 'Margem', 'sort.funding': 'Funding',
    'mg.used': 'Margem usada', 'mg.free': 'livre',
    'short': 'venda', 'long': 'compra', 'now': 'RESULTADO AGORA',
    'mark': 'Marca', 'liq': 'Liq.', 'away': 'a {p}', 'margin': 'Margem', 'size': 'Tamanho', 'of': 'de {q}',
    'entry': 'entrada', 'noSl': 'sem SL', 'noTp': 'sem TP', 'tpsOf': '{d} de {a} TPs', 'tps': '{a} TPs',
    'ifSl': 'Se o SL bater', 'onMargin': '{p} na margem', 'ifAll': 'Se todos os TPs baterem', 'rr': 'R/R médio {v}',
    'realized': 'Já realizado nas parciais:',
    'lock': 'TP executado e o SL ainda do lado do prejuízo: se bater, o que está aberto perde {l} e o trade todo fecha em {a}. Com o SL na entrada ({e}), fica garantido ~{v}.',
    'rest': 'resto', 'all': 'tudo', 'entryAt': 'Entrada {p} · {d}', 'before90': 'antes de 90 dias',
    'fees': 'Taxas ~{f} · funding {g}', 'fromBackup': 'do backup de {d}',
    'noOrd': 'Nenhuma ordem aberta.', 'buy': 'Compra', 'sell': 'Venda', 'trig': 'Gatilho', 'price': 'Preço', 'wholePos': 'posição inteira', 'step1': 'se executar a 1ª ({p})', 'stepN': 'se executar as {n} ({p})', 'avg': 'médio', 'stepsLab': '{n} limites · se executar', 'stepsLab1': '1 limite · se executar', 'tTitle': 'SL móvel', 'tCan': '{n} posições podem subir o SL', 'tCan1': '1 posição pode subir o SL', 'tNone': 'nenhuma posição precisa subir o SL agora', 'tnSmall': '{n} com ganho pequeno', 'tnOk': '{n} em dia', 'tnWait': '{n} aguardando', 'tOk': 'SL em dia', 'tOkTx': 'o seu está melhor que a regra ({p})', 'tAt': 'SL no ponto sugerido', 'tnAt': '{n} no ponto sugerido', 'tSmall': 'abaixo do mínimo de ${v}', 'tWaitTop': 'aguardando topo no 1h', 'tWaitBot': 'aguardando fundo no 1h', 'tTop': 'topo', 'tBot': 'fundo', 'only': 'só', 'copy': 'copiar', 'tBe': 'passou de 1R · zera o risco', 'tAtBe': 'SL na entrada', 'tZero': 'zero risco', 'slNet': 'saldo', 'renderErr': 'Não deu para mostrar esta tela (v{v}). Confira se todos os arquivos do Radar Mobile foram atualizados no GitHub.', 'bWarn': '<b>as {n} limites estão {w} do SL ({sl})</b>: o preço passa pelo SL antes · a posição fecha e, se elas executarem depois, abrem uma <b>posição nova sem SL</b>', 'bWarn1': '<b>a limite está {w} do SL ({sl})</b>: o preço passa pelo SL antes · a posição fecha e, se ela executar depois, abre uma <b>posição nova sem SL</b>', 'above': 'acima', 'below': 'abaixo', 'bTot': 'total {q} {c} · médio {p}', 'bNewS': 'nova venda {q} {c}', 'bNewB': 'nova compra {q} {c}', 'bLab': '{n} depois do SL',
    'days': '{d} dias', 'winrate': 'acerto {p}%', 'net': 'líquido de taxas e funding', 'exits': '{n} saídas', 'noClosed': 'Nenhum trade fechado no período.',
    'cfg.lang': 'Idioma / Language', 'cfg.langSub': 'Números e datas seguem o idioma: $1.234,56 · 28 set 14:05',
    'cfg.wallet': 'Carteira', 'cfg.walletSub': 'Somente leitura · guardado só neste celular', 'cfg.change': 'Trocar endereço',
    'cfg.linked': 'Padrões vinculados (opcional)', 'cfg.nTrades': '{n} trades', 'cfg.none': 'nenhum importado', 'cfg.backupOf': 'backup de {d}',
    'cfg.impHint': 'Importe o radar-backup-ultimo.json da pasta de backup do Radar Gráfico.', 'cfg.imp': 'Importar backup', 'cfg.clr': 'Apagar do celular',
    'cfg.trail': 'SL móvel · regra', 'cfg.trailSub': 'onde o Radar sugere o SL · relevante = só topos/fundos depois de um movimento de 2 ATR no 1h', 'tm.best': 'o que proteger mais', 'tm.pivot': 'só o último topo/fundo', 'tm.relevant': 'topo/fundo relevante (1h)', 'tm.entry': 'só entrada ao chegar em 1R', 'tRel': 'relevante', 'tWait1R': 'aguardando 1R',
    'chShow': 'ver gráfico 1h', 'chHide': 'esconder gráfico', 'chLoading': 'carregando candles…', 'chSug': 'SL sugerido', 'chPiv': 'topo/fundo relevante',
    'vOld': 'Radar Mobile desatualizado (v{v})', 'vOldTx': 'A extensão já está com a regra da v{e}: o SL sugerido pode não bater. Suba o zip completo novo no GitHub e reabra o app.', 'cfg.rule': 'Regra do SL móvel: v{r}',
    'cfg.refresh': 'Atualização', 'cfg.every': 'a cada 15 s', 'cfg.refreshSub': 'com a página aberta; toque em “atualizado” para atualizar agora',
    'confirmOut': 'Trocar o endereço? As posições deste endereço deixam de aparecer.',
    'badFile': 'Arquivo inválido. Use o radar-backup-ultimo.json da pasta de backup do Radar Gráfico.',
    'ot.tpm': 'Take profit', 'ot.tpl': 'Take profit (limite)', 'ot.sm': 'Stop', 'ot.sl': 'Stop (limite)', 'ot.l': 'Limite',
    'src.visto': 'visto por você', 'src.scanner': 'do Scanner', 'src.recon': 'reconstruído', 'src.plano': 'do plano', 'src.card': 'card salvo', 'src.manual': 'escolhido por você',
  },
  en: {
    'setup.lead': 'Check your Hyperliquid positions on your phone. <b>Read-only</b>: never asks for a private key and never sends orders.',
    'setup.addr': 'Wallet address',
    'setup.local': 'Stored only on this phone. Nothing comes prefilled.',
    'setup.go': 'View positions',
    'setup.opt': 'Optional, later: in Settings, import <b>radar-backup-ultimo.json</b> to see the pattern linked to each trade.',
    'setup.bad': 'Invalid address: it starts with 0x and has 42 characters.',
    'err.notfound': 'Address not found on Hyperliquid.',
    'err.net': 'No connection to Hyperliquid. Retrying…',
    'tab.pos': 'Positions', 'tab.ord': 'Orders', 'tab.hist': 'History', 'tab.cfg': 'Settings',
    'upd.loading': 'updating', 'upd.at': 'updated {t}',
    'ago.s': '{n} s ago', 'ago.m': '{n} min ago', 'ago.h': '{n} h ago', 'ago.d': '{n} d ago',
    'fin.title': 'Closed', 'fin.final': 'FINAL RESULT', 'fin.closed': 'closed {t}', 'fin.lasted': 'lasted {d}', 'fin.all': 'Dismiss all', 'fin.x': 'Dismiss (stays in History)',
    'fin.tp': 'TP', 'fin.tpp': 'TP · PARTIALS', 'fin.sl': 'STOP', 'fin.man': 'MANUAL', 'fin.unk': 'CLOSED', 'fin.exit': 'exit',
    'loadingPos': 'Loading your positions…', 'noData': 'No data yet.', 'loading': 'Loading…', 'noPos': 'No open positions.',
    'acct': 'Account value', 'openPnl': 'Open PNL', 'allSl': 'all SLs', 'slLose': 'if SLs hit: lose', 'slLock': 'lock in', 'allTp': 'all TPs',
    'far': 'far', 'mg.full': 'Margin {p} used · no free margin', 'cfg.theme': 'Theme', 'cfg.themeSub': 'Auto follows the iPhone mode (dark or light).', 'th.dark': 'Dark', 'th.light': 'Light',
    'noRisk': 'no risk', 'to1r': 'no TP · 1R {p} away', 'past1r': 'no TP · past 1R', 'locked': '🔒 locked {v} · SL {p}', 'sort.open': 'Opened', 'sort.nsl': 'Near SL', 'sort.ntp': 'Near TP', 'distSl': 'SL: {p} of the way', 'distTp': '{n}: {p} of the way',
    'sort.mkt': 'Market', 'sort.size': 'Size', 'sort.liq': 'Liq.', 'sort.margin': 'Margin', 'sort.funding': 'Funding',
    'mg.used': 'Margin used', 'mg.free': 'free',
    'short': 'short', 'long': 'long', 'now': 'CURRENT RESULT',
    'mark': 'Mark', 'liq': 'Liq.', 'away': '{p} away', 'margin': 'Margin', 'size': 'Size', 'of': 'of {q}',
    'entry': 'entry', 'noSl': 'no SL', 'noTp': 'no TP', 'tpsOf': '{d} of {a} TPs', 'tps': '{a} TPs',
    'ifSl': 'If the SL is hit', 'onMargin': '{p} of margin', 'ifAll': 'If all TPs are hit', 'rr': 'Avg R/R {v}',
    'realized': 'Already realized in partials:',
    'lock': 'A TP has filled and the SL is still on the losing side: if it is hit, the open part loses {l} and the whole trade ends at {a}. With the SL at entry ({e}), ~{v} is locked in.',
    'rest': 'rest', 'all': 'all', 'entryAt': 'Entry {p} · {d}', 'before90': 'over 90 days ago',
    'fees': 'Fees ~{f} · funding {g}', 'fromBackup': 'backup from {d}',
    'noOrd': 'No open orders.', 'buy': 'Buy', 'sell': 'Sell', 'trig': 'Trigger', 'price': 'Price', 'wholePos': 'whole position', 'step1': 'if the 1st fills ({p})', 'stepN': 'if all {n} fill ({p})', 'avg': 'avg', 'stepsLab': '{n} limits · if filled', 'stepsLab1': '1 limit · if filled', 'tTitle': 'Trailing SL', 'tCan': '{n} positions can raise the SL', 'tCan1': '1 position can raise the SL', 'tNone': 'no position needs a new SL now', 'tnSmall': '{n} small gain', 'tnOk': '{n} up to date', 'tnWait': '{n} waiting', 'tOk': 'SL up to date', 'tOkTx': 'yours is better than the rule ({p})', 'tAt': 'SL at the suggested point', 'tnAt': '{n} at the suggested point', 'tSmall': 'below the ${v} minimum', 'tWaitTop': 'waiting for a 1h top', 'tWaitBot': 'waiting for a 1h bottom', 'tTop': 'top', 'tBot': 'bottom', 'only': 'only', 'copy': 'copy', 'tBe': 'past 1R · removes the risk', 'tAtBe': 'SL at entry', 'tZero': 'zero risk', 'slNet': 'net', 'renderErr': 'Could not show this screen (v{v}). Check that all Radar Mobile files were updated on GitHub.', 'bWarn': '<b>the {n} limits are {w} the SL ({sl})</b>: price crosses the SL first · the position closes and, if they fill later, they open a <b>new position with no SL</b>', 'bWarn1': '<b>the limit is {w} the SL ({sl})</b>: price crosses the SL first · the position closes and, if it fills later, it opens a <b>new position with no SL</b>', 'above': 'above', 'below': 'below', 'bTot': 'total {q} {c} · avg {p}', 'bNewS': 'new short {q} {c}', 'bNewB': 'new long {q} {c}', 'bLab': '{n} after the SL',
    'days': '{d} days', 'winrate': 'win rate {p}%', 'net': 'net of fees and funding', 'exits': '{n} exits', 'noClosed': 'No closed trades in this period.',
    'cfg.lang': 'Language / Idioma', 'cfg.langSub': 'Numbers and dates follow the language: $1,234.56 · Sep 28 14:05',
    'cfg.wallet': 'Wallet', 'cfg.walletSub': 'Read-only · stored only on this phone', 'cfg.change': 'Change address',
    'cfg.linked': 'Linked patterns (optional)', 'cfg.nTrades': '{n} trades', 'cfg.none': 'none imported', 'cfg.backupOf': 'backup from {d}',
    'cfg.impHint': 'Import radar-backup-ultimo.json from the Radar Gráfico backup folder.', 'cfg.imp': 'Import backup', 'cfg.clr': 'Remove from phone',
    'cfg.trail': 'Trailing SL · rule', 'cfg.trailSub': 'where Radar suggests the SL · relevant = only tops/bottoms after a 2 ATR move on 1h', 'tm.best': 'whatever protects more', 'tm.pivot': 'last top/bottom only', 'tm.relevant': 'relevant top/bottom (1h)', 'tm.entry': 'entry only, at 1R', 'tRel': 'relevant', 'tWait1R': 'waiting for 1R',
    'chShow': 'show 1h chart', 'chHide': 'hide chart', 'chLoading': 'loading candles…', 'chSug': 'suggested SL', 'chPiv': 'relevant top/bottom',
    'vOld': 'Radar Mobile is out of date (v{v})', 'vOldTx': 'The extension already uses the v{e} rule: the suggested SL may not match. Upload the new full zip to GitHub and reopen the app.', 'cfg.rule': 'Trailing SL rule: v{r}',
    'cfg.refresh': 'Refresh', 'cfg.every': 'every 15 s', 'cfg.refreshSub': 'while the page is open; tap “updated” to refresh now',
    'confirmOut': 'Change the address? This address’s positions will no longer be shown.',
    'badFile': 'Invalid file. Use radar-backup-ultimo.json from the Radar Gráfico backup folder.',
    'ot.tpm': 'Take profit', 'ot.tpl': 'Take profit (limit)', 'ot.sm': 'Stop', 'ot.sl': 'Stop (limit)', 'ot.l': 'Limit',
    'src.visto': 'seen by you', 'src.scanner': 'from Scanner', 'src.recon': 'reconstructed', 'src.plano': 'from plan', 'src.card': 'saved card', 'src.manual': 'chosen by you',
  },
};

// nomes dos padrões (vêm em português do Radar Gráfico)
const PAT_EN = {
  'Engolfo de alta': 'Bullish engulfing', 'Engolfo de baixa': 'Bearish engulfing', 'Martelo': 'Hammer', 'Martelo invertido': 'Inverted hammer',
  'Enforcado': 'Hanging man', 'Estrela cadente': 'Shooting star', 'Estrela da manhã': 'Morning star', 'Estrela da noite': 'Evening star',
  'Fundo duplo': 'Double bottom', 'Topo duplo': 'Double top', 'rejeição no 2º fundo': 'rejection at the 2nd bottom', 'rejeição no 2º topo': 'rejection at the 2nd top',
  'OCO': 'Head and shoulders', 'OCO invertido': 'Inverse head and shoulders',
  'Triângulo ascendente': 'Ascending triangle', 'Triângulo descendente': 'Descending triangle', 'Triângulo simétrico': 'Symmetrical triangle',
  'Cunha ascendente': 'Rising wedge', 'Cunha descendente': 'Falling wedge',
  'Rompimento de resistência': 'Resistance breakout', 'Perda de suporte': 'Support breakdown', 'Falso rompimento': 'False breakout',
  'Reteste de suporte perdido': 'Retest of lost support', 'Reteste de resistência rompida': 'Retest of broken resistance',
  'Divergência RSI': 'RSI divergence', 'Divergência MACD': 'MACD divergence',
};

const MONTHS = {
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

let L = 'pt';
// primeira vez: o idioma do celular (português → pt; qualquer outro → en)
export const defaultLang = () => (/^pt\b/i.test(navigator.language || '') ? 'pt' : 'en');
export function setLang(l) { L = l === 'en' ? 'en' : 'pt'; document.documentElement.lang = L === 'en' ? 'en' : 'pt-BR'; }
export const lang = () => L;
export const loc = () => (L === 'en' ? 'en-US' : 'pt-BR');
export function t(k, v) {
  let s = D[L][k] ?? D.pt[k] ?? k;
  if (v) for (const [a, b] of Object.entries(v)) s = s.replaceAll(`{${a}}`, b);
  return s;
}
export const month = (i) => MONTHS[L][i];
// "Topo duplo · rejeição no 2º topo" → "Double top · rejection at the 2nd top"
export function patName(n) {
  if (!n || L === 'pt') return n;
  return PAT_EN[n] || n.split(' · ').map((x) => PAT_EN[x] || x).join(' · ');
}
