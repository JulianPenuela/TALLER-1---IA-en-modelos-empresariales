const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const money = v => { const a = Math.abs(v), s = v < 0 ? '-' : ''; return a >= 1e9 ? `${s}$${(a / 1e9).toFixed(2)} mil M` : a >= 1e6 ? `${s}$${(a / 1e6).toFixed(1)} M` : a >= 1e3 ? `${s}$${(a / 1e3).toFixed(0)} K` : `${s}$${a.toFixed(0)}`; };
const cop = v => '$' + Math.round(v).toLocaleString('es-CO'), num = v => Math.round(v).toLocaleString('es-CO');
const PAL = ['#4f46e5', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];
const TITLES = { resumen: 'Resumen ejecutivo', tendencias: 'Tendencias y pronóstico', clientes: 'Clientes y regiones', productos: 'Productos', datos: 'Datos y registro' };
const charts = {}; let D = null, booted = false;

function mk(id, cfg) {
  charts[id]?.destroy();
  cfg.options = { responsive: true, maintainAspectRatio: false, animation: { duration: 500 }, ...cfg.options };
  charts[id] = new Chart($('#' + id), cfg);
}
const axis = (cb) => ({ grid: { color: css('--line') }, border: { display: false }, ticks: { callback: cb || (v => money(v)) } });
const noGrid = { grid: { display: false }, border: { display: false } };
const tip = { callbacks: { label: c => ` ${c.dataset.label ? c.dataset.label + ': ' : ''}${money(c.parsed.y ?? c.parsed.x ?? c.parsed)}` } };

async function api(url, opt) { const r = await fetch(url, opt); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Error'); return j; }
const qs = () => new URLSearchParams({ year: $('#fYear').value, region: $('#fRegion').value, categoria: $('#fCat').value });

async function load() {
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.color = css('--mut');
  D = await api('/api/analytics?' + qs());
  if (!booted) boot();
  $('#sub').textContent = `Año ${D.year} · ${D.registros} transacciones${$('#fRegion').value ? ' · ' + $('#fRegion').value : ''}${$('#fCat').value ? ' · ' + $('#fCat').value : ''}`;
  renderKpis(); renderResumen(); renderTend(); renderClientes(); renderProd();
  if ($('#v-datos').classList.contains('on')) loadRecords();
}

function boot() {
  booted = true;
  $('#fYear').innerHTML = D.meta.years.slice().reverse().map(y => `<option>${y}</option>`).join('');
  $('#fRegion').innerHTML = '<option value="">Todas las regiones</option>' + D.meta.regiones.map(r => `<option>${r}</option>`).join('');
  $('#fCat').innerHTML = '<option value="">Todas las categorías</option>' + D.meta.categorias.map(r => `<option>${r}</option>`).join('');
  $('#fYear').value = D.year;
  $('#fmCat').innerHTML = D.meta.categorias.map(c => `<option>${c}</option>`).join('');
  $('#fmReg').innerHTML = D.meta.regiones.map(r => `<option>${r}</option>`).join('');
  $('#fmSeg').innerHTML = D.meta.segmentos.map(r => `<option>${r}</option>`).join('');
  fillProducts(); $('#form').fecha.value = new Date().toISOString().slice(0, 10);
}
function fillProducts() {
  const list = D.meta.catalogo[$('#fmCat').value];
  $('#fmProd').innerHTML = list.map(p => `<option>${p[0]}</option>`).join(''); prefill();
}
function prefill() { const p = D.meta.catalogo[$('#fmCat').value].find(x => x[0] === $('#fmProd').value); if (p) { $('#form').precio.value = p[1]; $('#form').costo.value = p[2]; } }

function renderKpis() {
  const k = D.kpis, d = D.delta, sp = D.spark;
  const items = [['Ingresos totales', money(k.ingresos), d.ingresos, '%', 'ingresos'], ['Utilidad neta', money(k.utilidad), d.utilidad, '%', 'utilidad'],
    ['Margen de utilidad', k.margen.toFixed(1) + '%', d.margen, ' pp', 'margen'], ['Unidades vendidas', num(k.unidades), d.unidades, '%', 'unidades'], ['Ticket promedio', money(k.ticket), d.ticket, '%', 'ticket']];
  $('#kpis').innerHTML = items.map((x, i) => `<div class="kpi"><div class="l">${x[0]}</div><div class="v">${x[1]}</div>
    <div class="d ${x[2] == null ? '' : x[2] >= 0 ? 'up' : 'down'}">${x[2] == null ? '—' : (x[2] >= 0 ? '▲ ' : '▼ ') + Math.abs(x[2]).toFixed(1) + x[3]} <small>vs ${D.year - 1}</small></div><canvas id="sp${i}"></canvas></div>`).join('');
  items.forEach((x, i) => { const up = x[2] == null || x[2] >= 0;
    mk('sp' + i, { type: 'line', data: { labels: sp[x[4]].map((_, j) => j), datasets: [{ data: sp[x[4]], borderColor: up ? '#10b981' : '#ef4444', borderWidth: 2, pointRadius: 0, tension: .4, fill: true, backgroundColor: (up ? '#10b981' : '#ef4444') + '1f' }] },
      options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } } }); });
}

function renderResumen() {
  const t = D.trend;
  mk('cTrend', { type: 'line', data: { labels: t.labels, datasets: [
    { label: 'Banda superior', data: t.high, borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: '#8b5cf622' },
    { label: 'Banda inferior', data: t.low, borderWidth: 0, pointRadius: 0, fill: false },
    { label: 'Ingresos', data: t.actual, borderColor: '#4f46e5', backgroundColor: '#4f46e5', borderWidth: 2.5, tension: .35, pointRadius: 3 },
    { label: 'Pronóstico IA', data: t.forecast, borderColor: '#8b5cf6', borderDash: [6, 5], borderWidth: 2.5, tension: .35, pointRadius: 3, pointStyle: 'rectRot' }] },
    options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, filter: i => !i.text.startsWith('Banda') } }, tooltip: { ...tip, filter: i => !i.dataset.label.startsWith('Banda') } }, scales: { x: noGrid, y: axis() } } });
  mk('cRegion', { type: 'doughnut', data: { labels: D.regiones.map(r => r.name), datasets: [{ data: D.regiones.map(r => r.ingresos), backgroundColor: PAL, borderColor: css('--card'), borderWidth: 3 }] },
    options: { cutout: '64%', plugins: { legend: { position: 'right', labels: { usePointStyle: true } }, tooltip: { callbacks: { label: c => ` ${c.label}: ${money(c.parsed)} (${D.regiones[c.dataIndex].share.toFixed(1)}%)` } } } } });
  const cats = [...D.categorias].sort((a, b) => b.utilidad - a.utilidad);
  mk('cCat', { type: 'bar', data: { labels: cats.map(c => c.name), datasets: [{ label: 'Utilidad', data: cats.map(c => c.utilidad), backgroundColor: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'], borderRadius: 6 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: tip }, scales: { x: axis(), y: noGrid } } });
  const mx = Math.max(...D.influencers.map(i => Math.abs(i.lift)), 1);
  $('#infl').innerHTML = D.influencers.map(i => { const w = Math.abs(i.lift) / mx * 50;
    return `<div class="ir"><span>${i.factor}</span><div class="bar"><i class="${i.lift >= 0 ? 'pos' : 'neg'}" style="width:${w}%">${i.lift >= 0 ? '+' : ''}${i.lift.toFixed(1)}%</i></div></div>`; }).join('') || '<p class="mut">Sin datos suficientes</p>';
  $('#insights').innerHTML = D.insights.map(i => `<div class="ins ${i.tipo}"><b>${i.titulo}</b>${i.texto}</div>`).join('') || '<p class="mut">Sin datos suficientes</p>';
}

function renderTend() {
  const m = D.monthly;
  mk('cCombo', { data: { labels: m.labels, datasets: [
    { type: 'bar', label: 'Ingresos', data: m.ingresos, backgroundColor: '#4f46e5cc', borderRadius: 5, yAxisID: 'y' },
    { type: 'line', label: 'Margen %', data: m.margen, borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: .35, pointRadius: 2, yAxisID: 'y1' }] },
    options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.dataset.yAxisID === 'y1' ? c.parsed.y.toFixed(1) + '%' : money(c.parsed.y)}` } } },
      scales: { x: { ...noGrid, ticks: { maxTicksLimit: 12 } }, y: axis(), y1: { position: 'right', grid: { display: false }, border: { display: false }, ticks: { callback: v => v + '%' } } } } });
  $('#anom').innerHTML = D.anomalies.map(a => `<div class="an"><div><b>${a.label}</b><small>Real ${money(a.valor)} · esperado ${money(a.esperado)}</small></div><span class="pill ${a.z < 0 ? 'down' : 'up'}">${a.z < 0 ? '▼' : '▲'} z=${a.z.toFixed(1)}</span></div>`).join('') || '<p class="mut">No se detectaron anomalías.</p>';
  $('#ajuste').textContent = D.ajuste != null ? `Ajuste del modelo: ${D.ajuste.toFixed(0)}%` : 'Datos insuficientes';
  $('#tFc').innerHTML = '<tr><th>Mes</th><th class="r">Ingreso esperado</th><th class="r">Rango inferior (80%)</th><th class="r">Rango superior (80%)</th></tr>' +
    D.forecast.map(f => `<tr><td>${f.label}</td><td class="r"><b>${money(f.v)}</b></td><td class="r">${money(f.lo)}</td><td class="r">${money(f.hi)}</td></tr>`).join('');
}

function renderClientes() {
  const s = D.segmentos;
  mk('cSeg', { type: 'bar', data: { labels: s.map(x => x.name), datasets: [{ label: 'Ingresos', data: s.map(x => x.ingresos), backgroundColor: PAL[1], borderRadius: 6 }] }, options: { plugins: { legend: { display: false }, tooltip: tip }, scales: { x: noGrid, y: axis() } } });
  mk('cTicket', { type: 'line', data: { labels: s.map(x => x.name), datasets: [{ label: 'Ticket', data: s.map(x => x.ticket), borderColor: PAL[0], backgroundColor: '#4f46e522', fill: true, tension: .35, pointRadius: 5 }] }, options: { plugins: { legend: { display: false }, tooltip: tip }, scales: { x: noGrid, y: axis() } } });
  $('#tReg').innerHTML = '<tr><th>Región</th><th class="r">Ingresos</th><th class="r">Participación</th><th class="r">Utilidad</th><th class="r">Margen</th><th class="r">Transacciones</th></tr>' +
    D.regiones.map(r => `<tr><td><b>${r.name}</b></td><td class="r">${money(r.ingresos)}</td><td class="r">${r.share.toFixed(1)}%</td><td class="r">${money(r.utilidad)}</td><td class="r">${r.margen.toFixed(1)}%</td><td class="r">${num(r.transacciones)}</td></tr>`).join('');
}
function renderProd() {
  const p = D.productos;
  mk('cProd', { type: 'bar', data: { labels: p.map(x => x.name), datasets: [{ label: 'Ingresos', data: p.map(x => x.ingresos), backgroundColor: p.map((_, i) => PAL[i % PAL.length]), borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: tip }, scales: { x: axis(), y: noGrid } } });
  $('#tProd').innerHTML = '<tr><th>Producto</th><th class="r">Unidades</th><th class="r">Utilidad</th><th class="r">Margen</th></tr>' +
    p.map(x => `<tr><td><b>${x.name}</b></td><td class="r">${num(x.unidades)}</td><td class="r">${money(x.utilidad)}</td><td class="r"><span class="pill ${x.margen >= D.kpis.margen ? 'up' : 'down'}">${x.margen.toFixed(1)}%</span></td></tr>`).join('');
}
async function loadRecords() {
  const r = await api('/api/records?limit=60'); $('#cnt').textContent = `Mostrando ${r.length} más recientes`;
  $('#tRec').innerHTML = '<tr><th>ID</th><th>Fecha</th><th>Producto</th><th>Región</th><th class="r">Und.</th><th class="r">Ingreso</th><th class="r">Utilidad</th><th></th></tr>' +
    r.map(x => `<tr><td>#${x.id}</td><td>${x.fecha}</td><td>${x.producto}</td><td>${x.region}</td><td class="r">${x.unidades}</td><td class="r">${cop(x.ingreso)}</td><td class="r">${cop(x.utilidad)}</td><td><button class="x" data-del="${x.id}" title="Eliminar">✕</button></td></tr>`).join('');
}

$('#nav').onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.view;
  $$('#nav button').forEach(x => x.classList.toggle('on', x === b)); $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  $('#title').textContent = TITLES[v]; if (v === 'datos') loadRecords(); window.dispatchEvent(new Event('resize')); };
['#fYear', '#fRegion', '#fCat'].forEach(s => $(s).onchange = load);
$('#fmCat').onchange = fillProducts; $('#fmProd').onchange = prefill;
$('#theme').onclick = () => { const d = document.documentElement; d.dataset.theme = d.dataset.theme === 'dark' ? '' : 'dark'; localStorage.setItem('theme', d.dataset.theme); load(); };
$('#form').onsubmit = async e => { e.preventDefault(); const m = $('#msg'), f = Object.fromEntries(new FormData(e.target));
  try { const r = await api('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    m.className = 'msg ok'; m.textContent = `✔ Venta #${r.id} registrada`; await load(); } catch (err) { m.className = 'msg err'; m.textContent = '✖ ' + err.message; } };
$('#tRec').onclick = async e => { const id = e.target.dataset.del; if (id && confirm(`¿Eliminar el registro #${id}?`)) { await api('/api/records/' + id, { method: 'DELETE' }); load(); } };
$('#reset').onclick = async () => { if (confirm('Esto reemplazará TODOS los datos por datos demo. ¿Continuar?')) { await api('/api/reset', { method: 'POST' }); load(); } };
document.documentElement.dataset.theme = localStorage.getItem('theme') || '';
load();
