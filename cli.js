#!/usr/bin/env node
// Registro de datos empresariales por consola. Comparte el mismo almacén que el dashboard.
const rl = require('readline/promises').createInterface({ input: process.stdin, output: process.stdout });
const store = require('./lib/store'), { CATALOGO, REGIONES, SEGMENTOS } = require("./lib/catalog"), { analyze, money, calc } = require('./lib/analytics');
const c = { b: s => `\x1b[1m${s}\x1b[0m`, g: s => `\x1b[32m${s}\x1b[0m`, r: s => `\x1b[31m${s}\x1b[0m`, d: s => `\x1b[2m${s}\x1b[0m`, c: s => `\x1b[36m${s}\x1b[0m` };
async function pick(t, opts) { console.log(c.b(t)); opts.forEach((o, i) => console.log(`  ${c.c(i + 1)}. ${o}`)); for (;;) { const n = +await rl.question('  > '); if (n >= 1 && n <= opts.length) return opts[n - 1]; console.log(c.r('  Opción inválida')); } }
async function ask(t, def, fn) { for (;;) { const v = (await rl.question(`${t}${def !== undefined ? c.d(` [${def}]`) : ''}: `)).trim() || String(def ?? ''); try { return fn(v); } catch (e) { console.log(c.r('  ' + e.message)); } } }
const numero = (min, max, ent) => v => { const n = Number(v); if (v === '' || isNaN(n) || n < min || n > max || (ent && !Number.isInteger(n))) throw new Error(`Ingrese un ${ent ? 'entero' : 'número'} entre ${min} y ${max}`); return n; };
const fecha = v => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v))) throw new Error('Formato AAAA-MM-DD'); return v; };
async function registrarVenta() {
  console.log(c.b('\n── Nueva venta ──'));
  const f = await ask('Fecha (AAAA-MM-DD)', new Date().toISOString().slice(0, 10), fecha);
  const cat = await pick('Categoría', Object.keys(CATALOGO));
  const nombre = await pick('Producto', CATALOGO[cat].map(x => x[0]));
  const [, p0, c0] = CATALOGO[cat].find(x => x[0] === nombre);
  const region = await pick('Región', REGIONES), segmento = await pick('Segmento de edad del cliente', SEGMENTOS);
  const unidades = await ask('Unidades', 1, numero(1, 1000, true));
  const precio = await ask('Precio unitario COP', p0, numero(1, 1e9));
  const costo = await ask('Costo unitario COP', c0, numero(0, 1e9));
  const descuento = await ask('Descuento %', 0, numero(0, 90));
  const rec = store.add({ fecha: f, producto: nombre, region, segmento, unidades, precio, costo, descuento });
  const x = calc(rec);
  console.log(c.g(`\n✔ Venta #${rec.id} registrada: ingreso ${money(x.ingreso)} · utilidad ${money(x.utilidad)}`));
}
function listar() { console.log(c.b('\n── Últimos 10 registros ──')); store.load().slice(-10).reverse().map(calc).forEach(r => console.log(`#${String(r.id).padEnd(5)} ${r.fecha}  ${r.producto.padEnd(18)} ${r.region.padEnd(10)} ${String(r.unidades).padStart(3)} u  ${money(r.ingreso).padStart(10)}`)); }
function resumen() { const a = analyze(store.load()); console.log(c.b(`\n── Resumen ${a.year} ──`)); console.log(`Ingresos: ${money(a.kpis.ingresos)}   Utilidad: ${money(a.kpis.utilidad)}   Margen: ${a.kpis.margen.toFixed(1)}%   Unidades: ${a.kpis.unidades}`); console.log(c.b('\nInsights de IA:')); a.insights.forEach(i => console.log(` • ${c.c(i.titulo)}: ${i.texto}`)); }
(async () => {
  console.log(c.b('\n  DASHBOARD IA · Consola de registro de datos'));
  for (;;) {
    console.log(`\n  ${c.c(1)}. Registrar venta   ${c.c(2)}. Ver últimos registros   ${c.c(3)}. Resumen e insights IA\n  ${c.c(4)}. Regenerar datos demo   ${c.c(5)}. Eliminar registro por ID   ${c.c(0)}. Salir`);
    const o = (await rl.question('\n  Opción: ')).trim();
    try {
      if (o === '1') await registrarVenta(); else if (o === '2') listar(); else if (o === '3') resumen();
      else if (o === '4') { if ((await rl.question('  ¿Reemplazar TODOS los datos por datos demo? (s/N): ')).toLowerCase() === 's') { store.reset(); console.log(c.g('✔ Datos demo generados')); } }
      else if (o === '5') { store.remove(Number(await rl.question('  ID: '))); console.log(c.g('✔ Registro eliminado')); }
      else if (o === '0') break; else console.log(c.r('  Opción inválida'));
    } catch (e) { console.log(c.r('  Error: ' + e.message)); }
  }
  rl.close();
})();
