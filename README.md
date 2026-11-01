# 🚲 Bici — Gestión de Rutas

Panel personal de seguimiento de rutas en bicicleta. Sube tus archivos **GPX** exportados desde **FitoTrack** —la app que uso para registrar cada salida— y visualiza tus estadísticas, gráficas, calendario de rutas e historial completo.

<img width="1894" height="938" alt="image" src="https://github.com/user-attachments/assets/1b4f88a6-39ca-4890-ab12-2a49d4f8774f" />

> Frontend estático (HTML + CSS + JS) y un pequeño servidor en **Python (solo librería estándar)** para el almacenamiento. Las gráficas del panel usan **[TanStack Charts](https://tanstack.com/charts/latest)**, que se empaqueta en local con esbuild (`npm run build`); en runtime no hay CDN ni dependencias externas.

## 📱 Los datos: FitoTrack

Este panel nace para explotar los datos que registro con **[FitoTrack](https://f-droid.org/packages/de.tadris.fitness/)** (app de código abierto para Android, disponible en F-Droid y Google Play):

1. **Graba** cada salida con FitoTrack (bicicleta, GPS y sensores del móvil)
2. **Exporta** la actividad como archivo **GPX** desde la app
3. **Súbela** en la sección *Subir GPX* de este panel

El analizador GPX está optimizado para FitoTrack (etiqueta `<src>FitoTrack</src>` y velocidades por punto), y también acepta exportaciones de **Mi Fitness / Xiaomi** calculando las velocidades a partir de distancia y tiempo. Si usas FitoTrack, solo tienes que exportar y arrastrar el archivo.

## La propuesta

Una página sencilla y privada para:

- **Registrar rutas** a partir de archivos GPX reales (distancia, velocidad en movimiento, velocidad con paradas y velocidad máxima)
- **Ver tu progresión mensual** (rutas, distancia y velocidad media por mes)
- **Consultar un calendario** donde cada día se colorea según los km totales de la jornada
- **Revisar tu historial** completo y borrar rutas individuales
- **Gestionar datos**: el almacenamiento es persistente en el servidor (un archivo `data/rides.json`), no depende del navegador y puedes respaldarlo con una simple copia del archivo

Todo se procesa en tu propio equipo: **las coordenadas GPS nunca se guardan**, solo métricas derivadas.

## Características

- 📊 Gráficas interactivas con **TanStack Charts** (SVG): evolución mensual (rutas, distancia y velocidad media) y perfil de velocidad por ruta (máxima, media en movimiento y con paradas), con tooltip, foco y navegación por teclado
- 🗓️ Calendario con un punto por ruta, coloreado según la distancia de cada una
- 🏆 Tarjetas de mejor mes (más km) y mes más rápido (mejor velocidad media)
- ☀️/🌙 Modo claro y oscuro con memoria de preferencia
- 📱 Interfaz responsive (móvil, tablet y escritorio)
- 📥 Subida por arrastrar y soltar, multi-archivo, con barra de progreso
- 🔌 Analizador GPX optimizado para **FitoTrack** (velocidad por punto) y compatible con Mi Fitness (calcula velocidades por distancia/tiempo)
- 🧪 Datos de ejemplo generables con un clic para probar la interfaz

## Cómo ejecutarlo

Requiere **Python 3.6+** (sin instalar nada más):

```bash
git clone https://github.com/Chicotjr5/Bikeme.git
cd Bikeme
python3 server.py            # puerto 8080 por defecto
# o bien: python3 server.py 9000
```

Para desplegarlo en un servidor, ejecuta `server.py` con el puerto que prefieras y expónlo mediante un proxy inverso (nginx, Caddy…) o dentro de una red privada como Tailscale. Como la app guarda datos en `data/rides.json`, asegúrate de que el proceso tenga permiso de escritura en el directorio del proyecto y de hacer copias de seguridad de ese fichero.

Abre en el navegador: **http://localhost:8080**

> ⚠️ La app **debe** servirse con `server.py`: el guardado de datos usa una API local (`/api/data`), por lo que abrirla con `file://` o con `python3 -m http.server` no permitirá persistir rutas.

Al primer uso se generan datos de ejemplo automáticamente. Sube tus GPX desde **Subir GPX** para sustituirlos por datos reales.

## Desarrollo de las gráficas

El panel funciona sin Node: `charts.bundle.js` se sirve tal cual. Solo necesitas npm si quieres tocar las gráficas (`src/charts.js`):

```bash
npm install        # una sola vez
npm run build      # regenera charts.bundle.js con esbuild
npm test           # verifica las definiciones renderizando el SVG en Node
```

Tras cambiar `src/charts.js` hay que volver a ejecutar `npm run build` y recargar la página.

## Estructura

```
Bikeme/
├── index.html        # SPA: panel, calendario, rutas y subida GPX
├── styles.css        # Diseño MADRING, paleta rojo cálido, claro/oscuro, responsive
├── app.js            # Lógica: navegación, analizador GPX, API y preparación de datos
├── src/charts.js     # Definiciones TanStack Charts (se compila a charts.bundle.js)
├── charts.bundle.js  # Bundle generado (npm run build) — no editar a mano
├── test/             # Verificación de las gráficas en Node
├── package.json      # Dependencias de build: @tanstack/charts, d3-scale, esbuild
├── server.py         # Servidor estático + API de almacenamiento en JSON
└── data/             # rides.json — tus datos (creado por el servidor, fuera de git)
```

## Privacidad

- `data/rides.json` está en `.gitignore`: tus rutas nunca se suben al repositorio
- No se almacenan coordenadas GPS ni archivos GPX: solo métricas agregadas por ruta
- Todo funciona en local; no hay servicios externos (salvo las fuentes de Google Fonts)

## Licencia

Este proyecto está licenciado bajo la **GNU General Public License v3.0 (GPL-3.0)**.

Puedes usar, modificar y distribuir este software libremente, siempre que las obras derivadas se distribuyan bajo la misma licencia y se indiquen los cambios realizados. Ver el archivo [LICENSE](LICENSE) para el texto completo.
