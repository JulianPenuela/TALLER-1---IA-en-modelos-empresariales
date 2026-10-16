// Generador determinista de datos demo (2 años y 9 meses) con tendencia, estacionalidad y eventos atípicos.
const { CATALOGO, REGIONES, SEGMENTOS } = require('./catalog');
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pickW(r, items, w) { let x = r() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < items.length; i++) { x -= w[i]; if (x <= 0) return items[i]; } return items[items.length - 1]; }
function generate() {
  const r = rng(2026), out = []; let id = 1;
  const season = [.90, .85, .95, .95, 1, .97, 1, .98, 1, 1.05, 1.25, 1.40];
  const cats = Object.keys(CATALOGO);
  for (let i = 0; i < 33; i++) {
    const y = 2024 + Math.floor(i / 12), m = i % 12, key = `${y}-${String(m + 1).padStart(2, '0')}`;
    let n = 55 * (1 + 0.02 * i) * season[m];
    if (key === '2025-05') n *= 0.60;   // evento atípico: caída (ej. paro logístico)
    if (key === '2026-03') n *= 1.35;   // evento atípico: campaña promocional
    n = Math.round(n);
    for (let k = 0; k < n; k++) {
      const region = pickW(r, REGIONES, [.42, .25, .20, .13]);
      const cat = pickW(r, cats, [region === 'Andina' ? .42 : .26, .24, .22, .20]);
      const [producto, precio, costo] = CATALOGO[cat][Math.floor(r() * CATALOGO[cat].length)];
      const segmento = pickW(r, SEGMENTOS, cat === 'Electrónica' ? [.2, .38, .2, .13, .09] : [.18, .27, .25, .17, .13]);
      const descuento = pickW(r, [0, 5, 10, 15, 20, 25], [.34, .2, .18, .13, .1, .05]);
      const unidades = 1 + Math.floor(r() * (precio > 1e6 ? 2 : 4)) + (descuento >= 15 ? 1 : 0);
      const dia = 1 + Math.floor(r() * 28);
      out.push({ id: id++, fecha: `${key}-${String(dia).padStart(2, '0')}`, producto, categoria: cat, region, segmento,
        unidades, precio: Math.round(precio * (0.97 + r() * .06)), costo, descuento });
    }
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha)).map((x, i) => ({ ...x, id: i + 1 }));
}
module.exports = { generate };
