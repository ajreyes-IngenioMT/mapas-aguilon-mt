# Módulo de Mapas de Aplicación · Aguilón Electroelectrónico
### Departamento de Malezas y Madurantes · Zafra 2026-2027

---

## Puesta en marcha

Hay dos caminos. Si ya tienes el libro creado en Google Sheets, usa el primero y no vuelves a subir nada.

### A. Sobre el libro que ya tienes (recomendado)

1. Abre el libro en Google Sheets y ve a Extensiones › Apps Script.
2. Pega `Codigo.gs` reemplazando el contenido del archivo `Código.gs`.
3. Agrega (o reemplaza) un archivo HTML llamado exactamente **index** y pega `index.html`. (Si ya lo tenías como **Formulario**, puedes dejarlo con ese nombre: el módulo acepta los dos.)
4. Guarda, vuelve al libro y recárgalo para que aparezca el menú.
5. Menú **Mapas Aguilón › Instalar / actualizar estructura del libro**. Autoriza los permisos cuando los pida.

Esa función revisa el libro y crea solo lo que falte: la hoja `BDTOS_DETALLE`, la hoja `Equipos` con las filas base de cada zona, el bloque de usuarios en las columnas R:V de `Catalogos` y los parámetros nuevos de `Config`. No borra datos, no sobrescribe valores que ya tengas y se puede ejecutar las veces que haga falta. Al terminar muestra un resumen de lo que hizo.

Un caso especial: si `BDTOS_MAPAS` tiene el formato anterior **y ya contiene mapas cargados**, la función no los toca — renombra esa hoja a `BDTOS_MAPAS_ANTERIOR_<fecha>` y crea la nueva vacía, porque las columnas cambiaron. Si la hoja estaba vacía, simplemente actualiza los encabezados. Las hojas `Plan` y `Resumen`, si siguen ahí, ya no se usan y puedes borrarlas.

### B. Desde cero

Sube `LIBRO_MAPAS_AGUILON_2026-27.xlsx` a Drive, ábrelo con Hojas de cálculo de Google (Archivo › Guardar como Hoja de cálculo de Google) y sigue desde el paso 2 de arriba. Ya trae las 853 filas del catálogo, las 8 labores, los usuarios y los equipos.

Verifica que la columna **LOTE** conserve los ceros iniciales (`0010501`); si no, selecciónala y aplica Formato › Número › Texto sin formato.

## Config


| Parámetro | Qué poner |
|---|---|
| `ZAFRA` | `2026-2027` (primer nivel de las carpetas) |
| `DEPARTAMENTO` | `Departamento de Malezas y Madurantes` |
| `ID_CARPETA_RAIZ` | La carpeta de los mapas. Acepta el ID o la URL completa de Drive |
| `ID_CARPETA_RECURSOS` | La carpeta de insumos. La aplicación lista su contenido sola |
| `ZONAS_HABILITADAS` | `4,5,8` |
| `PERMITIR_REEMPLAZO` | `SI` permite al administrador anular un mapa cargado por error |
| `CORREO_NOTIFICACION` | Correos de los jefes de zona, separados por coma |
| `CORREO_SOPORTE` | **Tu correo.** Ahí llegan las consultas del botón Soporte |
| `TOLERANCIA_PCT` | `5` — margen para dar un lote por completo (95 % a 105 %) |

Comparta la carpeta de insumos como "Cualquier persona de la organización con el enlace puede ver". No hay que registrar archivo por archivo: la aplicación lee la carpeta y muestra sus subcarpetas y archivos con enlace directo. La hoja **Recursos** queda opcional, solo para enlaces que vivan fuera de esa carpeta.

## Publicar la aplicación web

Implementar › Nueva implementación › Aplicación web:

- **Ejecutar como:** Yo (así todos escriben en la misma estructura de carpetas y no necesitan permisos de edición sobre la carpeta raíz).
- **Quién tiene acceso:** Cualquier usuario de la organización.

Copie la URL y distribúyala a las zonas 4, 5 y 8.

## Uso

La aplicación abre en un **menú principal** con tres tarjetas: Insumos, Subir mapa y Avance. Soporte queda aparte, como botón en la esquina superior derecha, disponible desde cualquier pantalla.

- **Insumos**: contenido de la carpeta de insumos, agrupado por subcarpeta y con enlace directo a cada archivo. El botón *Actualizar* relee Drive; entre tanto, el listado se guarda en caché una hora para que la pantalla abra rápido.
- **Subir mapa**: seis pasos — aplicación (zona, finca, fecha, responsable), lotes (lista con buscador), labor y área aplicada por lote, equipo y operador, producto y dosis (opcional), y el PDF final.
- **Avance**: abre con el resumen general de todas las zonas —hectáreas aplicadas, cumplimiento contra el área de los lotes, mapas, lotes, fincas, aplicaciones y dosis real promedio— seguido del cuadro «Cómo va cada zona», con mapas, lotes, hectáreas, cumplimiento, lotes completos, en proceso y excedidos, catorcenas trabajadas y dosis promedio, más la fila de totales. Después vienen el anillo de estados, la curva acumulada por catorcena, las barras por zona (cada zona con su color), por labor, la tabla de hectáreas por labor y zona, el área y los mapas por catorcena, las fincas con el color de su zona, los operadores, los lotes fuera de tolerancia, el detalle lote por lote y los últimos mapas. Todo responde a los filtros de zona, finca, labor, catorcena, mes y operador.
- **Soporte**: formulario de consultas que llega a `CORREO_SOPORTE` con el asunto `[Mapas Aguilon]` y con *responder a* apuntando a quien escribió.

Menú **Mapas Aguilón** dentro del libro: enviar el reporte de avance por correo, programar el envío semanal de los lunes a las 7:00 y crear la estructura base de carpetas.

---

## El dato central: área aplicada por lote

Un mapa es un **evento de aplicación** y puede cubrir varios lotes de la misma finca, que es lo que ocurre cuando se trabajan tramos largos por eficiencia. Por eso la carga permite marcar uno o varios lotes y capturar el **área aplicada de cada uno**, tomada de la liquidación de bodega.

Un mismo lote lleva varias labores a lo largo de la zafra —primer control químico, segundo a los días, y las que sigan—, y cada una se acumula por separado. La lista de lotes muestra, junto a cada uno, las labores que ya tienen mapa y su porcentaje de avance, así que de un vistazo se ve qué falta.

Como ese dato es del día y no acumulado, el sistema **suma**: al seleccionar un lote la aplicación muestra cuánto se le ha aplicado antes, cuántas aplicaciones lleva y cuánto falta según el maestro; al escribir el área del día recalcula en vivo el acumulado, el pendiente y el porcentaje. Si el acumulado se pasa del área del lote, el sistema pide confirmación antes de guardar. Con ±5 % de tolerancia, cada lote queda en uno de tres estados: en proceso, completo o excedido.

La variación entre área aplicada y área del lote es el indicador de fondo: por debajo suele ser callejones, obstáculos o pasadas faltantes; por encima, traslape o deriva del GPS.

El libro guarda esto en dos hojas. `BDTOS_MAPAS` lleva una fila por mapa con la finca, la labor, la fecha, el equipo, el operador y el producto. `BDTOS_DETALLE` lleva una fila por mapa y por lote con el área del maestro, lo aplicado, el acumulado, el pendiente y la variación.

## Dosis

El shp del aguilón solo entrega velocidad, así que la dosis no sale de ahí. Sí sale de la liquidación: dosis real = volumen liquidado ÷ área aplicada.

No se captura el nombre del producto, porque una aplicación lleva varios. Lo que se registra es la mezcla: dosis programada por hectárea, unidad y volumen total liquidado. Con eso la aplicación calcula la dosis real y su variación contra la programada, y el tablero muestra el promedio general y el de cada zona, ponderado por área.

## Todo el catálogo en una sola hoja

`Catalogos` concentra los siete bloques del módulo, cada uno en su rango de columnas:

| Columnas | Bloque | Contenido |
|---|---|---|
| A:L | Lotes | 853 lotes con zona, finca, área, variedad y demás atributos |
| N:P | Labores | Código, nombre y, opcional, las zonas donde aplica |
| R:V | Usuarios | Usuario, clave, nombre, zona y rol |
| X:AC | Calendario | Fecha, catorcena, día, mes, semana y día de zafra — 378 días |
| AE:AG | Catorcenas | Las 27 catorcenas con su fecha inicial y final |
| AI:AK | Equipo por zona | Código de tractor y código de aguilón |
| AM:AO | Operadores | Zona, código del colaborador y nombre |

Ya no existe la hoja `Equipos`: sus datos viven en AI:AO. Para cambiar de tractor, de aguilón o de operador basta editar esas filas; los desplegables del formulario se filtran por la zona del usuario y, como hay uno de cada tipo, quedan preseleccionados.

## Rendimiento

La aplicación carga por partes para que el ingreso sea inmediato. Al entrar solo se leen los catálogos; la carpeta de insumos se consulta la primera vez que abre esa pestaña, y el tablero la primera vez que abre Avance.

El tablero se sirve en una sola llamada que trae filtros y reporte juntos, y el resultado queda en caché diez minutos por combinación de filtros. Esa caché se invalida sola al guardar o anular un mapa, así que el avance nunca se ve desactualizado. La primera consulta del día tarda unos segundos; las siguientes son inmediatas.

## Catorcena y día de zafra

El calendario arranca el 19/10/2026 en la catorcena 1 y corre 378 días, con catorcenas de 14 días que inician en lunes; la columna SEMANA distingue la primera de la segunda semana dentro de cada catorcena.

Al capturar la fecha de aplicación, el formulario consulta el calendario y muestra debajo a qué catorcena y a qué día de zafra corresponde. Esos dos datos se guardan en `BDTOS_MAPAS` y la catorcena también en `BDTOS_DETALLE`, de modo que el tablero se puede filtrar por catorcena y la curva de avance se dibuja por catorcena en lugar de por mes.

## Usuarios

La aplicación pide usuario y clave al abrir. Los usuarios viven en el bloque **R:V de la hoja Catalogos** y vienen precargados:

| Usuario | Clave | Nombre | Zona | Rol |
|---|---|---|---|---|
| `ajreyes` | `CAMBIAR` | Armando Reyes | — | ADMIN |
| `zona4` | `CAMBIAR` | Zona 4 | 4 | ZONA |
| `zona5` | `CAMBIAR` | Zona 5 | 5 | ZONA |
| `zona8` | `CAMBIAR` | Zona 8 | 8 | ZONA |
| `jefeaplic` | (la que se le ponga) | Jefe de Aplicaciones | — | JEFATURA |

### Roles

| Rol | Qué alcanza |
|---|---|
| `ADMIN` | Todo el ingenio, y es el único que publica el maestro de lotes y toca la configuración. |
| `JEFATURA` | Todo el ingenio, sin administración. Para el jefe de aplicaciones. |
| `GERENCIA`, `ASISTENTE`, `INGENIO` | Igual que `JEFATURA`: ven las tres zonas, sin administración. |
| `ZONA` | Sólo su zona. El selector le queda fijo y el servidor rechaza cualquier intento de cargar o consultar otra. |

Para dar de alta al jefe de aplicaciones basta una fila más con el rol `JEFATURA`; la columna de zona puede ir vacía o con una zona, da igual: el rol manda.

**Un usuario que no es de los que ven el ingenio completo y no tiene zona anotada no ve nada**, y el módulo se lo dice al entrar. Es a propósito: antes la zona vacía se tomaba como «sin restricción» y ese usuario terminaba viendo las tres zonas.

Cambia las claves antes de repartir los accesos; basta editar la columna S de Catalogos. Como quedan escritas en el libro, restringe quién tiene acceso al Google Sheet: la aplicación web no lo expone, pero cualquiera que abra el libro las vería. La protección de fondo de los insumos sigue siendo el permiso de Drive: comparte esa carpeta como *Lector* para la organización y así nadie puede borrar nada aunque llegue por otro camino.

La sesión dura dos horas y luego se cierra sola. El campo «Elaborado por» ya no se llena solo con la cuenta de Google: lo escribe quien carga el mapa.

## Identidad gráfica

Fondo claro con degradado suave de blanco a gris verdoso, paneles blancos con borde fino y sombra leve, y la franja degradada lima-verde bajo el encabezado, igual que en las presentaciones del departamento. Los colores son los institucionales: verde `#00963F`, lima `#8CC63F` y texto gris oscuro `#2F3A33`. La tipografía es Lato, en tamaño grande (18 px de base, títulos de 38 a 50 px) y con los títulos en negra.

Las tarjetas del menú llevan un ícono grande en un cuadro lima, y los botones de regreso son botones con borde verde y flecha, visibles en todas las pantallas internas. El logo del ingenio va a color, incrustado en base64: el completo en el ingreso y en la portada, y solo la marca en el encabezado.

Este diseño queda como el oficial para los demás módulos: basta copiar el bloque `<style>` y la estructura de encabezado, portada, paneles y tablas.

## Reglas que aplica el sistema

**Estructura de carpetas.** El orden es lote o lotes, y dentro de ellos las labores:

```
ZAFRA 2026-2027 / ZONA 5 / BARRANQUILLA MT - PANTALEON / LOTES 0950202-0950204 / 2360 - 1ER. C.Q. MALEZAS EQUIPO MECÁNICO / archivo
```

Los lotes que se trabajan juntos comparten una carpeta —`LOTE 0950204` cuando es uno solo, `LOTES 0950202-0950204` cuando son varios— y dentro de ella se van sumando las labores conforme avanza la zafra. Como el mismo grupo de lotes suele repetirse en las labores siguientes, la carpeta se reutiliza y solo nace la de la labor nueva. Se guarda un único PDF por mapa, no copias.

La búsqueda de carpetas se hace por nombre exacto dentro del padre y los IDs quedan en caché seis horas, de modo que no se generan carpetas repetidas aunque dos zonas suban al mismo tiempo.

**Nombre del archivo.** Se renombra de forma automática: `Z4_SAN_LORENZO_0040101_2360_2026-2027_v1.pdf`. El nombre original del usuario no se conserva, de modo que el archivo es identificable fuera del sistema.

**Duplicados.** Al elegir la labor, el formulario consulta si ya existe un mapa vigente para esa combinación y lo avisa antes de que la persona cargue el archivo. Al guardar, si ya hay uno, pide confirmación: el anterior se mueve a la subcarpeta `Versiones anteriores`, su fila en la base pasa a estado `REEMPLAZADO` y el nuevo entra como versión siguiente. Con `PERMITIR_REEMPLAZO = NO` simplemente se rechaza.

**Consolidado.** Cada carga escribe una fila en `BDTOS_MAPAS` con 24 campos: quién subió, cuándo, zona, finca, lote, descripción, área, variedad, labor, responsable, archivo, tamaño, URL, ruta, versión y estado. El área y la variedad se traen del catálogo en el momento del guardado, así que el reporte suma hectáreas sin fórmulas adicionales.

---

## Supuestos que conviene confirmar

1. **Labores por zona.** Los ocho códigos aparecen para las tres zonas. Como 2360, 3470 y 4380 comparten el nombre "1ER. C.Q. MALEZAS EQUIPO MECÁNICO", presumo que el código distingue algo más (ciclo, tipo de caña o centro de costo). Si cada código aplica solo a ciertas zonas, escriba los números en la columna P de `Catalogos` — el código ya lee esa tercera columna.

3. **Zonas 1 y 3.** El catálogo las incluye pero quedaron fuera de `ZONAS_HABILITADAS`. Basta agregarlas a esa celda para habilitarlas sin tocar el código.

4. **Un mapa por lote y labor.** Es la unidad de control. Si un lote llegara a requerir dos mapas para la misma labor (por ejemplo, dos fechas de aplicación), habría que agregar la fecha o el número de aplicación como quinto nivel.

---

Elaborado por: Armando Reyes

---

## Novedades de la v9 — el módulo genera el mapa

### 1. Publicar el maestro de lotes (una vez por zafra)

El mapa de avance y la generación automática necesitan la geometría de las fincas.

1. Entre como administrador y vaya a **Insumos**.
2. Pulse **Modo administrador** e ingrese usuario y clave.
3. En **Maestro de lotes**, escoja el `.shp` y el `.dbf` del maestro **a la vez**.
4. Pulse **Publicar maestro**.

Su navegador parte el maestro por finca y sube un archivo liviano de cada una a la
carpeta `_GEOMETRIA` dentro de la carpeta raíz. No lo hace Apps Script porque el
shapefile pesa más de lo que cabe en sus 6 minutos de ejecución.

El panel muestra siempre qué maestro está publicado: cuántas fincas, cuántos lotes,
cuándo y quién. **Para reemplazarlo** cuando cambien los lotes, repita el mismo paso
con el shapefile nuevo: las fincas se sobrescriben.

> El módulo une los lotes que el maestro guarda partidos en varios registros. Si el
> maestro trae 1,370 registros y 1,259 lotes, el panel lo dice: la diferencia son
> pedazos del mismo lote.

### 2. Subir un mapa

Cambió el paso 6. Ya no se sube el PDF: se sube el **`.zip` del trabajo del aguilón**
(con el `.shp`, `.shx` y `.dbf` adentro). El módulo:

- cruza el barrido contra el maestro de la finca,
- **descarta todo lo que caiga fuera de los lotes marcados** — los giros de cabecera
  pisan el lote vecino sin estar aplicando, y los traslados quedan fuera de todo lote,
- clasifica las velocidades (Baja ≤ 4, Ideal 4–8, Alta ≥ 8 km/h),
- dibuja el mapa y arma el PDF,
- guarda el `.zip` y el PDF juntos en la carpeta del lote.

**El área sigue siendo la que la zona escribe de la liquidación de bodega.** El área
del GPS no se toma en cuenta porque sobrestima: el barrido cuenta el traslape de las
pasadas. Del GPS se toma sólo la calidad, que es para lo que sirve el mapa.

Si la zona marca un lote donde el GPS casi no registró barrido, o marca uno que el
trabajo no toca, el módulo lo avisa antes de guardar.

### 3. Columnas nuevas

`BDTOS_MAPAS` gana `ARCHIVO_SHP` y `URL_SHP`. Corra **Instalar / actualizar** una vez:
las agrega al final **sin tocar los datos existentes**.

---

## Enlace permanente y aplicación instalable (v28)

Hasta la v27 el módulo solo vivía dentro de Apps Script: cada vez que se
publicaba una versión, la dirección cambiaba y había que repartirla de nuevo.
Desde la v28 el mismo archivo funciona en los dos lados, así que el módulo
puede servirse desde GitHub Pages con una dirección que ya no cambia, y desde
ahí se instala en el teléfono como cualquier aplicación.

El servidor sigue siendo Apps Script. Lo único que cambia es de dónde se baja
la pantalla.

### 1. Publicar el servidor

En Apps Script: **Implementar › Nueva implementación › Aplicación web**.

| Campo | Valor |
|---|---|
| Ejecutar como | **Yo** |
| Quién tiene acceso | **Cualquier usuario** |

Copia la dirección que termina en `/exec`.

> **Esto importa.** «Cualquier usuario» deja la dirección del servidor
> abierta a quien dé con ella: hace falta para que la pantalla servida desde
> GitHub pueda hablarle. A cambio, el ingreso del módulo pasa a ser la única
> puerta. Por eso la v28 cierra lo que estaba flojo: los 19 métodos exigen
> sesión —antes `enviarSoporte` y `probarTiles` no la pedían— y el ingreso se
> frena 15 minutos tras 6 claves falladas seguidas del mismo usuario.
> **Cambia las claves de las zonas antes de publicar.** Las que trae de fábrica
> siguen el mismo molde (zona + año de zafra) y eso se adivina en pocos
> intentos: pon algo que no se deduzca del nombre del usuario.

### 2. Decirle a la pantalla dónde está el servidor

Abre `index.html`, busca la línea `var API_URL = '';` (cerca del comentario
LA PUERTA AL SERVIDOR) y pega ahí la dirección del paso anterior:

```js
var API_URL = 'https://script.google.com/macros/s/AKfy.../exec';
```

Dentro de Apps Script esa línea no se usa: el módulo se da cuenta solo de
dónde está corriendo.

### 3. Encender GitHub Pages

**Settings › Pages › Branch: `main`, carpeta `/ (root)` › Save.**

A los dos minutos queda servido en:

```
https://ajreyes-ingeniomt.github.io/mapas-de-aplicacion/
```

> GitHub Pages necesita que el repositorio sea público, salvo que la cuenta
> tenga plan de pago. Lo que queda a la vista es la pantalla del módulo y la
> dirección del servidor — **no** las claves, ni los datos de fincas y lotes,
> que viven en el libro y solo salen después de entrar.

### 4. Instalarlo en el teléfono

Se abre la dirección en Chrome y se usa **Agregar a pantalla de inicio**. Queda
con icono propio, a pantalla completa y abre sin señal: la pantalla, el mapa y
las imágenes de satélite ya vistas quedan guardadas en el teléfono. Lo que
necesita señal es subir el trabajo, y para eso está la cola de pendientes.

### 5. Publicar una versión nueva

1. Subir los cambios al repositorio (GitHub Pages se actualiza solo).
2. Subir el número de `VERSION` en `sw.js` (`mapas-v1` → `mapas-v2`).
3. Pegar `Codigo.gs` en Apps Script y **Administrar implementaciones › editar ›
   Versión: Nueva**, sin crear una implementación distinta: así la dirección
   `/exec` no cambia.

A quien tenga el módulo abierto le aparece abajo una barra con **Actualizar**.
Nadie se queda a medias: la versión nueva entra cuando la persona la acepta.
