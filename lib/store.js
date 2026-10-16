const fs = require('fs'), path = require('path');
const { CATALOGO, REGIONES, SEGMENTOS, categoriaDe } = require('./catalog');
const FILE = path.join(__dirname, '..', 'data', 'records.json');
const save = a => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(a)); };
const reset = () => save(require('./seed').generate());
const load = () => { if (!fs.existsSync(FILE)) reset(); return JSON.parse(fs.readFileSync(FILE, 'utf8')); };
function validate(r) {
  const e = m => { throw new Error(m); };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha) || isNaN(new Date(r.fecha))) e('Fecha inválida (use AAAA-MM-DD)');
  const categoria = categoriaDe(r.producto); if (!categoria) e('Producto no existe en el catálogo');
  if (!REGIONES.includes(r.region)) e('Región inválida');
  if (!SEGMENTOS.includes(r.segmento)) e('Segmento de edad inválido');
  const unidades = Number(r.unidades), precio = Number(r.precio), costo = Number(r.costo), descuento = Number(r.descuento || 0);
  if (!Number.isInteger(unidades) || unidades < 1 || unidades > 1000) e('Unidades debe ser un entero entre 1 y 1000');
  if (!(precio > 0)) e('Precio debe ser mayor a 0');
  if (!(costo >= 0)) e('Costo no puede ser negativo');
  if (!(descuento >= 0 && descuento <= 90)) e('Descuento debe estar entre 0 y 90');
  return { fecha: r.fecha, producto: r.producto, categoria, region: r.region, segmento: r.segmento, unidades, precio, costo, descuento };
}
function add(r) { const a = load(), rec = validate(r); rec.id = a.reduce((m, x) => Math.max(m, x.id), 0) + 1; a.push(rec); save(a); return rec; }
function remove(id) { const a = load(), n = a.filter(x => x.id !== id); if (n.length === a.length) throw new Error('Registro no encontrado'); save(n); }
module.exports = { load, add, remove, reset, validate };
