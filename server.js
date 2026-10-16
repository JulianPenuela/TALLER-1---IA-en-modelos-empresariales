const express = require('express'), path = require('path');
const store = require('./lib/store'), { analyze, calc } = require('./lib/analytics');
const app = express(), PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const safe = fn => (req, res) => { try { fn(req, res); } catch (e) { res.status(400).json({ error: e.message }); } };
app.get('/api/health', (q, s) => s.json({ ok: true, registros: store.load().length }));
app.get('/api/analytics', safe((q, s) => s.json(analyze(store.load(), q.query))));
app.get('/api/records', safe((q, s) => {
  const lim = Math.min(+q.query.limit || 40, 500);
  s.json(store.load().map(calc).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id).slice(0, lim));
}));
app.post('/api/records', safe((q, s) => s.status(201).json(store.add(q.body))));
app.delete('/api/records/:id', safe((q, s) => { store.remove(+q.params.id); s.json({ ok: true }); }));
app.post('/api/reset', safe((q, s) => { store.reset(); s.json({ ok: true }); }));
app.get('/api/export.csv', safe((q, s) => {
  const h = ['id', 'fecha', 'producto', 'categoria', 'region', 'segmento', 'unidades', 'precio', 'costo', 'descuento', 'ingreso', 'utilidad'];
  const rows = store.load().map(calc).map(r => h.map(k => r[k]).join(','));
  s.type('text/csv').attachment('ventas.csv').send('\ufeff' + [h.join(','), ...rows].join('\n'));
}));
app.listen(PORT, () => console.log(`\n  Dashboard IA listo en http://localhost:${PORT}\n`));
