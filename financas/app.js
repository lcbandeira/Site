const CATS = {
  despesa: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Contas', 'Outros'],
  receita: ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros']
};
const CHAVE = 'carteira-dados-v1';
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = id => document.getElementById(id);

let dados = carregar();
let mesAtual = new Date(); mesAtual.setDate(1);

function carregar() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || { lancs: [], orcs: {} }; }
  catch { return { lancs: [], orcs: {} }; }
}
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch {}
}
const chaveMes = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const tipoSel = () => document.querySelector('input[name=tipo]:checked').value;

function preencherCats() {
  $('cat').innerHTML = CATS[tipoSel()].map(c => `<option>${c}</option>`).join('');
  $('orcCat').innerHTML = CATS.despesa.map(c => `<option>${c}</option>`).join('');
}

function render() {
  const km = chaveMes(mesAtual);
  const rotulo = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  $('mesLabel').textContent = rotulo[0].toUpperCase() + rotulo.slice(1);
  const doMes = dados.lancs.filter(l => l.data.startsWith(km));
  const soma = (arr, t) => arr.filter(l => l.tipo === t && l.pago).reduce((s, l) => s + l.valor, 0);

  const rec = soma(doMes, 'receita'), desp = soma(doMes, 'despesa');
  $('totReceitas').textContent = brl(rec);
  $('totDespesas').textContent = brl(desp);
  const sm = rec - desp;
  $('saldoMes').textContent = brl(sm); $('saldoMes').className = sm >= 0 ? 'pos' : 'neg';
  const sg = soma(dados.lancs, 'receita') - soma(dados.lancs, 'despesa');
  $('saldoGeral').textContent = brl(sg); $('saldoGeral').className = sg >= 0 ? 'pos' : 'neg';

  // gráfico por categoria
  const porCat = {};
  doMes.filter(l => l.tipo === 'despesa').forEach(l => porCat[l.cat] = (porCat[l.cat] || 0) + l.valor);
  const ord = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const max = ord.length ? ord[0][1] : 0;
  $('grafico').innerHTML = ord.length ? ord.map(([c, v]) => barra(c, `${brl(v)} · ${Math.round(v / desp * 100 || 0)}%`, v / max)).join('')
    : '<p class="vazio">Nenhuma despesa neste mês.</p>';

  // orçamentos
  const orcs = Object.entries(dados.orcs).filter(([, v]) => v > 0);
  $('orcamentos').innerHTML = orcs.length ? orcs.map(([c, lim]) => {
    const g = porCat[c] || 0;
    return barra(c, `${brl(g)} de ${brl(lim)}`, g / lim, g > lim);
  }).join('') : '<p class="vazio">Defina limites de gasto por categoria.</p>';

  // lista
  const f = $('filtro').value;
  const lista = doMes.filter(l => f === 'todos' || (f === 'pendente' ? !l.pago : l.tipo === f))
    .sort((a, b) => b.data.localeCompare(a.data));
  $('lista').innerHTML = lista.length ? lista.map(l => `
    <li class="${l.pago ? '' : 'pendente'}">
      <div>${esc(l.desc)}<small>${l.cat} · ${l.data.split('-').reverse().join('/')}${l.pago ? '' : ' · pendente'}</small></div>
      <strong class="valor ${l.tipo === 'receita' ? 'pos' : 'neg'}">${l.tipo === 'receita' ? '+' : '−'} ${brl(l.valor)}</strong>
      <div class="btns">
        <button data-pagar="${l.id}" title="${l.pago ? 'Marcar como pendente' : 'Marcar como pago'}">${l.pago ? '↺' : '✓'}</button>
        <button data-del="${l.id}" title="Excluir">✕</button>
      </div>
    </li>`).join('') : '<li class="vazio">Nenhum lançamento.</li>';
}

function barra(rot, info, frac, estouro = false) {
  return `<div class="barra"><div class="rot"><span>${rot}</span><span>${info}</span></div>
    <div class="trilho"><div class="enche ${estouro ? 'estouro' : ''}" style="width:${Math.min(frac, 1) * 100}%"></div></div></div>`;
}
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

document.querySelectorAll('input[name=tipo]').forEach(r => r.addEventListener('change', preencherCats));

$('form').addEventListener('submit', e => {
  e.preventDefault();
  dados.lancs.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    tipo: tipoSel(), desc: $('desc').value.trim(), valor: parseFloat($('valor').value),
    cat: $('cat').value, data: $('data').value, pago: $('pago').checked
  });
  salvar();
  mesAtual = new Date($('data').value + 'T12:00'); mesAtual.setDate(1);
  $('desc').value = ''; $('valor').value = '';
  render();
});

$('formOrc').addEventListener('submit', e => {
  e.preventDefault();
  dados.orcs[$('orcCat').value] = parseFloat($('orcValor').value) || 0;
  $('orcValor').value = '';
  salvar(); render();
});

$('lista').addEventListener('click', e => {
  const del = e.target.dataset.del, pag = e.target.dataset.pagar;
  if (del && confirm('Excluir este lançamento?')) dados.lancs = dados.lancs.filter(l => l.id !== del);
  if (pag) { const l = dados.lancs.find(l => l.id === pag); l.pago = !l.pago; }
  if (del || pag) { salvar(); render(); }
});

$('filtro').addEventListener('change', render);
$('prev').onclick = () => { mesAtual.setMonth(mesAtual.getMonth() - 1); render(); };
$('next').onclick = () => { mesAtual.setMonth(mesAtual.getMonth() + 1); render(); };

$('exportar').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
  a.download = 'carteira-backup.json'; a.click();
};
$('importar').onchange = async e => {
  try {
    const d = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(d.lancs)) throw 0;
    dados = { lancs: d.lancs, orcs: d.orcs || {} }; salvar(); render();
  } catch { alert('Arquivo de backup inválido.'); }
  e.target.value = '';
};

const hoje = new Date();
$('data').value = chaveMes(hoje) + '-' + String(hoje.getDate()).padStart(2, '0');
preencherCats();
render();
