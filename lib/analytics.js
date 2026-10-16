// Motor analítico: KPIs, series, pronóstico (regresión lineal + estacionalidad), anomalías, factores de influencia e insights.
const { CATALOGO, REGIONES, SEGMENTOS } = require('./catalog');
const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0), avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const group = (a, f) => { const m = {}; a.forEach(x => (m[f(x)] ??= []).push(x)); return m; };
const calc = r => { const ingreso = r.unidades * r.precio * (1 - r.descuento / 100), costoT = r.unidades * r.costo; return { ...r, ingreso, costoT, utilidad: ingreso - costoT }; };
const pct = (a, b) => b ? (a - b) / b * 100 : null;
function money(v) { const a = Math.abs(v), s = v < 0 ? '-' : ''; return a >= 1e9 ? `${s}$${(a / 1e9).toFixed(2)} mil M` : a >= 1e6 ? `${s}$${(a / 1e6).toFixed(1)} M` : a >= 1e3 ? `${s}$${(a / 1e3).toFixed(0)} K` : `${s}$${a.toFixed(0)}`; }
function kpis(a) { const ing = sum(a, x => x.ingreso), ut = sum(a, x => x.utilidad); return { ingresos: ing, utilidad: ut, margen: ing ? ut / ing * 100 : 0, unidades: sum(a, x => x.unidades), transacciones: a.length, ticket: a.length ? ing / a.length : 0 }; }
const label = k => `${MES[+k.slice(5, 7) - 1]} ${k.slice(2, 4)}`;
const nextKey = k => { let y = +k.slice(0, 4), m = +k.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, '0')}`; };

function forecast(keys, vals, h = 6) {
  const n = vals.length; if (n < 8) return null;
  const mx = (n - 1) / 2, my = avg(vals); let sxy = 0, sxx = 0;
  vals.forEach((v, i) => { sxy += (i - mx) * (v - my); sxx += (i - mx) ** 2; });
  const b = sxy / sxx, a = my - b * mx, trend = i => Math.max(a + b * i, 1);
  const sf = {}; keys.forEach((k, i) => (sf[+k.slice(5, 7)] ??= []).push(vals[i] / trend(i)));
  const f = {}; for (let m = 1; m <= 12; m++) f[m] = sf[m] ? avg(sf[m]) : 1;
  const norm = avg(Object.values(f)); Object.keys(f).forEach(m => f[m] /= norm);
  const fit = keys.map((k, i) => trend(i) * f[+k.slice(5, 7)]);
  const res = vals.map((v, i) => v / fit[i]), sd = Math.sqrt(avg(res.map(x => (x - 1) ** 2))) || 0.05;
  const anomalies = keys.map((k, i) => ({ key: k, label: label(k), valor: vals[i], esperado: fit[i], z: (res[i] - 1) / sd }))
    .filter(x => Math.abs(x.z) >= 1.9).sort((x, y) => Math.abs(y.z) - Math.abs(x.z));
  let k = keys[n - 1]; const fc = [];
  for (let j = 0; j < h; j++) { k = nextKey(k); const v = trend(n + j) * f[+k.slice(5, 7)]; fc.push({ key: k, label: label(k), v, lo: v * (1 - 1.28 * sd), hi: v * (1 + 1.28 * sd) }); }
  return { fc, anomalies, ajuste: Math.max(0, 100 - avg(res.map(x => Math.abs(x - 1))) * 100) };
}
const banda = d => d < 5 ? 'Descuento < 5%' : d <= 15 ? 'Descuento 5–15%' : 'Descuento > 15%';
function influencers(a) {
  const dims = { 'Categoría': r => r.categoria, 'Región': r => r.region, 'Edad': r => r.segmento, '': r => banda(r.descuento) };
  const out = [];
  for (const [d, f] of Object.entries(dims)) for (const [v, g] of Object.entries(group(a, f))) {
    const rest = a.filter(r => f(r) !== v); if (g.length < 10 || rest.length < 10) continue;
    out.push({ factor: d ? `${d}: ${v}` : v, lift: pct(avg(g.map(x => x.ingreso)), avg(rest.map(x => x.ingreso))), n: g.length });
  }
  return out.sort((x, y) => Math.abs(y.lift) - Math.abs(x.lift)).slice(0, 7);
}
const resumen = (a, f, total) => Object.entries(group(a, f)).map(([name, g]) => ({ name, ...kpis(g), share: total ? sum(g, x => x.ingreso) / total * 100 : 0 })).sort((x, y) => y.ingresos - x.ingresos);

function analyze(raw, { year, region, categoria } = {}) {
  const all = raw.map(calc), years = [...new Set(all.map(r => +r.fecha.slice(0, 4)))].sort();
  const meta = { years, regiones: REGIONES, categorias: Object.keys(CATALOGO), segmentos: SEGMENTOS, catalogo: CATALOGO };
  const base = all.filter(r => (!region || r.region === region) && (!categoria || r.categoria === categoria));
  const y = +year || years[years.length - 1] || new Date().getFullYear();
  const yr = r => +r.fecha.slice(0, 4), mo = r => +r.fecha.slice(5, 7);
  const cur = base.filter(r => yr(r) === y), maxM = Math.max(0, ...cur.map(mo));
  const prev = base.filter(r => yr(r) === y - 1 && mo(r) <= maxM);
  const k = kpis(cur), p = kpis(prev), hasPrev = prev.length > 0;
  const delta = { ingresos: pct(k.ingresos, p.ingresos), utilidad: pct(k.utilidad, p.utilidad), margen: hasPrev ? k.margen - p.margen : null, unidades: pct(k.unidades, p.unidades), ticket: pct(k.ticket, p.ticket) };
  const bm = group(cur, mo), spark = { ingresos: [], utilidad: [], margen: [], unidades: [], ticket: [] };
  for (let m = 1; m <= maxM; m++) { const s = kpis(bm[m] || []); Object.keys(spark).forEach(q => spark[q].push(s[q])); }
  const g = group(base, r => r.fecha.slice(0, 7)), ks = Object.keys(g).sort(), keys = [];
  if (ks.length) for (let c = ks[0]; c <= ks[ks.length - 1]; c = nextKey(c)) keys.push(c);
  const ing = keys.map(c => sum(g[c] || [], x => x.ingreso)), mar = keys.map(c => kpis(g[c] || []).margen);
  const fo = forecast(keys, ing), H = 18, tail = keys.slice(-H);
  const join = fn => fo ? [...tail.map((_, i) => i === tail.length - 1 ? ing[ing.length - 1] : null), ...fo.fc.map(fn)] : [];
  const trend = { labels: [...tail.map(label), ...(fo ? fo.fc.map(x => x.label) : [])], actual: [...ing.slice(-H), ...(fo ? fo.fc.map(() => null) : [])],
    forecast: join(x => x.v), low: join(x => x.lo), high: join(x => x.hi) };
  const monthly = { labels: keys.map(label), ingresos: ing, margen: mar };
  const regiones = resumen(cur, r => r.region, k.ingresos), categorias = resumen(cur, r => r.categoria, k.ingresos),
    segmentos = resumen(cur, r => r.segmento, k.ingresos).sort((x, y) => SEGMENTOS.indexOf(x.name) - SEGMENTOS.indexOf(y.name)),
    productos = resumen(cur, r => r.producto, k.ingresos), infl = influencers(cur);
  const ins = [];
  if (delta.ingresos != null) ins.push({ tipo: delta.ingresos >= 0 ? 'ok' : 'alerta', titulo: 'Crecimiento de ingresos', texto: `Los ingresos de ${y} suman ${money(k.ingresos)}, un ${Math.abs(delta.ingresos).toFixed(1)}% ${delta.ingresos >= 0 ? 'más' : 'menos'} que el mismo periodo de ${y - 1}.` });
  if (categorias.length) { const m = [...categorias].sort((a, b) => b.margen - a.margen)[0]; ins.push({ tipo: 'info', titulo: 'Categoría más rentable', texto: `${m.name} tiene el mejor margen (${m.margen.toFixed(1)}%) y aporta ${m.share.toFixed(0)}% de los ingresos.` }); }
  if (regiones.length > 1) ins.push({ tipo: 'info', titulo: 'Concentración regional', texto: `${regiones[0].name} concentra ${regiones[0].share.toFixed(0)}% de las ventas; ${regiones[regiones.length - 1].name} es la región con menor participación (${regiones[regiones.length - 1].share.toFixed(0)}%).` });
  if (fo) { const nx = sum(fo.fc, x => x.v), ls = sum(ing.slice(-6), x => x), d = pct(nx, ls); ins.push({ tipo: d >= 0 ? 'ok' : 'alerta', titulo: 'Pronóstico a 6 meses', texto: `El modelo proyecta ${money(nx)} en los próximos 6 meses (${d >= 0 ? '+' : ''}${d.toFixed(1)}% frente a los 6 meses previos), con un ajuste histórico de ${fo.ajuste.toFixed(0)}%.` }); }
  if (fo && fo.anomalies.length) { const a = fo.anomalies[0]; ins.push({ tipo: 'alerta', titulo: 'Anomalía detectada', texto: `${a.label}: ingresos ${a.z < 0 ? 'inferiores' : 'superiores'} a lo esperado (${money(a.valor)} vs ${money(a.esperado)}). Conviene revisar la causa.` }); }
  const dsc = cur.filter(r => r.descuento > 15), nod = cur.filter(r => r.descuento < 5);
  if (dsc.length > 10 && nod.length > 10) { const a = kpis(dsc).margen, b = kpis(nod).margen; ins.push({ tipo: a < b ? 'alerta' : 'info', titulo: 'Efecto de los descuentos', texto: `Con descuentos >15% el margen es ${a.toFixed(1)}% frente a ${b.toFixed(1)}% sin descuento (${(b - a).toFixed(1)} pp de diferencia).` }); }
  if (infl[0]) ins.push({ tipo: 'info', titulo: 'Principal factor de influencia', texto: `${infl[0].factor} ${infl[0].lift >= 0 ? 'eleva' : 'reduce'} el ingreso por transacción en ${Math.abs(infl[0].lift).toFixed(1)}% frente al resto.` });
  return { meta, year: y, kpis: k, prev: p, delta, spark, trend, monthly, regiones, categorias, segmentos, productos, influencers: infl,
    anomalies: fo ? fo.anomalies.slice(0, 5) : [], forecast: fo ? fo.fc : [], ajuste: fo ? fo.ajuste : null, insights: ins, registros: cur.length };
}
module.exports = { analyze, calc, money, kpis };
