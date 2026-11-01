/*
 * Bikeme — gráficas del panel con TanStack Charts.
 *
 * Este módulo es la única parte del frontend que usa dependencias. Se compila
 * con `npm run build` a charts.bundle.js (IIFE, global `BikemeCharts`), que se
 * carga antes de app.js. El resto del sitio sigue siendo vanilla.
 *
 * app.js sigue siendo el dueño de los datos: prepara las filas (getRows) y
 * aquí solo se declaran las gráficas, sus escalas y el tooltip.
 */
import { defineChart, lineY, mountChart } from '@tanstack/charts';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { tooltip } from '@tanstack/charts/tooltip';
import { portal } from '@tanstack/charts/tooltip/portal';
import { scaleTime } from 'd3-scale';

var FALLBACK_COLOR = '#ff5839';
var GRID = { strokeOpacity: 0.08 };

var MONTHLY_MODES = [
  { key: 'count', label: 'Rutas', tooltipItem: 'Rutas', format: function (v) { return Math.round(v) + ' rutas'; } },
  { key: 'km', label: 'Distancia', tooltipItem: 'Distancia', format: function (v) { return v.toFixed(1) + ' km'; } },
  { key: 'avgSpeed', label: 'Vel. media', tooltipItem: 'Vel. media', format: function (v) { return v.toFixed(1) + ' km/h'; } }
];

var SPEED_MODES = [
  { key: 'maxSpeed', label: 'Velocidad Máxima' },
  { key: 'avgSpeed', label: 'Vel. Media (movimiento)' },
  { key: 'overallAvgSpeed', label: 'Vel. Media (con paradas)' }
];

/* Color de acento leído de las variables CSS del contenedor. Se resuelve a un
   valor concreto porque los paints SVG se emiten como atributos, donde var()
   no es fiable en todos los navegadores. */
function accentColor(container) {
  if (!container || typeof getComputedStyle !== 'function') return FALLBACK_COLOR;
  var value = getComputedStyle(container).getPropertyValue('--chart-1').trim();
  return value || FALLBACK_COLOR;
}

function monthRange(start) {
  var end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  var opts = { month: 'long', day: 'numeric', year: 'numeric' };
  return start.toLocaleDateString('es-ES', opts) + ' – ' + end.toLocaleDateString('es-ES', opts);
}

function shortDate(d) {
  return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

function intTick(v) {
  return String(Math.round(v));
}

/* Rutas por mes: count / km / avgSpeed (filas de getRidesMonthlyData) */
export function ridesMonthDefinition(container, rows, modeIndex) {
  var mode = MONTHLY_MODES[modeIndex] || MONTHLY_MODES[0];
  var maxVal = 1;
  rows.forEach(function (r) { if (r[mode.key] > maxVal) maxVal = r[mode.key]; });

  var xScale = scalePoint().domain(rows.map(function (r) { return r.label; })).padding(0.15);
  var yScale = scaleLinear().domain([0, maxVal]).nice();

  return defineChart({
    marks: [
      lineY(rows, {
        id: 'rides-month',
        x: 'label',
        y: mode.key,
        key: 'key',
        points: true,
        stroke: accentColor(container),
        strokeWidth: 2.5
      })
    ],
    scales: {
      x: { scale: xScale },
      y: {
        scale: yScale,
        grid: GRID,
        axis: { ticks: { count: 4, format: intTick } }
      }
    },
    focus: 'nearest-x',
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: {
      use: tooltip,
      portal: portal,
      items: [
        { channel: 'y', label: mode.tooltipItem, text: function (p) { return mode.format(p.yValue); } },
        { id: 'period', label: 'Periodo', text: function (p) { return monthRange(p.datum.start); } }
      ]
    }
  });
}

/* Velocidad por ruta: eje X temporal y Y con base 0 autoajustada */
export function topSpeedDefinition(container, rows, modeIndex) {
  var mode = SPEED_MODES[modeIndex] || SPEED_MODES[0];
  var maxVal = 1;
  rows.forEach(function (r) { if (r[mode.key] > maxVal) maxVal = r[mode.key]; });

  var first = rows[0].date;
  var last = rows[rows.length - 1].date;
  if (first.getTime() === last.getTime()) {
    first = new Date(first.getTime() - 86400000);
    last = new Date(last.getTime() + 86400000);
  }
  var xScale = scaleTime().domain([first, last]);
  var yScale = scaleLinear().domain([0, maxVal]).nice();

  return defineChart({
    marks: [
      lineY(rows, {
        id: 'top-speed',
        x: 'date',
        y: mode.key,
        key: 'id',
        points: true,
        stroke: accentColor(container),
        strokeWidth: 2.5
      })
    ],
    scales: {
      x: { scale: xScale, axis: { ticks: { format: shortDate } } },
      y: {
        scale: yScale,
        grid: GRID,
        axis: { ticks: { count: 4, format: intTick } }
      }
    },
    focus: 'nearest-x',
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip: {
      use: tooltip,
      portal: portal,
      items: [
        { channel: 'y', label: mode.label, text: function (p) { return p.yValue.toFixed(1) + ' km/h'; } },
        { field: 'dateLabel', label: 'Fecha' }
      ]
    }
  });
}

function debounce(fn, ms) {
  var timer;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

/*
 * Monta (o actualiza) una gráfica dentro de `container` y la mantiene al día:
 * - `buildDefinition()` se llama en cada render, así que refleja modos y datos.
 * - La altura se lee del contenedor (media queries de styles.css) y se
 *   sincroniza al redimensionar la ventana; el ancho lo sigue el host solo.
 */
function createController(container, buildDefinition, buildAriaLabel) {
  var host = null;

  function options() {
    return {
      definition: buildDefinition(),
      height: container.clientHeight || 220,
      initialWidth: container.clientWidth || 640,
      ariaLabel: buildAriaLabel()
    };
  }

  function render() {
    if (!container.isConnected) return;
    if (host) host.update(options());
    else host = mountChart(container, options());
  }

  window.addEventListener('resize', debounce(function () {
    if (host) host.update(options());
  }, 150));

  return { render: render };
}

export function createRidesMonthChart(container, getRows) {
  var modeIndex = 0;
  var controller = createController(
    container,
    function () { return ridesMonthDefinition(container, getRows(), modeIndex); },
    function () { return 'Rutas por mes: ' + MONTHLY_MODES[modeIndex].label; }
  );
  return {
    render: function () { controller.render(); },
    setMode: function (mode) { modeIndex = mode; controller.render(); }
  };
}

export function createTopSpeedChart(container, getRows) {
  var modeIndex = 0;
  var controller = createController(
    container,
    function () { return topSpeedDefinition(container, getRows(), modeIndex); },
    function () { return 'Velocidad por ruta: ' + SPEED_MODES[modeIndex].label; }
  );
  return {
    render: function () { controller.render(); },
    setMode: function (mode) { modeIndex = mode; controller.render(); }
  };
}
