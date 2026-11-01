/*
 * Verificación sin navegador de las definiciones de gráficas.
 * Crea la escena y renderiza el SVG con los mismos datos de ejemplo del panel,
 * para detectar errores de escalas, canales o tooltip.
 *
 * Ejecutar con: npm test
 */
import assert from 'node:assert/strict';
import { createChartScene } from '@tanstack/charts';
import { renderChartSvg } from '@tanstack/charts/svg';
import { ridesMonthDefinition, topSpeedDefinition } from '../src/charts.js';

function d(y, m, day) {
  return new Date(y, m - 1, day);
}

const monthlyRows = [
  { key: '2026-0', label: 'ene 26', start: d(2026, 1, 1), count: 3, km: 88.4, avgSpeed: 17.2 },
  { key: '2026-1', label: 'feb 26', start: d(2026, 2, 1), count: 0, km: 0, avgSpeed: 0 },
  { key: '2026-2', label: 'mar 26', start: d(2026, 3, 1), count: 5, km: 142.9, avgSpeed: 19.8 }
];

const speedRows = [
  { id: 'a', date: d(2026, 1, 5), dateLabel: '5 ene 2026', maxSpeed: 41.2, avgSpeed: 18.4, overallAvgSpeed: 15.1 },
  { id: 'b', date: d(2026, 2, 11), dateLabel: '11 feb 2026', maxSpeed: 46.7, avgSpeed: 17.9, overallAvgSpeed: 14.6 },
  { id: 'c', date: d(2026, 3, 8), dateLabel: '8 mar 2026', maxSpeed: 52.3, avgSpeed: 20.2, overallAvgSpeed: 16.9 }
];

function render(definition, ariaLabel) {
  const scene = createChartScene(definition, { width: 800, height: 220 });
  assert.ok(scene.points.length > 0, 'la escena debe tener puntos interactivos');
  return renderChartSvg(scene, { ariaLabel });
}

// Rutas por mes: los tres modos construyen y renderizan
['count', 'km', 'avgSpeed'].forEach((_, i) => {
  const svg = render(ridesMonthDefinition(null, monthlyRows, i), 'Rutas por mes');
  assert.ok(svg.includes('<svg'), 'debe renderizar un svg');
  assert.ok(svg.includes('ts-chart__grid'), 'debe incluir la rejilla');
  assert.ok(svg.includes('ene 26'), 'debe incluir las etiquetas de mes');
});

// El SVG del modo distancia incluye los valores del eje y el color de acento
const kmSvg = render(ridesMonthDefinition(null, monthlyRows, 1), 'Rutas por mes');
assert.ok(kmSvg.includes('#ff5839'), 'debe usar el color de acento por defecto');
assert.ok(kmSvg.includes('<circle'), 'debe dibujar los puntos');

// Velocidad por ruta: los tres modos, con eje temporal
['maxSpeed', 'avgSpeed', 'overallAvgSpeed'].forEach((_, i) => {
  const svg = render(topSpeedDefinition(null, speedRows, i), 'Velocidad por ruta');
  assert.ok(svg.includes('<svg'), 'debe renderizar un svg');
  assert.ok(svg.includes('ene') || svg.includes('feb') || svg.includes('mar'), 'debe incluir fechas del eje x');
});

// Una sola ruta: el dominio temporal se expande en lugar de degenerar
const singleRow = [speedRows[0]];
const singleSvg = render(topSpeedDefinition(null, singleRow, 0), 'Velocidad por ruta');
assert.ok(singleSvg.includes('<svg'), 'una sola ruta también renderiza');

// Serie de velocidades a 0-70 km/h: el eje Y se autoajusta por encima de 60
const fast = speedRows.map((r, i) => ({ ...r, id: r.id + i, maxSpeed: 55 + i * 7 }));
const fastSvg = render(topSpeedDefinition(null, fast, 0), 'Velocidad por ruta');
assert.ok(fastSvg.includes('70'), 'el eje Y debe llegar a 70 con una ruta a 69 km/h');

console.log('OK — definiciones de gráficas verificadas (3 modos × 2 gráficas + casos límite)');
