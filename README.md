# Módulo de Mapas de Aplicación · Aguilón Electroelectrónico

**Ingenio Madre Tierra — Departamento de Malezas y Madurantes**
Zafra 2026-2027 · Zonas 4, 5 y 8

Elabora, archiva y lleva el avance de los mapas de calidad de aplicación del
aguilón electroelectrónico. Lo que antes se hacía lote por lote en QGIS —
instalar el programa, entender el modelo, exportar, subir a Drive sin forma de
saber quién iba atrasado — se hace aquí, desde el teléfono o la computadora.

## Qué hace

- Lee el archivo del trabajo del aguilón (`.zip` de shapefile o `.geojson`) y
  clasifica cada registro por velocidad: **baja** ≤ 4 km/h, **ideal** 4–8,
  **alta** ≥ 8 km/h.
- Recorta todo a los lotes que de verdad se aplicaron, para que los giros del
  tractor sobre el lote vecino no cuenten.
- Dibuja el mapa sobre imagen de satélite y arma el PDF, encuadrado al lote
  completo, para que se vea también lo que falta.
- Archiva el PDF en Drive y lleva el avance por finca, lote y labor.
- El área la toma de la liquidación de bodega, no del GPS, que sobrestima.

## Cómo está armado

El navegador hace todo el trabajo de SIG; Apps Script solo archiva. Se hizo
así para no toparse con el límite de seis minutos de Apps Script. El motor de
SIG es JavaScript puro, sin librerías: lector de shapefile y de ZIP,
conversión de coordenadas UTM ↔ geográficas ↔ Web Mercator, y un escritor de
PDF mínimo.

| Archivo | Qué es |
|---|---|
| `index.html` | el módulo completo: pantalla y motor de SIG |
| `Codigo.gs` | el servidor en Apps Script: sesiones, Drive y la hoja |
| `manifest.json`, `sw.js` | lo que lo vuelve instalable y lo hace servir sin señal |
| `android/` | la envoltura que lo convierte en APK |
| `INSTALACION.md` | cómo instalarlo desde cero |

## Dónde se usa

- **Página:** https://ajreyes-ingeniomt.github.io/mapas-aguilon-mt/
- **APK:** en [Releases](../../releases), para instalarlo en el teléfono.

Las dos cosas muestran el mismo módulo. La aplicación es una envoltura: al
publicar una versión nueva aquí, los teléfonos la ven **sin reinstalar nada**.

## Lo que no está aquí

El libro de Google Sheets no está en el repositorio: ahí viven los catálogos
de fincas, lotes, equipos y operadores. Las claves tampoco — las de
`Codigo.gs` dicen `CAMBIAR` y solo sirven para crear las filas la primera vez.
Las que valen están en la hoja `Catalogos`.

Para armar el libro desde cero, `INSTALACION.md` trae la estructura de cada
hoja.
