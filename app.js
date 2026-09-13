(function(){
'use strict';

// ── Storage (server-side JSON file via /api/data — see server.py) ───
let rides = [];
let fakeFlag = true;

async function loadData(){
  try{
    var res = await fetch('/api/data');
    var data = await res.json();
    if(Array.isArray(data.rides) && data.rides.length){
      rides = data.rides;
      fakeFlag = data.isFake !== false;
      return;
    }
    // One-time migration from old localStorage-based version
    var legacy = localStorage.getItem('bici_rides');
    if(legacy){
      var parsed = JSON.parse(legacy) || [];
      if(parsed.length){
        rides = parsed;
        fakeFlag = localStorage.getItem('bici_is_fake') !== 'false';
        persist();
        return;
      }
    }
    fakeFlag = data.isFake !== false;
  }catch(e){ /* server offline — start with empty data */ }
}

function persist(){
  return fetch('/api/data', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({rides: rides, isFake: fakeFlag})
  }).catch(function(){});
}
function isFake(){ return fakeFlag; }
function setReal(){ fakeFlag = false; persist(); }
function setFake(){ fakeFlag = true; persist(); }

// ── Fake Data Generator ──────────────────────────────────────────────
function generateFakeData(){
  const rides = [];
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 8);

  const names = [];
  for(let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)){
    names.push(new Date(d));
  }

  const usedDates = new Set();
  const numRides = 45 + Math.floor(Math.random() * 20);

  for(let i = 0; i < numRides; i++){
    let date;
    let attempts = 0;
    do {
      date = names[Math.floor(Math.random() * names.length)];
      attempts++;
    } while(usedDates.has(date.toISOString().slice(0,10)) && attempts < 100);
    usedDates.add(date.toISOString().slice(0,10));

    const distance = 8 + Math.random() * 65;
    const avgSpeed = 14 + Math.random() * 16;
    const overallAvgSpeed = avgSpeed * (0.65 + Math.random() * 0.25);
    const duration = (distance / avgSpeed) * 60;
    const baseAlt = 200 + Math.floor(Math.random() * 600);

    rides.push({
      id: crypto.randomUUID ? crypto.randomUUID() : 'r'+i+'_'+Date.now(),
      date: date.toISOString().slice(0,10),
      distance: +distance.toFixed(2),
      avgSpeed: +avgSpeed.toFixed(1),
      overallAvgSpeed: +overallAvgSpeed.toFixed(1),
      maxSpeed: +(avgSpeed + 5 + Math.random() * 12).toFixed(1),
      duration: +duration.toFixed(0),
      baseAltitude: baseAlt,
      source: 'fake'
    });
  }

  rides.sort((a,b) => new Date(b.date) - new Date(a.date));
  return rides;
}

// ── State ────────────────────────────────────────────────────────────
let currentPage = 'dashboard';
let calYear, calMonth;

// ── Init ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

async function init(){
  await loadData();
  if(!rides.length){
    rides = generateFakeData();
    fakeFlag = true;
    persist();
  }
  updateDataStatus();

  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();

  updateDateDisplay();
  setupNav();
  setupUpload();
  setupMobileMenu();
  setupExampleDataButton();
  setupThemeToggle();

  setTimeout(function(){
    document.getElementById('skeletonLoader').style.display = 'none';
    renderPage(currentPage);
  }, 600);
}

// ── Theme ────────────────────────────────────────────────────────────
function setupThemeToggle(){
  var btn = document.getElementById('themeToggle');
  if(!btn) return;
  var apply = function(){
    var dark = document.documentElement.classList.contains('dark');
    btn.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
  };
  apply();
  btn.addEventListener('click', function(){
    var dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('bici_theme', dark ? 'dark' : 'light');
    apply();
    if(currentPage === 'dashboard'){
      drawRidesMonthChart();
      drawTopSpeedChart();
    }
  });
}

function chartTheme(){
  var dark = document.documentElement.classList.contains('dark');
  return {
    dark: dark,
    grid: dark ? 'rgba(246,244,244,0.08)' : 'rgba(40,24,21,0.08)',
    axis: dark ? '#b39c98' : '#846762',
    text: dark ? '#f6f4f4' : '#281815'
  };
}

// ── Date display ─────────────────────────────────────────────────────
function updateDateDisplay(){
  var el = document.getElementById('dateDisplay');
  var now = new Date();
  el.textContent = now.toLocaleDateString('es-ES',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

// ── Navigation ───────────────────────────────────────────────────────
function setupNav(){
  var links = document.querySelectorAll('.nav-links li');
  links.forEach(function(li){
    li.addEventListener('click', function(){
      navigateTo(this.dataset.page);
    });
  });
}

window.navigateTo = function(page){
  currentPage = page;
  var links = document.querySelectorAll('.nav-links li');
  links.forEach(function(li){ li.classList.toggle('active', li.dataset.page === page); });
  var pageNames = {dashboard:'Panel', calendar:'Calendario', rides:'Rutas', upload:'Subir GPX'};
  document.getElementById('pageTitle').textContent = pageNames[page] || page;
  closeMobileMenu();
  renderPage(page);
};

function renderPage(page){
  document.querySelectorAll('.page').forEach(function(p){ p.style.display = 'none'; });
  document.getElementById('emptyState').style.display = 'none';

  if(page === 'dashboard') renderDashboard();
  else if(page === 'calendar') renderCalendar();
  else if(page === 'rides') renderRides();
  else if(page === 'upload') document.getElementById('page-upload').style.display = 'block';
}

// ── Dashboard ────────────────────────────────────────────────────────
function renderDashboard(){
  if(!rides.length){
    document.getElementById('emptyState').style.display = 'block';
    return;
  }
  var page = document.getElementById('page-dashboard');
  page.style.display = 'block';
  renderStats();
  renderBestMonth();
  renderFastestMonth();
  renderRecentRides();
    setTimeout(function(){
    initRidesMonthSelector();
    drawRidesMonthChart();
    drawTopSpeedChart();
    initTopSpeedSelector();
  }, 50);
}

function renderStats(){
  var g = document.getElementById('statsGrid');
  var totalDist = rides.reduce(function(s,r){return s+r.distance;},0);
  var avgDist = totalDist / rides.length;
  var avgSpd = rides.reduce(function(s,r){return s+r.avgSpeed;},0) / rides.length;
  var overallAvgSpd = rides.reduce(function(s,r){return s+(r.overallAvgSpeed||r.avgSpeed);},0) / rides.length;
  var locIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  var flagIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
  var cards = [
    {label:'Total de Rutas',value:rides.length+'',color:'blue',icon:locIcon},
    {label:'Distancia Total',value:fmtNum(totalDist)+'<span class="stat-sub"> km</span>',color:'accent',icon:flagIcon},
    {label:'Distancia Media',value:fmtNum(avgDist)+'<span class="stat-sub"> km</span>',color:'accent',icon:flagIcon},
    {label:'Vel. Media (movimiento)',value:fmtNum(avgSpd)+'<span class="stat-sub"> km/h</span>',color:'orange',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'},
    {label:'Vel. Media (con paradas)',value:fmtNum(overallAvgSpd)+'<span class="stat-sub"> km/h</span>',color:'orange',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'}
  ];

  g.innerHTML = cards.map(function(c){
    return '<div class="stat-card '+c.color+'"><div class="stat-label">'+c.icon+' '+c.label+'</div><div class="stat-value">'+c.value+'</div></div>';
  }).join('');
}

function renderBestMonth(){
  var card = document.getElementById('bestWeekCard');
  var best = getBestMonth();
  if(!best){ card.classList.remove('visible'); return; }
  card.classList.add('visible');
  card.innerHTML = '<div class="hc-label">🏆 Mejor Mes</div><div class="hc-title">'+best.km.toFixed(1)+' km en un mes</div><div class="hc-sub">'+best.range+'</div>';
}

function renderFastestMonth(){
  var card = document.getElementById('fastestMonthCard');
  var fastest = getFastestMonth();
  if(!fastest){ card.classList.remove('visible'); return; }
  card.classList.add('visible');
  card.innerHTML = '<div class="hc-label">⚡ Mes más Rápido</div><div class="hc-title">'+fastest.avgSpeed.toFixed(1)+' km/h de media en un mes</div><div class="hc-sub">'+fastest.range+'</div>';
}

function getBestMonth(){
  if(!rides.length) return null;
  var months = {};
  rides.forEach(function(r){
    var d = new Date(r.date);
    var key = d.getFullYear() + '-' + d.getMonth();
    if(!months[key]) months[key] = {km:0, start:new Date(d.getFullYear(), d.getMonth(), 1)};
    months[key].km += r.distance;
  });
  var bestKey = null, bestKm = 0;
  Object.keys(months).forEach(function(k){
    if(months[k].km > bestKm){ bestKm = months[k].km; bestKey = k; }
  });
  if(!bestKey) return null;
  var m = months[bestKey];
  var endDate = new Date(m.start.getFullYear(), m.start.getMonth() + 1, 0);
  var opts = {month:'long', day:'numeric'};
  return {
    km: m.km,
    range: m.start.toLocaleDateString('es-ES',opts) + ' – ' + endDate.toLocaleDateString('es-ES',opts) + ', ' + m.start.getFullYear()
  };
}

function getFastestMonth(){
  if(!rides.length) return null;
  var months = {};
  rides.forEach(function(r){
    var d = new Date(r.date);
    var key = d.getFullYear() + '-' + d.getMonth();
    if(!months[key]) months[key] = {totalSpeed:0, count:0, start:new Date(d.getFullYear(), d.getMonth(), 1)};
    months[key].totalSpeed += r.avgSpeed;
    months[key].count++;
  });
  var bestKey = null, bestAvg = 0;
  Object.keys(months).forEach(function(k){
    var avg = months[k].totalSpeed / months[k].count;
    if(avg > bestAvg){ bestAvg = avg; bestKey = k; }
  });
  if(!bestKey) return null;
  var m = months[bestKey];
  var endDate = new Date(m.start.getFullYear(), m.start.getMonth() + 1, 0);
  var opts = {month:'long', day:'numeric'};
  return {
    avgSpeed: bestAvg,
    range: m.start.toLocaleDateString('es-ES',opts) + ' – ' + endDate.toLocaleDateString('es-ES',opts) + ', ' + m.start.getFullYear()
  };
}

function renderRecentRides(){
  var list = document.getElementById('ridesList');
  var recent = rides.slice(0,8);
  var header = '<div class="ride-row-header ride-row-5"><span>Fecha</span><span style="text-align:right">Distancia</span><span style="text-align:right">Vel. (mov)</span><span style="text-align:right">Vel. (total)</span><span style="text-align:right">Vel. Máx</span></div>';
  list.innerHTML = header + recent.map(function(r){
    var oSpd = r.overallAvgSpeed || r.avgSpeed;
    return '<div class="ride-row ride-row-5">'+
      '<div class="ride-date">'+formatDate(r.date)+'</div>'+
      '<div class="ride-metric"><div class="val">'+r.distance.toFixed(1)+'</div><div class="lbl">km</div></div>'+
      '<div class="ride-metric"><div class="val">'+r.avgSpeed.toFixed(1)+'</div><div class="lbl">km/h</div></div>'+
      '<div class="ride-metric"><div class="val">'+oSpd.toFixed(1)+'</div><div class="lbl">km/h</div></div>'+
      '<div class="ride-metric"><div class="val">'+r.maxSpeed.toFixed(1)+'</div><div class="lbl">km/h</div></div>'+
    '</div>';
  }).join('');
}

// ── Calendar ─────────────────────────────────────────────────────────
function renderCalendar(){
  document.getElementById('page-calendar').style.display = 'block';
  var monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('calMonth').textContent = monthNames[calMonth] + ' ' + calYear;

  var grid = document.getElementById('calGrid');
  var firstDay = new Date(calYear, calMonth, 1);
  var lastDay = new Date(calYear, calMonth + 1, 0);
  var startDay = (firstDay.getDay() + 6) % 7;
  var totalDays = lastDay.getDate();
  var today = new Date();

  var rideMap = {};
  rides.forEach(function(r){
    if(!rideMap[r.date]) rideMap[r.date] = [];
    rideMap[r.date].push(r);
  });

  var html = '';
  for(var i = 0; i < startDay; i++) html += '<div class="cal-day empty"></div>';
  for(var d = 1; d <= totalDays; d++){
    var dateStr = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var dayRides = rideMap[dateStr];
    var cls = 'cal-day';
    var dot = '';
    if(dayRides && dayRides.length){
      var totalDist = dayRides.reduce(function(s,r){return s+r.distance;},0);
      if(totalDist < 20) cls += ' short';
      else if(totalDist <= 50) cls += ' medium';
      else cls += ' long';
      dot = '<div class="day-dots">' + dayRides.map(function(r){
        var c = r.distance < 20 ? 'dist-short' : r.distance <= 50 ? 'dist-medium' : 'dist-long';
        return '<div class="day-dot ' + c + '"></div>';
      }).join('') + '</div>';
    } else {
      cls += ' no-ride';
      dot = '<div class="day-dots"><div class="day-dot"></div></div>';
    }
    if(today.getDate() === d && today.getMonth() === calMonth && today.getFullYear() === calYear) cls += ' today';
    html += '<div class="'+cls+'" data-date="'+dateStr+'"><span class="day-num">'+d+'</span>'+dot+'</div>';
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.cal-day:not(.empty)').forEach(function(el){
    el.addEventListener('click', function(){
      var date = this.dataset.date;
      var dayRides = rideMap[date];
      var det = document.getElementById('calDetails');
      if(!dayRides || !dayRides.length){ det.style.display = 'none'; return; }
      document.getElementById('calDetailTitle').textContent = formatDate(date) + (dayRides.length > 1 ? ' ('+dayRides.length+' rutas)' : '');
      var html = '';
      dayRides.forEach(function(ride, idx){
        if(idx > 0) html += '<div style="border-top:1px solid var(--border);margin:8px 0"></div>';
        var oSpd = ride.overallAvgSpeed || ride.avgSpeed;
        html +=
          '<div class="cal-detail-ride">'+
            (dayRides.length > 1 ? '<div class="cd-label" style="margin-bottom:4px;font-weight:600;color:var(--text)">Ruta '+(idx+1)+'</div>' : '')+
            '<div><div class="cd-label">Distancia</div><div class="cd-val">'+ride.distance.toFixed(1)+' km</div></div>'+
            '<div><div class="cd-label">Velocidad (movimiento)</div><div class="cd-val">'+ride.avgSpeed.toFixed(1)+' km/h</div></div>'+
            '<div><div class="cd-label">Velocidad (paradas)</div><div class="cd-val">'+oSpd.toFixed(1)+' km/h</div></div>'+
            '<div><div class="cd-label">Velocidad Máxima</div><div class="cd-val">'+ride.maxSpeed.toFixed(1)+' km/h</div></div>'+
          '</div>';
      });
      document.getElementById('calDetailContent').innerHTML = html;
      det.style.display = 'block';
    });
  });

  document.getElementById('calPrev').onclick = function(){
    calMonth--; if(calMonth<0){calMonth=11;calYear--;}
    renderCalendar();
  };
  document.getElementById('calNext').onclick = function(){
    calMonth++; if(calMonth>11){calMonth=0;calYear++;}
    renderCalendar();
  };
}

// ── Rides ────────────────────────────────────────────────────────────
function renderRides(){
  document.getElementById('page-rides').style.display = 'block';
  var list = document.getElementById('ridesFullList');
  var sorted = rides.slice();
  var sort = document.getElementById('sortSelect').value;
  if(sort==='date-desc') sorted.sort(function(a,b){return new Date(b.date)-new Date(a.date);});
  else if(sort==='date-asc') sorted.sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  else if(sort==='distance-desc') sorted.sort(function(a,b){return b.distance-a.distance;});
  else if(sort==='distance-asc') sorted.sort(function(a,b){return a.distance-b.distance;});
  else if(sort==='speed-desc') sorted.sort(function(a,b){return b.avgSpeed-a.avgSpeed;});

  list.innerHTML = sorted.map(function(r){
    var durH = Math.floor(r.duration/60);
    var durM = r.duration%60;
    var oSpd = r.overallAvgSpeed || r.avgSpeed;
    return '<div class="ride-card-full" data-ride-id="'+r.id+'">'+
      '<div class="ride-card-top"><div><div class="ride-card-date">'+formatDate(r.date)+'</div><div class="ride-card-day">'+getDayName(r.date)+'</div></div>'+
      '<button class="btn-delete-ride" onclick="deleteRide(\''+r.id+'\')" title="Eliminar ruta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></div>'+
      '<div class="ride-card-metrics">'+
        '<div class="ride-metric-block"><div class="rm-value">'+r.distance.toFixed(1)+'<span class="rm-unit">km</span></div><div class="rm-label">Distancia</div></div>'+
        '<div class="ride-metric-block"><div class="rm-value">'+r.avgSpeed.toFixed(1)+'<span class="rm-unit">km/h</span></div><div class="rm-label">Velocidad (movimiento)</div></div>'+
        '<div class="ride-metric-block"><div class="rm-value">'+oSpd.toFixed(1)+'<span class="rm-unit">km/h</span></div><div class="rm-label">Velocidad (con paradas)</div></div>'+
        '<div class="ride-metric-block"><div class="rm-value">'+r.maxSpeed.toFixed(1)+'<span class="rm-unit">km/h</span></div><div class="rm-label">Velocidad Máxima</div></div>'+
      '</div>'+
    '</div>';
  }).join('');

  document.getElementById('sortSelect').onchange = function(){ renderRides(); };
}

window.deleteRide = function(id){
  rides = rides.filter(function(r){ return r.id !== id; });
  persist();
  renderRides();
  renderStats();
  renderBestMonth();
  renderFastestMonth();
  renderRecentRides();
  setTimeout(function(){
    initRidesMonthSelector();
    drawRidesMonthChart();
    drawTopSpeedChart();
  }, 50);
};

// ── Charts (Canvas) ─────────────────────────────────────────────────
var chartTooltipEl = null;
function getTooltip(){ if(!chartTooltipEl) chartTooltipEl = document.getElementById('chartTooltip'); return chartTooltipEl; }
function showTooltip(e, html){
  var t = getTooltip();
  t.innerHTML = html;
  t.classList.add('visible');
  var tx = e.clientX + 14;
  var ty = e.clientY - 10;
  if(tx + t.offsetWidth > window.innerWidth - 10) tx = e.clientX - t.offsetWidth - 14;
  if(ty < 10) ty = e.clientY + 20;
  t.style.left = tx + 'px';
  t.style.top = ty + 'px';
}
function hideTooltip(){ getTooltip().classList.remove('visible'); }

function getRidesMonthlyData(){
  if(!rides.length) return [];
  var sorted = rides.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  if(!sorted.length) return [];

  var firstMonth = getMonthStart(new Date(sorted[0].date));
  var lastMonth = getMonthStart(new Date(sorted[sorted.length - 1].date));

  var monthMap = {};
  sorted.forEach(function(r){
    var ms = getMonthStart(new Date(r.date));
    var key = ms.getFullYear() + '-' + ms.getMonth();
    if(!monthMap[key]) monthMap[key] = {count:0, km:0, speedSum:0, start:new Date(ms)};
    monthMap[key].count++;
    monthMap[key].km += r.distance;
    monthMap[key].speedSum += r.avgSpeed;
  });

  var months = [];
  var cursor = new Date(firstMonth);
  while(cursor <= lastMonth){
    var key = cursor.getFullYear() + '-' + cursor.getMonth();
    var d = monthMap[key];
    months.push({
      count: d ? d.count : 0,
      km: d ? d.km : 0,
      avgSpeed: d ? d.speedSum / d.count : 0,
      label: formatMonthShort(cursor),
      start: new Date(cursor)
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

var ridesMonthMode = 0;
var ridesMonthTitles = ['Rutas por Mes','Distancia por Mes','Vel. Media por Mes'];
var ridesMonthKeys = ['count','km','avgSpeed'];
var ridesMonthColors = ['#ff5839','#ff5839','#ff5839'];
var ridesMonthUnits = ['rutas','km','km/h'];

function setRidesMonthMode(mode){
  ridesMonthMode = mode;
  document.querySelectorAll('#ridesMonthSelector .dot').forEach(function(d){
    d.classList.toggle('active', parseInt(d.dataset.mode) === mode);
  });
  document.getElementById('ridesMonthTitle').textContent = ridesMonthTitles[mode];
  drawRidesMonthChart();
}

function initRidesMonthSelector(){
  document.querySelectorAll('#ridesMonthSelector .dot').forEach(function(d){
    d.addEventListener('click', function(){
      setRidesMonthMode(parseInt(this.dataset.mode));
    });
  });
}

function drawRidesMonthChart(){
  var canvas = document.getElementById('ridesMonthChart');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  var W = rect.width, H = rect.height;
  ctx.clearRect(0,0,W,H);

  var monthly = getRidesMonthlyData();
  if(!monthly.length) return;
  var key = ridesMonthKeys[ridesMonthMode];
  var color = ridesMonthColors[ridesMonthMode];
  var unit = ridesMonthUnits[ridesMonthMode];
  var maxVal = Math.max.apply(null, monthly.map(function(m){return m[key];})) || 1;
  var chartH = H - 50;
  var chartY = 20;
  var chartW = W - 60;
  var th = chartTheme();

  ctx.strokeStyle = th.grid;
  ctx.lineWidth = 1;
  for(var i = 0; i <= 4; i++){
    var y = chartY + chartH - (chartH * i / 4);
    ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(W - 10, y); ctx.stroke();
    ctx.fillStyle = th.axis;
    ctx.font = '11px Barlow, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * i / 4), 38, y + 3);
  }

  var stepX = monthly.length > 1 ? chartW / (monthly.length - 1) : chartW;
  var hits = [];

  ctx.beginPath();
  monthly.forEach(function(m, idx){
    var x = 50 + idx * stepX;
    var val = key === 'avgSpeed' ? m[key] : m[key];
    var y = chartY + chartH - (val / maxVal) * chartH;
    hits.push({x:x, y:y, val:val, count:m.count, km:m.km, avgSpeed:m.avgSpeed, label:m.label, start:m.start});
    if(idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  monthly.forEach(function(m, idx){
    var x = 50 + idx * stepX;
    var val = m[key];
    var y = chartY + chartH - (val / maxVal) * chartH;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  });

  monthly.forEach(function(m, idx){
    var x = 50 + idx * stepX;
    ctx.fillStyle = th.axis;
    ctx.font = '10px Barlow, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, x, chartY + chartH + 14);
  });

  canvas.onmousemove = function(e){
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var hit = null;
    for(var i = 0; i < hits.length; i++){
      var p = hits[i];
      if(Math.hypot(mx - p.x, my - p.y) < 12){ hit = p; break; }
    }
    if(hit){
      var endDate = new Date(hit.start.getFullYear(), hit.start.getMonth() + 1, 0);
      var opts = {month:'long', day:'numeric', year:'numeric'};
      var range = hit.start.toLocaleDateString('es-ES',opts) + ' – ' + endDate.toLocaleDateString('es-ES',opts);
      var displayVal = ridesMonthMode === 0 ? Math.round(hit.val) : hit.val.toFixed(1);
      showTooltip(e, '<strong>' + displayVal + ' ' + unit + '</strong><br>' + range);
    } else { hideTooltip(); }
  };
  canvas.onmouseleave = hideTooltip;
}

var speedPointHits = [];
var topSpeedMode = 0;
var topSpeedLabels = ['Velocidad Máxima','Vel. Media (movimiento)','Vel. Media (con paradas)'];
var topSpeedKeys = ['maxSpeed','avgSpeed','overallAvgSpeed'];

function getTopSpeedTitle(){
  return topSpeedLabels[topSpeedMode];
}

function drawTopSpeedChart(){
  var canvas = document.getElementById('topSpeedChart');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  var W = rect.width, H = rect.height;
  ctx.clearRect(0,0,W,H);

  var sorted = rides.slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  if(!sorted.length) return;
  var key = topSpeedKeys[topSpeedMode];
  var speeds = sorted.map(function(r){ return r[key]; });
  var maxVal = 60;
  var minVal = 0;
  var range = 60;
  var chartH = H - 50;
  var chartY = 20;
  var chartW = W - 60;
  var color = '#ff5839';
  var th = chartTheme();

  ctx.strokeStyle = th.grid;
  ctx.lineWidth = 1;
  for(var i = 0; i <= 4; i++){
    var y = chartY + chartH - (chartH * i / 4);
    ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(W - 10, y); ctx.stroke();
    ctx.fillStyle = th.axis;
    ctx.font = '11px Barlow, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText((minVal + range * i / 4).toFixed(0), 38, y + 3);
  }

  speedPointHits = [];

  if(speeds.length < 2){
    var x = 50 + chartW / 2;
    var y = chartY + chartH / 2;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = th.text;
    ctx.font = '12px Barlow, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(speeds[0].toFixed(1) + ' km/h', x, y - 12);
    speedPointHits.push({x:x, y:y, r:6, speed:speeds[0], date:sorted[0].date});
    canvas.onmousemove = function(e){
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var hit = speedPointHits[0];
      if(Math.hypot(mx - hit.x, my - hit.y) < hit.r + 4){
        showTooltip(e, '<strong>' + hit.speed.toFixed(1) + ' km/h</strong><br>' + formatDate(hit.date));
      } else { hideTooltip(); }
    };
    canvas.onmouseleave = hideTooltip;
    return;
  }

  var stepX = chartW / (speeds.length - 1);

  ctx.beginPath();
  speeds.forEach(function(v, idx){
    var x = 50 + idx * stepX;
    var y = chartY + chartH - ((v - minVal) / range) * chartH;
    if(idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  speeds.forEach(function(v, idx){
    var x = 50 + idx * stepX;
    var y = chartY + chartH - ((v - minVal) / range) * chartH;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    speedPointHits.push({x:x, y:y, r:4, speed:v, date:sorted[idx].date});
  });

  speeds.forEach(function(v, idx){
    if(speeds.length <= 20 || idx % Math.ceil(speeds.length / 20) === 0 || idx === speeds.length - 1){
      var x = 50 + idx * stepX;
      ctx.fillStyle = th.axis;
      ctx.font = '10px Barlow, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatShortDate(new Date(sorted[idx].date)), x, chartY + chartH + 14);
    }
  });

  canvas.onmousemove = function(e){
    var r = canvas.getBoundingClientRect();
    var mx = e.clientX - r.left, my = e.clientY - r.top;
    var hit = null;
    for(var i = 0; i < speedPointHits.length; i++){
      var p = speedPointHits[i];
      if(Math.hypot(mx - p.x, my - p.y) < p.r + 6){ hit = p; break; }
    }
    if(hit){
      showTooltip(e, '<strong>' + hit.speed.toFixed(1) + ' km/h</strong><br>' + formatDate(hit.date));
    } else { hideTooltip(); }
  };
  canvas.onmouseleave = hideTooltip;
}

function setTopSpeedMode(mode){
  topSpeedMode = mode;
  document.querySelectorAll('#topSpeedSelector .dot').forEach(function(d){
    d.classList.toggle('active', parseInt(d.dataset.mode) === mode);
  });
  document.getElementById('topSpeedTitle').textContent = getTopSpeedTitle();
  drawTopSpeedChart();
}

function initTopSpeedSelector(){
  document.querySelectorAll('#topSpeedSelector .dot').forEach(function(d){
    d.addEventListener('click', function(){
      setTopSpeedMode(parseInt(this.dataset.mode));
    });
  });
}

// ── Chart Helpers ────────────────────────────────────────────────────
function getMonthStart(d){
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatMonthShort(d){
  return d.toLocaleDateString('es-ES',{month:'short', year:'2-digit'});
}

// ── Upload ───────────────────────────────────────────────────────────
function setupUpload(){
  var zone = document.getElementById('uploadZone');
  var input = document.getElementById('fileInput');

  zone.addEventListener('click', function(){ input.click(); });
  zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', function(){ zone.classList.remove('dragover'); });
  zone.addEventListener('drop', function(e){
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', function(){ handleFiles(this.files); });
}

function handleFiles(files){
  if(!files || !files.length) return;
  var progress = document.getElementById('uploadProgress');
  var fill = document.getElementById('progressFill');
  var text = document.getElementById('progressText');
  var results = document.getElementById('uploadResults');
  progress.style.display = 'block';
  results.style.display = 'none';
  fill.style.width = '0%';
  text.textContent = 'Analizando archivos GPX...';

  var parsed = [];
  var total = files.length;
  var done = 0;

  Array.from(files).forEach(function(file){
    var reader = new FileReader();
    reader.onload = function(e){
      try {
        var ride = parseGPX(e.target.result, file.name);
        if(ride) parsed.push(ride);
      } catch(err){
        parsed.push({error: file.name + ': ' + err.message});
      }
      done++;
      fill.style.width = Math.round(done / total * 100) + '%';
      if(done === total) finishUpload(parsed);
    };
    reader.readAsText(file);
  });
}

function parseGPX(xmlStr, filename){
  var parser = new DOMParser();
  var doc = parser.parseFromString(xmlStr, 'text/xml');
  var parseError = doc.querySelector('parsererror');
  if(parseError) throw new Error('Formato GPX no válido');

  var trackpts = doc.querySelectorAll('trkpt');
  if(!trackpts.length) throw new Error('No se encontraron puntos de ruta');

  var srcEl = doc.querySelector('trk > src');
  var descEl = doc.querySelector('metadata > desc') || doc.querySelector('gpx > desc');
  var srcText = srcEl ? srcEl.textContent : '';
  var descText = descEl ? descEl.textContent : '';
  var source = 'other';
  if(srcText === 'FitoTrack') source = 'fito';
  else if(descText.indexOf('Mi Fitness') !== -1) source = 'xiaomi';

  var totalDist = 0;
  var maxSpeed = 0;
  var speeds = [];
  var altitudes = [];
  var prevLat = null, prevLon = null, prevAlt = null;
  var prevTime = null;
  var firstTime = null, lastTime = null;
  var hasDeviceSpeed = false;

  trackpts.forEach(function(pt){
    var lat = parseFloat(pt.getAttribute('lat'));
    var lon = parseFloat(pt.getAttribute('lon'));
    var eleEl = pt.querySelector('ele');
    var ele = eleEl ? parseFloat(eleEl.textContent) : null;
    var timeEl = pt.querySelector('time');
    var time = timeEl ? new Date(timeEl.textContent) : null;

    var speedEl = pt.querySelector('speed');
    var deviceSpeed = speedEl ? parseFloat(speedEl.textContent) : null;

    if(ele !== null && !isNaN(ele)) altitudes.push(ele);
    if(time && !firstTime) firstTime = time;
    if(time) lastTime = time;

    if(prevLat !== null && prevLon !== null){
      var dist = haversine(prevLat, prevLon, lat, lon);
      totalDist += dist;

      if(deviceSpeed !== null && !isNaN(deviceSpeed)){
        var spdKmh = deviceSpeed * 3.6;
        speeds.push(spdKmh);
        if(spdKmh > maxSpeed) maxSpeed = spdKmh;
        hasDeviceSpeed = true;
      } else if(prevTime !== null && time !== null){
        var dt = (time - prevTime) / 1000;
        if(dt > 0){
          var calcSpd = (dist / dt) * 3600;
          speeds.push(calcSpd);
          if(calcSpd > maxSpeed) maxSpeed = calcSpd;
        }
      }
    }

    prevLat = lat; prevLon = lon; prevAlt = ele; prevTime = time;
  });

  if(totalDist < 0.1) throw new Error('Ruta demasiado corta');

  var date = null;
  var firstTimeEl = doc.querySelector('trkpt time');
  if(firstTimeEl) date = new Date(firstTimeEl.textContent).toISOString().slice(0,10);
  if(!date) date = new Date().toISOString().slice(0,10);

  var avgSpeed = speeds.length ? speeds.reduce(function(a,b){return a+b;},0) / speeds.length : 0;
  var overallAvgSpeed = 0;
  if(firstTime && lastTime){
    var elapsedSec = (lastTime - firstTime) / 1000;
    if(elapsedSec > 0) overallAvgSpeed = (totalDist / elapsedSec) * 3600;
  }
  if(overallAvgSpeed === 0) overallAvgSpeed = avgSpeed * 0.8;
  var duration = speeds.length ? (totalDist / (avgSpeed || 15)) * 60 : (totalDist / 18) * 60;

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'upl_'+Date.now()+'_'+Math.random().toString(36).slice(2),
    date: date,
    distance: +totalDist.toFixed(2),
    avgSpeed: +avgSpeed.toFixed(1),
    overallAvgSpeed: +overallAvgSpeed.toFixed(1),
    maxSpeed: +maxSpeed.toFixed(1),
    duration: Math.round(duration),
    baseAltitude: altitudes.length ? Math.round(altitudes[0]) : 200,
    source: source
  };
}

function haversine(lat1, lon1, lat2, lon2){
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function finishUpload(parsed){
  var results = document.getElementById('uploadResults');
  var progress = document.getElementById('uploadProgress');
  var errors = parsed.filter(function(p){ return p.error; });
  var valid = parsed.filter(function(p){ return !p.error; });

  var html = '<div class="ur-title">Resultados de la Subida</div>';
  valid.forEach(function(r){
    var oSpd = r.overallAvgSpeed || r.avgSpeed;
    html += '<div class="ur-item"><strong>'+r.date+'</strong> — '+r.distance.toFixed(1)+' km, en movimiento '+r.avgSpeed.toFixed(1)+' km/h, total '+oSpd.toFixed(1)+' km/h</div>';
  });
  errors.forEach(function(e){
    html += '<div class="ur-item ur-error">'+e.error+'</div>';
  });

  if(valid.length){
    if(isFake()){
      rides = [];
    }
    valid.forEach(function(r){ rides.push(r); });
    rides.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
    persist();
    setReal();
    html += '<div class="ur-success">✓ '+valid.length+' ruta(s) guardada(s). Los datos de ejemplo han sido eliminados.</div>';
    updateDataStatus();
  }

  results.innerHTML = html;
  results.style.display = 'block';
  setTimeout(function(){ progress.style.display = 'none'; }, 500);
}

function updateDataStatus(){
  var el = document.getElementById('dataStatus');
  if(!isFake()){
    el.classList.add('real');
    el.querySelector('.status-text').textContent = 'Datos Reales';
  } else {
    el.classList.remove('real');
    el.querySelector('.status-text').textContent = 'Datos de Ejemplo';
  }
}

// ── Mobile Menu ──────────────────────────────────────────────────────
function setupMobileMenu(){
  document.getElementById('mobileMenuBtn').addEventListener('click', function(){
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('visible');
  });
  document.getElementById('overlay').addEventListener('click', closeMobileMenu);
  document.getElementById('sidebarToggle').addEventListener('click', closeMobileMenu);
}

function closeMobileMenu(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
}

// ── Example Data ─────────────────────────────────────────────────────
function setupExampleDataButton(){
  document.getElementById('btnExampleData').addEventListener('click', function(){
    regenerateExampleData();
  });
}

function regenerateExampleData(){
  rides = generateFakeData();
  persist();
  setFake();
  updateDataStatus();
  renderPage(currentPage);
}

// ── Utilities ────────────────────────────────────────────────────────
function formatDate(ds){
  var d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('es-ES',{month:'short',day:'numeric',year:'numeric'});
}
function formatShortDate(d){
  return d.toLocaleDateString('es-ES',{month:'short',day:'numeric'});
}
function getDayName(ds){
  return new Date(ds+'T00:00:00').toLocaleDateString('es-ES',{weekday:'long'});
}
function fmtNum(n){ return n.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function fmtInt(n){ return Math.round(n).toLocaleString('es-ES'); }

// ── Resize handler for charts ────────────────────────────────────────
var resizeTimer;
window.addEventListener('resize', function(){
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function(){
    if(currentPage === 'dashboard'){
      drawRidesMonthChart();
      drawTopSpeedChart();
    }
  }, 200);
});

// Initial status
updateDataStatus();

})();
