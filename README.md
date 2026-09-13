# 🚲 Bici — Gestión de Rutas

Panel personal de seguimiento de rutas en bicicleta. Sube tus archivos **GPX** exportados desde **FitoTrack** —la app que uso para registrar cada salida— y visualiza tus estadísticas, gráficas, calendario de rutas e historial completo.

> 100% vanilla (HTML + CSS + JS) en el frontend y un pequeño servidor en **Python (solo librería estándar)** para el almacenamiento. Sin frameworks, sin librerías de gráficas, sin dependencias externas.

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

- 📊 Gráficas dibujadas a mano sobre `<canvas>` (líneas mensuales y perfil de velocidad máxima)
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
git clone <esta-url-del-repo>
cd bici
python3 server.py            # puerto 8080 por defecto
# o bien: python3 server.py 9000
```

Abre en el navegador: **http://localhost:8080**

> ⚠️ La app **debe** servirse con `server.py`: el guardado de datos usa una API local (`/api/data`), por lo que abrirla con `file://` o con `python3 -m http.server` no permitirá persistir rutas.

Al primer uso se generan datos de ejemplo automáticamente. Sube tus GPX desde **Subir GPX** para sustituirlos por datos reales.

## Estructura

```
bici/
├── index.html    # SPA: panel, calendario, rutas y subida GPX
├── styles.css    # Diseño MADRING, paleta rojo cálido, claro/oscuro, responsive
├── app.js        # Lógica: navegación, gráficas canvas, analizador GPX, API
├── server.py     # Servidor estático + API de almacenamiento en JSON
└── data/         # rides.json — tus datos (creado por el servidor, fuera de git)
```

## Privacidad

- `data/rides.json` está en `.gitignore`: tus rutas nunca se suben al repositorio
- No se almacenan coordenadas GPS ni archivos GPX: solo métricas agregadas por ruta
- Todo funciona en local; no hay servicios externos (salvo las fuentes de Google Fonts)

## Licencia

## Licencia

Este proyecto está licenciado bajo la **GNU General Public License v3.0 (GPL-3.0)**.

Puedes usar, modificar y distribuir este software libremente, siempre que las obras derivadas se distribuyan bajo la misma licencia y se indiquen los cambios realizados. Ver el archivo [LICENSE](LICENSE) para el texto completo.
