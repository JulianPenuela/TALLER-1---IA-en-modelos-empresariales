# Nexo Analytics · Dashboard inteligente con IA

Aplicación web para registrar datos empresariales por **consola**, procesarlos con técnicas de **IA/analítica** y visualizarlos en un **dashboard interactivo**.

**Stack:** HTML5, CSS3, JavaScript, Node.js, Express, Chart.js (incluido localmente en `public/vendor`, no requiere internet).

## Ejecutar
```bash
npm install
npm start            # http://localhost:3000
npm run cli          # consola de registro de ventas (en otra terminal)
npm run seed         # regenera los datos demo
```
Requiere Node.js 18 o superior. El dashboard y la consola comparten `data/records.json`: lo que se registra por consola aparece al recargar/cambiar un filtro en el dashboard.

## Estructura
- `server.js` API REST (Express) · `cli.js` registro por consola
- `lib/analytics.js` motor de IA: KPIs, pronóstico, anomalías, factores de influencia, insights
- `lib/store.js` persistencia y validación · `lib/seed.js` datos demo · `lib/catalog.js` catálogo
- `public/` interfaz (index.html, styles.css, app.js)

## API
`GET /api/analytics?year=&region=&categoria=` · `GET/POST /api/records` · `DELETE /api/records/:id` · `POST /api/reset` · `GET /api/export.csv` · `GET /api/health`

## Despliegue (URL pública)
Render/Railway/Fly: Build `npm install`, Start `npm start`. Use el puerto de la variable `PORT` (ya soportado).
