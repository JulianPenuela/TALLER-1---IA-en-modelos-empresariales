// Catálogo maestro: categoría -> [producto, precio de lista (COP), costo unitario (COP)]
const CATALOGO = {
  'Electrónica': [['Portátil', 2800000, 2100000], ['Smartphone', 1900000, 1450000], ['Audífonos', 320000, 190000]],
  'Hogar':       [['Cafetera', 380000, 230000], ['Aspiradora robot', 1200000, 820000]],
  'Moda':        [['Chaqueta', 260000, 120000], ['Zapatillas', 340000, 170000]],
  'Accesorios':  [['Mochila', 180000, 85000], ['Reloj inteligente', 650000, 430000]]
};
const REGIONES = ['Andina', 'Caribe', 'Pacífico', 'Orinoquía'];
const SEGMENTOS = ['18-24', '25-34', '35-44', '45-54', '55+'];
const categoriaDe = p => Object.keys(CATALOGO).find(c => CATALOGO[c].some(x => x[0] === p));
module.exports = { CATALOGO, REGIONES, SEGMENTOS, categoriaDe };
