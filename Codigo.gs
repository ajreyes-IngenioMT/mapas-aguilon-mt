/**
 * ============================================================================
 *  MODULO DE MAPAS DE APLICACION - AGUILON ELECTROELECTRONICO
 *  Ingenio Madre Tierra | Departamento de Malezas y Madurantes
 *  Desarrollado por: Armando Reyes
 * ----------------------------------------------------------------------------
 *  Un mapa = un evento de aplicacion, que puede cubrir uno o varios lotes de
 *  la misma finca. El area aplicada por lote viene de la liquidacion de bodega
 *  y se acumula contra el area del maestro de lotes.
 *
 *  Libro: Catalogos | Config | BDTOS_MAPAS | BDTOS_DETALLE | Equipos | Recursos
 *  Archivos del proyecto: Codigo.gs + Formulario.html
 * ============================================================================
 */

var HOJA_CATALOGOS = 'Catalogos';
var HOJA_CONFIG    = 'Config';
var HOJA_BDTOS     = 'BDTOS_MAPAS';
var HOJA_DETALLE   = 'BDTOS_DETALLE';
var HOJA_RECURSOS  = 'Recursos';

/* Bloques dentro de la hoja Catalogos */
var CAT_LOTES_COL = 1,  CAT_LOTES_ANCHO = 12;   // A:L
var CAT_LAB_COL   = 14, CAT_LAB_ANCHO   = 3;    // N:P
var CAT_USR_COL   = 18, CAT_USR_ANCHO   = 5;    // R:V  usuarios
var CAT_CAL_COL   = 24, CAT_CAL_ANCHO   = 6;    // X:AC calendario
var CAT_CAT_COL   = 31, CAT_CAT_ANCHO   = 3;    // AE:AG catorcenas
var CAT_EQU_COL   = 35, CAT_EQU_ANCHO   = 3;    // AI:AK tractor y aguilon por zona
var CAT_OPE_COL   = 39, CAT_OPE_ANCHO   = 3;    // AM:AO operadores

/* BDTOS_MAPAS (evento) */
var M = {
  ID: 1, FECHA: 2, USUARIO: 3, ZAFRA: 4, ZONA: 5, FINCA: 6, COD_LABOR: 7, LABOR: 8,
  F_APLIC: 9, CATORCENA: 10, DIA_ZAFRA: 11, VEHICULO: 12, AGUILON: 13, OPERADOR: 14,
  PRODUCTO: 15, DOSIS_PROG: 16, UNIDAD: 17, CANTIDAD: 18, DOSIS_REAL: 19, VAR_DOSIS: 20,
  LOTES: 21, N_LOTES: 22, AREA_APLIC: 23, ELABORADO: 24, ARCHIVO: 25, TIPO: 26, TAMANO: 27,
  ID_ARCH: 28, URL: 29, RUTA: 30, VERSION: 31, ESTADO: 32, OBS: 33, ARCH_SHP: 34, URL_SHP: 35 };
var MAPAS_ANCHO = 35;

/* BDTOS_DETALLE (una fila por mapa y lote) */
var D = {
  ID: 1, ID_MAPA: 2, FECHA: 3, ZAFRA: 4, ZONA: 5, FINCA: 6, LOTE: 7, DESC: 8,
  AREA_LOTE: 9, VARIEDAD: 10, COD_LABOR: 11, LABOR: 12, F_APLIC: 13, CATORCENA: 14,
  AREA_APLIC: 15, ACUM_ANT: 16, ACUM_ACT: 17, PENDIENTE: 18, AVANCE: 19, VARIACION: 20,
  ESTADO_LOTE: 21, ID_ARCH: 22, URL: 23, ESTADO: 24
};
var DETALLE_ANCHO = 24;

var TZ = 'America/Guatemala';
var CREDITO_APP = 'Desarrollado por Armando Reyes';

/* Sello del código. Si la aplicación no lo muestra en el pie, la versión
   publicada está desactualizada y hay que volver a implementar. */
var VERSION_APP = 'v31';            // sirve para saber si el script quedo viejo
var FECHA_APP = '2026-11-23';       // lo unico que se ensena en el pie
var MINUTOS_SESION = 120;
var MINUTOS_CACHE_TABLERO = 10;

/** Sube cada vez que se guarda o anula un mapa: invalida el tablero cacheado. */
function versionDatos_() {
  var p = PropertiesService.getScriptProperties();
  return p.getProperty('ver_datos') || '0';
}

function tocarVersion_() {
  var p = PropertiesService.getScriptProperties();
  p.setProperty('ver_datos', String(Number(versionDatos_()) + 1));
}
var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* ==========================================================================
 *  1. APLICACION WEB
 * ========================================================================== */

/* ==========================================================================
 *  PUERTA PARA EL MODULO SERVIDO DESDE FUERA
 *
 *  Dentro de Apps Script el navegador llama con google.script.run. Servido
 *  desde GitHub Pages eso no existe, asi que entra por aqui: un POST con
 *  {metodo, args} y una respuesta JSON {_ok, _datos} o {_ok:false, _error}.
 *
 *  El cuerpo viaja como text/plain a proposito: asi el navegador lo trata
 *  como peticion simple y no manda el preflight que Apps Script no contesta.
 * ========================================================================== */

/**
 * Lo unico que se puede llamar desde fuera. Explicito: lo que no este aqui
 * no se alcanza, aunque exista en el archivo.
 */
function apiMetodos_() {
  return {
    login: login,
    cerrarSesion: cerrarSesion,
    cambiarClave: cambiarClave,
    getDatosIniciales: getDatosIniciales,
    getDatosFecha: getDatosFecha,
    getFiltros: getFiltros,
    getLotesFinca: getLotesFinca,
    getEstadoLotes: getEstadoLotes,
    getTablero: getTablero,
    guardarMapa: guardarMapa,
    getTiles: getTiles,
    probarTiles: probarTiles,
    getAplicaciones: getAplicaciones,
    getAvanceFinca: getAvanceFinca,
    getGeometriaFinca: getGeometriaFinca,
    getEstadoMaestro: getEstadoMaestro,
    adminGuardarGeometria: adminGuardarGeometria,
    adminSellarMaestro: adminSellarMaestro,
    enviarSoporte: enviarSoporte
  };
}

function doPost(e) {
  var salida;
  try {
    var crudo = (e && e.postData && e.postData.contents) || '';
    if (!crudo) throw new Error('Peticion vacia.');
    var cuerpo = JSON.parse(crudo);
    var nombre = String(cuerpo.metodo || '');
    var fn = apiMetodos_()[nombre];
    if (typeof fn !== 'function') throw new Error('Metodo no permitido: ' + nombre);
    var args = cuerpo.args;
    if (!(args instanceof Array)) args = [];
    salida = { _ok: true, _datos: fn.apply(null, args) };
  } catch (err) {
    salida = { _ok: false, _error: String((err && err.message) || err) };
  }
  return ContentService
    .createTextOutput(JSON.stringify(salida))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * El mismo despachador, pero para cuando el modulo si corre dentro de Apps
 * Script. Asi el navegador usa una sola ruta y no hay dos caminos que se
 * desincronicen.
 */
function api(metodo, args) {
  var fn = apiMetodos_()[String(metodo || '')];
  if (typeof fn !== 'function') throw new Error('Metodo no permitido: ' + metodo);
  return fn.apply(null, (args instanceof Array) ? args : []);
}

function doGet() {
  var cfg = getConfig_();
  /* El mismo archivo sirve aqui y en GitHub Pages, donde tiene que llamarse
     index.html. Se acepta cualquiera de los dos nombres para no obligar a
     renombrar nada en Apps Script. */
  var salida;
  try { salida = HtmlService.createHtmlOutputFromFile('index'); }
  catch (sinIndex) { salida = HtmlService.createHtmlOutputFromFile('Formulario'); }
  return salida
    .setTitle(cfg.NOMBRE_MODULO || 'Mapas de Aplicación · Aguilón Electroelectrónico')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Mapas Aguilón')
    .addItem('Enviar reporte de avance por correo', 'enviarReporteCorreo')
    .addItem('Programar reporte semanal (lunes 7:00)', 'crearTriggerSemanal')
    .addSeparator()
    .addItem('Crear estructura base de carpetas', 'crearEstructuraBase')
    .addSeparator()
    .addItem('Instalar / actualizar estructura del libro', 'instalarActualizacion')
    .addItem('Diagnóstico (medir tiempos)', 'diagnostico')
    .addToUi();
}

/* ==========================================================================
 *  2. UTILIDADES DE LIBRO
 * ========================================================================== */

function libro_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja_(nombre) {
  var h = libro_().getSheetByName(nombre);
  if (!h) throw new Error('No existe la hoja "' + nombre + '" en el libro.');
  return h;
}

function extraerId_(valor) {
  var v = String(valor || '').trim();
  if (!v) return '';
  var m = v.match(/[-\w]{25,}/);
  return m ? m[0] : v;
}

function aNumero_(txt) {
  if (typeof txt === 'number') return txt;
  var s = String(txt == null ? '' : txt).trim();
  if (!s) return 0;
  if (s.indexOf(',') > -1 && s.indexOf('.') === -1) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Fecha a texto dd/MM/yyyy, venga como venga.
 * Una celda con formato de fecha llega como objeto Date por google.script.run,
 * y al tratarla como texto salía "Thu Nov 12 2026 02:00:00 GMT-0600 (hora
 * estándar central)" en la columna FECHA. Aquí se normaliza una sola vez.
 */
function fechaTexto_(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, TZ, 'dd/MM/yyyy');
  }
  var t = String(v).trim();
  if (!t) return '';
  var iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
  return t;
}

function r2_(n) { return Math.round(n * 100) / 100; }
function r1_(n) { return Math.round(n * 10) / 10; }

function getConfig_() {
  var h = libro_().getSheetByName(HOJA_CONFIG);
  var cfg = {};
  if (!h || h.getLastRow() < 2) return cfg;
  var v = h.getRange(2, 1, h.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) {
    var k = String(v[i][0]).trim();
    if (k) cfg[k] = typeof v[i][1] === 'string' ? v[i][1].trim() : v[i][1];
  }
  return cfg;
}

function tolerancia_() {
  var t = aNumero_(getConfig_().TOLERANCIA_PCT);
  return t > 0 ? t : 5;
}

/* ==========================================================================
 *  3. CATALOGOS
 * ========================================================================== */

function getCatalogoLotes_(zonas) {
  var h = hoja_(HOJA_CATALOGOS);
  if (h.getLastRow() < 2) return [];
  var v = h.getRange(2, CAT_LOTES_COL, h.getLastRow() - 1, CAT_LOTES_ANCHO).getDisplayValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    var zona = String(v[i][0]).trim(), finca = String(v[i][1]).trim(), lote = String(v[i][2]).trim();
    if (!zona || !finca || !lote) continue;
    if (zonas && zonas.length && zonas.indexOf(zona) === -1) continue;
    out.push({ zona: zona, finca: finca, lote: lote, area: aNumero_(v[i][3]),
               desc: String(v[i][4]).trim(), variedad: String(v[i][6]).trim() });
  }
  return out;
}

function getCatalogoLabores_() {
  var h = hoja_(HOJA_CATALOGOS);
  if (h.getLastRow() < 2) return [];
  var v = h.getRange(2, CAT_LAB_COL, h.getLastRow() - 1, CAT_LAB_ANCHO).getDisplayValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    var cod = String(v[i][0]).trim(), nom = String(v[i][1]).trim();
    if (!cod || !nom) continue;
    var zonas = String(v[i][2] || '').trim();
    out.push({ codigo: cod, nombre: nom, etiqueta: cod + ' - ' + nom,
               zonas: zonas ? zonas.split(',').map(function (z) { return z.trim(); }) : [] });
  }
  return out;
}

function getUsuarios_() {
  var h = hoja_(HOJA_CATALOGOS);
  if (h.getLastRow() < 2) return [];
  var v = h.getRange(2, CAT_USR_COL, h.getLastRow() - 1, CAT_USR_ANCHO).getDisplayValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    var u = String(v[i][0]).trim();
    if (!u) continue;
    out.push({ usuario: u.toLowerCase(), clave: String(v[i][1]),
               nombre: String(v[i][2]).trim() || u, zona: String(v[i][3]).trim(),
               rol: (String(v[i][4]).trim() || 'ZONA').toUpperCase() });
  }
  return out;
}

/**
 * Tractor, aguilón y operadores por zona, desde los bloques AI:AK y AM:AO
 * de la hoja Catalogos.
 */
function getEquipos_(zona) {
  var h = hoja_(HOJA_CATALOGOS);
  var out = { VEHICULO: [], AGUILON: [], OPERADOR: [] };
  if (h.getLastRow() < 2) return out;

  var eq = h.getRange(2, CAT_EQU_COL, h.getLastRow() - 1, CAT_EQU_ANCHO).getDisplayValues();
  for (var i = 0; i < eq.length; i++) {
    var z = String(eq[i][0]).trim();
    if (!z) continue;
    if (zona && z !== String(zona)) continue;
    var tra = String(eq[i][1]).trim(), agu = String(eq[i][2]).trim();
    if (tra) out.VEHICULO.push({ zona: z, codigo: tra, descripcion: 'Tractor zona ' + z });
    if (agu) out.AGUILON.push({ zona: z, codigo: agu, descripcion: 'Aguilón zona ' + z });
  }

  var op = h.getRange(2, CAT_OPE_COL, h.getLastRow() - 1, CAT_OPE_ANCHO).getDisplayValues();
  for (var j = 0; j < op.length; j++) {
    var zo = String(op[j][0]).trim();
    var cod = String(op[j][1]).trim();
    var nom = String(op[j][2]).trim();
    if (!zo || !nom) continue;
    if (zona && zo !== String(zona)) continue;
    out.OPERADOR.push({ zona: zo, codigo: nom, descripcion: cod });
  }
  return out;
}

/**
 * Calendario de la zafra (bloque X:AC). Devuelve, para una fecha dd/MM/yyyy,
 * su catorcena y su día de zafra.
 */
function getCalendario_() {
  var cache = CacheService.getScriptCache();
  var guardado = cache.get('calendario');
  if (guardado) { try { return JSON.parse(guardado); } catch (e) {} }

  var h = hoja_(HOJA_CATALOGOS);
  var mapa = {};
  if (h.getLastRow() > 1) {
    var v = h.getRange(2, CAT_CAL_COL, h.getLastRow() - 1, CAT_CAL_ANCHO).getValues();
    for (var i = 0; i < v.length; i++) {
      var f = v[i][0];
      if (!f || !(f instanceof Date)) continue;
      mapa[Utilities.formatDate(f, TZ, 'dd/MM/yyyy')] = {
        cat: v[i][1], dia: v[i][2], mes: v[i][3], semana: v[i][4], diaZafra: v[i][5]
      };
    }
  }
  try { cache.put('calendario', JSON.stringify(mapa), 21600); } catch (e2) {}
  return mapa;
}

/** Catorcena y día de zafra de una fecha dd/MM/yyyy. */
function datosFecha_(fechaTxt) {
  var m = getCalendario_()[String(fechaTxt).trim()];
  return m ? { catorcena: m.cat, diaZafra: m.diaZafra } : { catorcena: '', diaZafra: '' };
}

/** Rango de fechas de cada catorcena (bloque AE:AG), para los filtros. */
function getCatorcenas_() {
  var h = hoja_(HOJA_CATALOGOS);
  if (h.getLastRow() < 2) return [];
  var v = h.getRange(2, CAT_CAT_COL, h.getLastRow() - 1, CAT_CAT_ANCHO).getValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (!v[i][0]) continue;
    out.push({
      cat: String(v[i][0]),
      inicio: v[i][1] instanceof Date ? Utilities.formatDate(v[i][1], TZ, 'dd/MM/yyyy') : '',
      fin: v[i][2] instanceof Date ? Utilities.formatDate(v[i][2], TZ, 'dd/MM/yyyy') : ''
    });
  }
  return out;
}

/** Consulta desde el formulario: qué catorcena corresponde a una fecha. */
function getDatosFecha(token, fechaTxt) {
  validarSesion_(token);
  return datosFecha_(fechaTxt);
}

/* ==========================================================================
 *  4. SESIONES
 * ========================================================================== */

/* Cuántas veces se puede fallar la clave antes de que el usuario quede
   frenado, y por cuántos minutos. Importa desde v28: la dirección del
   servidor queda abierta al público, así que la puerta de entrada es lo
   único que separa el módulo de quien dé con ella. */
var LOGIN_FALLOS = 6;
var LOGIN_FRENO_MIN = 15;

function login(usuario, clave) {
  Utilities.sleep(500);
  var u = String(usuario || '').trim().toLowerCase();
  var c = String(clave || '');

  var cache = CacheService.getScriptCache();
  var llave = 'fallos_' + u;
  var fallos = Number(cache.get(llave) || 0);
  if (fallos >= LOGIN_FALLOS) {
    return { ok: false, mensaje: 'Demasiados intentos fallidos. Espere ' +
      LOGIN_FRENO_MIN + ' minutos o pida ayuda al administrador.' };
  }

  var lista = getUsuarios_();
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].usuario === u && lista[i].clave === c) {
      cache.remove(llave);
      var token = Utilities.getUuid();
      var s = { usuario: lista[i].usuario, nombre: lista[i].nombre, zona: lista[i].zona, rol: lista[i].rol };
      CacheService.getScriptCache().put('ses_' + token, JSON.stringify(s), MINUTOS_SESION * 60);
      s.ok = true; s.token = token; s.minutos = MINUTOS_SESION;
      return s;
    }
  }
  /* El contador arranca de nuevo cada vez que se falla, así que son
     LOGIN_FALLOS seguidos dentro de la ventana, no en toda la vida. */
  cache.put(llave, String(fallos + 1), LOGIN_FRENO_MIN * 60);
  return { ok: false, mensaje: 'Usuario o clave incorrectos.' };
}

/**
 * Cambia la clave del usuario de la sesión. Escribe en la misma fila de la
 * hoja Catalogos de donde salió, así que lo que cambie aquí es lo que vale
 * para entrar. La clave vieja se pide siempre: el token solo prueba que la
 * sesión sigue viva, no que quien está al teclado sea el dueño.
 */
function cambiarClave(token, actual, nueva) {
  var s = validarSesion_(token);
  var vieja = String(actual || '');
  var nue = String(nueva || '');
  if (nue.length < 6) throw new Error('La clave nueva debe tener al menos 6 caracteres.');
  if (nue === vieja) throw new Error('La clave nueva es igual a la que ya tenía.');
  if (/\s/.test(nue)) throw new Error('La clave no puede llevar espacios.');

  var h = hoja_(HOJA_CATALOGOS);
  if (h.getLastRow() < 2) throw new Error('No hay usuarios registrados.');
  var v = h.getRange(2, CAT_USR_COL, h.getLastRow() - 1, CAT_USR_ANCHO).getDisplayValues();
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][0]).trim().toLowerCase() !== s.usuario) continue;
    if (String(v[i][1]) !== vieja) throw new Error('La clave actual no es correcta.');
    h.getRange(i + 2, CAT_USR_COL + 1).setValue(nue);
    SpreadsheetApp.flush();
    return { ok: true, mensaje: 'Su clave quedó cambiada.' };
  }
  throw new Error('No se encontró su usuario en el catálogo.');
}

function cerrarSesion(token) {
  if (token) CacheService.getScriptCache().remove('ses_' + token);
  return { ok: true };
}

function validarSesion_(token) {
  var s = token ? CacheService.getScriptCache().get('ses_' + String(token)) : null;
  if (!s) throw new Error('Su sesión expiró. Vuelva a ingresar.');
  return JSON.parse(s);
}

function exigirAdmin_(token) {
  var s = validarSesion_(token);
  if (s.rol !== 'ADMIN') throw new Error('Esta acción es solo para el administrador del módulo.');
  return s;
}

/* ==========================================================================
 *  5. DATOS INICIALES
 * ========================================================================== */

function getDatosIniciales(token) {
  var cfg = getConfig_();
  var sesion = null;
  try { sesion = token ? validarSesion_(token) : null; } catch (e) { sesion = null; }
  if (!sesion) {
    return { autenticado: false,
             departamento: String(cfg.DEPARTAMENTO || 'Departamento de Malezas y Madurantes'),
             zafra: String(cfg.ZAFRA || ''), credito: CREDITO_APP };
  }

  var zonasCfg = String(cfg.ZONAS_HABILITADAS || '')
    .split(',').map(function (z) { return z.trim(); }).filter(String);
  var lotes = getCatalogoLotes_(zonasCfg);
  if (!zonasCfg.length) {
    var set = {};
    lotes.forEach(function (l) { set[l.zona] = true; });
    zonasCfg = Object.keys(set).sort(function (a, b) { return a - b; });
  }
  /* El recorte por zona usa la misma regla que el resto del modulo: jefatura,
     asistentes y gerencia ven el ingenio completo; el usuario de zona, la
     suya y nada mas. Antes aqui solo se preguntaba por ADMIN, asi que un
     usuario de zona podia bajarse el catalogo entero. */
  var permitidas = zonasDeSesion_(sesion);
  var zonas = permitidas
    ? zonasCfg.filter(function (z) { return permitidas.indexOf(z) > -1; })
    : zonasCfg;
  if (permitidas) {
    lotes = lotes.filter(function (l) { return permitidas.indexOf(String(l.zona)) > -1; });
  }

  return {
    autenticado: true,
    sesion: { usuario: sesion.usuario, nombre: sesion.nombre, zona: sesion.zona, rol: sesion.rol },
    zafra: String(cfg.ZAFRA || ''),
    titulo: String(cfg.NOMBRE_MODULO || 'Mapas de Aplicación · Aguilón Electroelectrónico'),
    departamento: String(cfg.DEPARTAMENTO || 'Departamento de Malezas y Madurantes'),
    credito: CREDITO_APP,
    version: VERSION_APP,
    actualizado: FECHA_APP,
    tolerancia: tolerancia_(),
    zonas: zonas,
    lotes: lotes.map(function (l) { return [l.zona, l.finca, l.lote, l.area, l.desc, l.variedad]; }),
    labores: getCatalogoLabores_(),
    /* Los equipos bajan completos, de todas las zonas. Las zonas se prestan
       equipo y personal, y con el catalogo recortado a la propia ese caso no
       se podia registrar. La interfaz pone los de su zona arriba y ya
       elegidos; los de las demas quedan a mano por si hubo prestamo. */
    equipos: getEquipos_(''),
    recursos: getRecursos_(),
    hayInsumos: !!cfg.ID_CARPETA_RECURSOS,
    extensiones: String(cfg.EXTENSIONES_PERMITIDAS || 'pdf'),
    tamanoMaxMB: Number(cfg.TAMANO_MAX_MB) || 20
  };
}

/* ==========================================================================
 *  6. INSUMOS
 * ========================================================================== */

function getRecursos_() {
  var h = libro_().getSheetByName(HOJA_RECURSOS);
  if (!h || h.getLastRow() < 2) return [];
  var v = h.getRange(2, 1, h.getLastRow() - 1, 6).getDisplayValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (!String(v[i][1]).trim() || !String(v[i][4]).trim()) continue;
    if (String(v[i][5]).trim().toUpperCase() === 'NO') continue;
    out.push({ categoria: String(v[i][0]).trim() || 'General', nombre: String(v[i][1]).trim(),
               descripcion: String(v[i][2]).trim(), tipo: String(v[i][3]).trim(),
               url: String(v[i][4]).trim() });
  }
  return out;
}

var MAX_ARCHIVOS_RECURSOS = 150;

function getRecursosDrive_(idCarpeta, forzar) {
  if (!idCarpeta) return null;
  var cache = CacheService.getScriptCache();
  var clave = 'recursos_' + idCarpeta;
  if (!forzar) {
    var guardado = cache.get(clave);
    if (guardado) { try { return JSON.parse(guardado); } catch (e) { cache.remove(clave); } }
  }
  var raiz;
  try { raiz = DriveApp.getFolderById(idCarpeta); }
  catch (e) { return { error: 'No se pudo abrir la carpeta de insumos. Revise ID_CARPETA_RECURSOS.' }; }

  var total = 0;
  var res = { nombre: raiz.getName(), url: raiz.getUrl(), carpetas: [], archivos: [], truncado: false };
  var itF = raiz.getFiles();
  while (itF.hasNext() && total < MAX_ARCHIVOS_RECURSOS) { res.archivos.push(fichaArchivo_(itF.next())); total++; }
  var itC = raiz.getFolders();
  while (itC.hasNext() && total < MAX_ARCHIVOS_RECURSOS) {
    var sub = itC.next();
    var grupo = { nombre: sub.getName(), url: sub.getUrl(), archivos: [], mas: 0 };
    var itSF = sub.getFiles();
    while (itSF.hasNext()) {
      if (total >= MAX_ARCHIVOS_RECURSOS) { res.truncado = true; break; }
      if (grupo.archivos.length >= 25) { grupo.mas++; continue; }
      grupo.archivos.push(fichaArchivo_(itSF.next())); total++;
    }
    var itSC = sub.getFolders();
    while (itSC.hasNext()) { itSC.next(); grupo.mas++; }
    res.carpetas.push(grupo);
  }
  if (itC.hasNext() || itF.hasNext()) res.truncado = true;
  res.carpetas.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
  res.archivos.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
  try { cache.put(clave, JSON.stringify(res), 3600); } catch (e2) {}
  return res;
}

function fichaArchivo_(f) {
  var nombre = f.getName();
  var ext = nombre.indexOf('.') > -1 ? nombre.split('.').pop().toUpperCase() : '';
  if (!ext || ext.length > 5) {
    var mt = f.getMimeType();
    if (mt === MimeType.GOOGLE_DOCS) ext = 'DOC';
    else if (mt === MimeType.GOOGLE_SHEETS) ext = 'HOJA';
    else if (mt === MimeType.GOOGLE_SLIDES) ext = 'PRES';
    else ext = 'ARCHIVO';
  }
  return { id: f.getId(), nombre: nombre, url: f.getUrl(), tipo: ext };
}

function refrescarRecursos(forzar) {
  var cfg = getConfig_();
  return { recursosDrive: getRecursosDrive_(extraerId_(cfg.ID_CARPETA_RECURSOS), forzar !== false),
           recursos: getRecursos_() };
}

function carpetaInsumos_() {
  var cfg = getConfig_();
  if (!cfg.ID_CARPETA_RECURSOS) throw new Error('Falta ID_CARPETA_RECURSOS en la hoja Config.');
  return DriveApp.getFolderById(extraerId_(cfg.ID_CARPETA_RECURSOS));
}

function adminListarDestinos(token) {
  exigirAdmin_(token);
  var raiz = carpetaInsumos_();
  var out = [{ id: raiz.getId(), nombre: '(Raíz) ' + raiz.getName() }];
  var it = raiz.getFolders();
  while (it.hasNext()) { var f = it.next(); out.push({ id: f.getId(), nombre: f.getName() }); }
  return out;
}

function adminCrearCarpeta(token, nombre) {
  exigirAdmin_(token);
  nombre = limpiarNombre_(nombre);
  if (!nombre) throw new Error('Indique el nombre de la carpeta.');
  var raiz = carpetaInsumos_();
  var f = carpeta_(raiz, nombre);
  CacheService.getScriptCache().remove('recursos_' + raiz.getId());
  return { ok: true, id: f.getId(), nombre: f.getName() };
}

function adminSubirInsumo(token, idCarpeta, archivo) {
  exigirAdmin_(token);
  if (!archivo || !archivo.base64) throw new Error('No se recibió el archivo.');
  var raiz = carpetaInsumos_();
  var destino = idCarpeta ? DriveApp.getFolderById(extraerId_(idCarpeta)) : raiz;
  var bytes = Utilities.base64Decode(archivo.base64);
  if (bytes.length / 1048576 > 40) throw new Error('El archivo supera los 40 MB.');
  var previos = destino.getFilesByName(archivo.nombre);
  var reemplazo = false;
  while (previos.hasNext()) { previos.next().setTrashed(true); reemplazo = true; }
  var f = destino.createFile(Utilities.newBlob(bytes, archivo.mimeType || MimeType.PLAIN_TEXT, archivo.nombre));
  CacheService.getScriptCache().remove('recursos_' + raiz.getId());
  return { ok: true, nombre: f.getName(), url: f.getUrl(), reemplazo: reemplazo };
}

function adminEliminarInsumo(token, idArchivo) {
  exigirAdmin_(token);
  var f = DriveApp.getFileById(idArchivo);
  var nombre = f.getName();
  f.setTrashed(true);
  CacheService.getScriptCache().remove('recursos_' + carpetaInsumos_().getId());
  return { ok: true, nombre: nombre };
}

/* ==========================================================================
 *  7. ESTADO ACUMULADO DE LOS LOTES
 * ========================================================================== */

function getDetalle_(zafra) {
  var h = libro_().getSheetByName(HOJA_DETALLE);
  if (!h || h.getLastRow() < 2) return [];
  var v = h.getRange(2, 1, h.getLastRow() - 1, DETALLE_ANCHO).getValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (!v[i][D.ID - 1]) continue;
    if (String(v[i][D.ESTADO - 1]).toUpperCase() !== 'VIGENTE') continue;
    if (zafra && String(v[i][D.ZAFRA - 1]).trim() !== String(zafra).trim()) continue;
    out.push(v[i]);
  }
  return out;
}

function claveLote_(zona, finca, lote, codLabor) {
  return [String(zona).trim(), String(finca).trim().toUpperCase(),
          String(lote).trim(), String(codLabor).trim()].join('|');
}

/** Acumulado por lote+labor de toda la zafra. */
function acumuladosPorLote_(zafra) {
  var acum = {};
  getDetalle_(zafra).forEach(function (f) {
    var k = claveLote_(f[D.ZONA - 1], f[D.FINCA - 1], f[D.LOTE - 1], f[D.COD_LABOR - 1]);
    if (!acum[k]) acum[k] = { area: 0, aplicaciones: 0, ultima: '' };
    acum[k].area += aNumero_(f[D.AREA_APLIC - 1]);
    acum[k].aplicaciones++;
    var fa = f[D.F_APLIC - 1];
    acum[k].ultima = fa ? String(fa) : acum[k].ultima;
  });
  return acum;
}

function estadoLote_(areaLote, acum, tol) {
  if (!areaLote) return 'SIN AREA';
  var pct = (acum / areaLote) * 100;
  if (pct < 100 - tol) return 'EN PROCESO';
  if (pct > 100 + tol) return 'EXCEDIDO';
  return 'COMPLETO';
}

/**
 * Lista simple de los lotes de una finca, con el resumen de las labores que
 * ya tienen mapa. Un mismo lote puede llevar varias labores (1er control,
 * 2do control, etc.): cada una se acumula por separado.
 */
function getLotesFinca(token, zona, finca) {
  validarSesion_(token);
  var cfg = getConfig_();
  var zafra = String(cfg.ZAFRA || '');
  var tol = tolerancia_();

  var porLoteLabor = {};
  getDetalle_(zafra).forEach(function (f) {
    if (String(f[D.ZONA - 1]).trim() !== String(zona).trim()) return;
    if (String(f[D.FINCA - 1]).trim().toUpperCase() !== String(finca).trim().toUpperCase()) return;
    var lo = String(f[D.LOTE - 1]).trim(), cl = String(f[D.COD_LABOR - 1]).trim();
    if (!porLoteLabor[lo]) porLoteLabor[lo] = {};
    if (!porLoteLabor[lo][cl]) porLoteLabor[lo][cl] = { codigo: cl, area: 0, areaLote: aNumero_(f[D.AREA_LOTE - 1]) };
    porLoteLabor[lo][cl].area += aNumero_(f[D.AREA_APLIC - 1]);
  });

  return getCatalogoLotes_(null)
    .filter(function (l) {
      return l.zona === String(zona).trim() &&
             l.finca.toUpperCase() === String(finca).trim().toUpperCase();
    })
    .sort(function (a, b) { return a.lote.localeCompare(b.lote); })
    .map(function (l) {
      var labores = [];
      var reg = porLoteLabor[l.lote] || {};
      Object.keys(reg).sort().forEach(function (cl) {
        var r = reg[cl];
        labores.push({ codigo: cl, avance: l.area ? r1_((r.area / l.area) * 100) : 0,
                       estado: estadoLote_(l.area, r.area, tol) });
      });
      return { lote: l.lote, desc: l.desc, variedad: l.variedad, area: r2_(l.area), labores: labores };
    });
}

/**
 * Estado de los lotes seleccionados para una labor concreta: area del
 * maestro, lo ya aplicado en esa labor y lo que falta.
 */
function getEstadoLotes(token, zona, finca, codLabor, lotes) {
  validarSesion_(token);
  var cfg = getConfig_();
  var zafra = String(cfg.ZAFRA || '');
  var tol = tolerancia_();
  var acum = acumuladosPorLote_(zafra);
  var cat = getCatalogoLotes_(null);
  var idx = {};
  cat.forEach(function (l) { idx[claveLote_(l.zona, l.finca, l.lote, '')] = l; });

  return (lotes || []).map(function (lote) {
    var info = idx[claveLote_(zona, finca, lote, '')] || { area: 0, desc: '', variedad: '' };
    var k = claveLote_(zona, finca, lote, codLabor);
    var ya = acum[k] ? r2_(acum[k].area) : 0;
    var pend = r2_(info.area - ya);
    return {
      lote: lote, desc: info.desc, variedad: info.variedad, areaLote: r2_(info.area),
      acumulado: ya, pendiente: pend,
      avance: info.area ? r1_((ya / info.area) * 100) : 0,
      aplicaciones: acum[k] ? acum[k].aplicaciones : 0,
      estado: estadoLote_(info.area, ya, tol),
      sugerido: pend > 0 ? pend : 0
    };
  });
}

/* ==========================================================================
 *  7-B. GEOMETRÍA DE LOTES Y VISOR DE MAPAS
 *
 *  El maestro del ingenio pesa 6.2 MB. Bajarlo entero al navegador cada vez
 *  que alguien abre el visor no es viable desde el campo, así que se guarda
 *  partido por finca: 88 archivos de 18 KB en promedio. El corte lo hace el
 *  navegador del administrador una sola vez por zafra (el .shp se parsea allá,
 *  no aquí, porque Apps Script se queda sin los 6 minutos).
 * ========================================================================== */

var CARPETA_GEOMETRIA = '_GEOMETRIA';
var MAX_CACHE_GEOM = 92000;   // CacheService corta en 100 KB por clave

/**
 * Quién ve qué.
 *   ADMIN    — Armando. Ve todo y es el único que entra a Administración.
 *   INGENIO  — jefes de departamento, asistentes y gerencia. Ven todo el
 *              ingenio, pero no tocan el maestro ni la configuración.
 *   ZONA     — las zonas de producción. Sólo la suya, y no entre ellas.
 * Devuelve null cuando no hay restricción de zona.
 */
var ROLES_INGENIO = ['ADMIN', 'INGENIO', 'GERENCIA', 'JEFATURA', 'ASISTENTE'];

function veTodoElIngenio_(sesion) {
  return ROLES_INGENIO.indexOf(String(sesion.rol || '').trim().toUpperCase()) > -1;
}

function zonasDeSesion_(sesion) {
  if (veTodoElIngenio_(sesion)) return null;   // null = todas
  var z = String(sesion.zona || '').trim();
  /* Un usuario que no es del ingenio y no tiene zona asignada no ve nada:
     antes veia todo, que es justo al reves de lo que uno espera de un
     usuario mal registrado. */
  return z ? [z] : [];
}

/**
 * Valida la sesión y, si es usuario de zona, que la zona pedida sea la suya.
 * La restricción va aquí y no sólo en la pantalla: el cliente puede mentir.
 */
function exigirZona_(token, zona) {
  var s = validarSesion_(token);
  var permitidas = zonasDeSesion_(s);
  if (permitidas && !permitidas.length) {
    throw new Error('Su usuario no tiene zona asignada. Pidale al administrador ' +
      'que le ponga la zona en la hoja Catalogos.');
  }
  if (permitidas && permitidas.indexOf(String(zona).trim()) === -1) {
    throw new Error('No tiene acceso a la zona ' + zona + '.');
  }
  return s;
}

function carpetaGeometria_() {
  var cfg = getConfig_();
  if (!cfg.ID_CARPETA_RAIZ) throw new Error('Falta ID_CARPETA_RAIZ en la hoja Config.');
  return carpeta_(DriveApp.getFolderById(extraerId_(cfg.ID_CARPETA_RAIZ)), CARPETA_GEOMETRIA);
}

function nombreGeom_(zona, finca) {
  return 'Z' + String(zona).trim() + '_' + limpiarNombre_(finca).replace(/\s+/g, '_') + '.json';
}

/**
 * Guarda el paquete de una finca. Lo llama el navegador del administrador,
 * una finca por llamada, mientras parte el maestro.
 */
function adminGuardarGeometria(token, zona, finca, json) {
  exigirAdmin_(token);
  if (!finca || !json) throw new Error('Faltan datos de la finca.');
  var carpeta = carpetaGeometria_();
  var nombre = nombreGeom_(zona, finca);
  var previos = carpeta.getFilesByName(nombre);
  while (previos.hasNext()) previos.next().setTrashed(true);
  carpeta.createFile(Utilities.newBlob(json, 'application/json', nombre));
  var c = CacheService.getScriptCache();
  c.remove('geom_' + nombre); c.remove('geomlista'); c.remove('metamaestro');
  return { ok: true, finca: finca, kb: Math.round(json.length / 1024) };
}

/** Lista de fincas con geometría publicada, filtrada por la zona del usuario. */
function getFincasGeometria(token) {
  var s = validarSesion_(token);
  var permitidas = zonasDeSesion_(s);
  var cache = CacheService.getScriptCache();
  var crudo = cache.get('geomlista');
  var todas;
  if (crudo) {
    try { todas = JSON.parse(crudo); } catch (e) { todas = null; }
  }
  if (!todas) {
    todas = [];
    var it = carpetaGeometria_().getFiles();
    while (it.hasNext()) {
      var f = it.next(), n = f.getName();
      if (n.slice(-5).toLowerCase() !== '.json') continue;
      var m = n.slice(0, -5).match(/^Z([^_]*)_(.+)$/);
      if (!m) continue;
      todas.push({ zona: m[1], archivo: n, finca: m[2].replace(/_/g, ' '), kb: Math.round(f.getSize() / 1024) });
    }
    todas.sort(function (a, b) {
      return a.zona === b.zona ? a.finca.localeCompare(b.finca) : (a.zona - b.zona);
    });
    try { cache.put('geomlista', JSON.stringify(todas), 1800); } catch (e2) {}
  }
  if (!permitidas) return todas;
  return todas.filter(function (x) { return permitidas.indexOf(String(x.zona)) > -1; });
}

/**
 * Devuelve el paquete de geometría de una finca como texto JSON.
 * Se devuelve string y no objeto a propósito: los objetos grandes se han
 * estado perdiendo al cruzar google.script.run.
 */
function getGeometriaFinca(token, zona, finca) {
  exigirZona_(token, zona);
  var nombre = nombreGeom_(zona, finca);
  var cache = CacheService.getScriptCache();
  var guardado = cache.get('geom_' + nombre);
  if (guardado) return guardado;
  var it = carpetaGeometria_().getFilesByName(nombre);
  if (!it.hasNext()) {
    throw new Error('No hay geometría publicada para ' + finca +
      '. El administrador debe correr "Actualizar maestro de lotes" en Insumos.');
  }
  var texto = it.next().getBlob().getDataAsString('UTF-8');
  if (texto.length < MAX_CACHE_GEOM) {
    try { cache.put('geom_' + nombre, texto, 3600); } catch (e) {}
  }
  return texto;
}

/* ------------------------------------------------- avance por finca y labor */

/**
 * Cuánto lleva cada lote de la finca en cada labor, y el resumen de la finca.
 * Esto es lo que pinta el mapa de avance: responde "cuánto del área de la
 * finca lleva primer control, cuánto segundo control".
 *
 * Devuelve string JSON por la misma razón que getGeometriaFinca.
 */
function getAvanceFinca(token, zona, finca, filtros) {
  exigirZona_(token, zona);
  filtros = filtros || {};
  var cfg = getConfig_();
  var zafra = String(filtros.zafra || cfg.ZAFRA || '');
  var tol = tolerancia_();
  var zonaTxt = String(zona).trim();
  var fincaTxt = String(finca).trim().toUpperCase();

  var labores = getCatalogoLabores_();
  var nombreLabor = {};
  labores.forEach(function (l) { nombreLabor[l.codigo] = l.nombre; });

  /* lo aplicado, por lote y labor */
  var porLote = {}, usadas = {};
  getDetalle_(zafra).forEach(function (f) {
    if (String(f[D.ZONA - 1]).trim() !== zonaTxt) return;
    if (String(f[D.FINCA - 1]).trim().toUpperCase() !== fincaTxt) return;
    if (filtros.catorcena && String(f[D.CATORCENA - 1]).trim() !== String(filtros.catorcena).trim()) return;
    var lo = String(f[D.LOTE - 1]).trim();
    var cl = String(f[D.COD_LABOR - 1]).trim();
    if (!lo || !cl) return;
    usadas[cl] = true;
    if (!porLote[lo]) porLote[lo] = {};
    if (!porLote[lo][cl]) porLote[lo][cl] = { area: 0, aplicaciones: 0, ultima: '' };
    var r = porLote[lo][cl];
    r.area += aNumero_(f[D.AREA_APLIC - 1]);
    r.aplicaciones++;
    var fa = fechaTexto_(f[D.F_APLIC - 1]);
    if (fa && fa > r.ultima) r.ultima = fa;
  });

  /* catálogo de la finca */
  var lotesCat = getCatalogoLotes_(null).filter(function (l) {
    return l.zona === zonaTxt && l.finca.toUpperCase() === fincaTxt;
  }).sort(function (a, b) { return a.lote.localeCompare(b.lote); });

  var codigos = Object.keys(usadas).sort();
  var areaFinca = 0;
  var resumen = {};
  codigos.forEach(function (cl) {
    resumen[cl] = { codigo: cl, nombre: nombreLabor[cl] || cl, areaAplicada: 0,
                    completos: 0, parciales: 0, pendientes: 0, areaLotesTocados: 0 };
  });

  var lotes = lotesCat.map(function (l) {
    areaFinca += l.area;
    var fila = { lote: l.lote, desc: l.desc, variedad: l.variedad, area: r2_(l.area), labores: {} };
    codigos.forEach(function (cl) {
      var r = (porLote[l.lote] || {})[cl];
      var ya = r ? r.area : 0;
      var est = estadoLote_(l.area, ya, tol);
      fila.labores[cl] = { area: r2_(ya), avance: l.area ? r1_((ya / l.area) * 100) : 0,
                           estado: est, aplicaciones: r ? r.aplicaciones : 0,
                           ultima: r ? r.ultima : '' };
      var R = resumen[cl];
      R.areaAplicada += ya;
      if (ya <= 0) { R.pendientes++; }
      else if (est === 'COMPLETO' || est === 'EXCEDIDO') { R.completos++; R.areaLotesTocados += l.area; }
      else { R.parciales++; R.areaLotesTocados += l.area; }
    });
    return fila;
  });

  codigos.forEach(function (cl) {
    var R = resumen[cl];
    R.areaAplicada = r2_(R.areaAplicada);
    R.pctArea = areaFinca ? r1_((R.areaAplicada / areaFinca) * 100) : 0;
    R.pctLotes = lotes.length ? r1_(((R.completos + R.parciales) / lotes.length) * 100) : 0;
  });

  return JSON.stringify({
    zona: zonaTxt, finca: finca, zafra: zafra, tolerancia: tol,
    areaFinca: r2_(areaFinca), nLotes: lotes.length,
    labores: codigos.map(function (cl) { return resumen[cl]; }),
    lotes: lotes
  });
}

/* ----------------------------------------------- imagen satelital (tiles) */

/**
 * Trae los tiles del basemap desde el servidor y los devuelve en base64.
 *
 * Dos razones para no pedirlos desde el navegador:
 *  1. La red del ingenio puede no alcanzar el servidor de imágenes; Apps
 *     Script sí, porque corre en Google.
 *  2. Un tile traído directo "mancha" el lienzo si el servidor no manda
 *     cabecera CORS, y entonces el PDF no se puede exportar. Pasando por aquí
 *     llega como dato, no como recurso de otro dominio, y eso no pasa nunca.
 *
 * Se piden todos de un golpe con fetchAll, que los resuelve en paralelo.
 */
var TILES_ESRI_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/' +
                     'World_Imagery/MapServer/tile/{z}/{y}/{x}';
var TILES_PLANTILLA = TILES_ESRI_URL;   // compatibilidad
var MAX_TILES = 80;

/**
 * De dónde sale la imagen de fondo.
 *  - esri   : World Imagery, gratis y sin llave. Es el de por defecto.
 *  - google : Google Maps Static API. Da la imagen de Google, pero EXIGE una
 *             llave propia (LLAVE_GOOGLE en la hoja Config) y Google la cobra
 *             por petición. No se usa el endpoint interno de Google Maps
 *             porque usarlo fuera de su visor va contra sus términos.
 */
function proveedorMapa_() {
  var cfg = getConfig_();
  var prov = String(cfg.PROVEEDOR_MAPA || 'esri').trim().toLowerCase();
  var llave = String(cfg.LLAVE_GOOGLE || '').trim();
  if (prov === 'google' && !llave) prov = 'esri';   // sin llave no hay Google
  return { nombre: prov, llave: llave };
}

/** URL de un tile según el proveedor configurado. */
function urlTile_(prov, t) {
  if (prov.nombre === 'google') {
    /* Google Static Maps no sirve teselas por índice, sino una imagen por
     * centro y zoom. El centro del tile z/x/y se calcula y se pide una
     * imagen de 256 px que ocupa exactamente ese espacio. */
    var n = Math.pow(2, t.z);
    var lon = (t.x + 0.5) / n * 360 - 180;
    var k = Math.PI - 2 * Math.PI * (t.y + 0.5) / n;
    var lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(k) - Math.exp(-k)));
    return 'https://maps.googleapis.com/maps/api/staticmap' +
      '?center=' + lat.toFixed(8) + ',' + lon.toFixed(8) +
      '&zoom=' + t.z + '&size=256x256&scale=2&maptype=satellite&format=jpg' +
      '&key=' + encodeURIComponent(prov.llave);
  }
  return TILES_ESRI_URL.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y);
}

function getTiles(token, lista) {
  validarSesion_(token);
  if (!lista || !lista.length) return JSON.stringify([]);
  if (lista.length > MAX_TILES) lista = lista.slice(0, MAX_TILES);

  var prov = proveedorMapa_();
  var cache = CacheService.getScriptCache();
  var claves = lista.map(function (t) {
    return 'tile_' + prov.nombre + '_' + t.z + '_' + t.x + '_' + t.y;
  });
  var enCache = {};
  try { enCache = cache.getAll(claves) || {}; } catch (e) { enCache = {}; }

  var pedir = [], indices = [];
  lista.forEach(function (t, i) {
    if (enCache[claves[i]]) return;
    pedir.push({
      url: urlTile_(prov, t),
      muteHttpExceptions: true,
      followRedirects: true
    });
    indices.push(i);
  });

  var salida = new Array(lista.length);
  lista.forEach(function (t, i) { salida[i] = enCache[claves[i]] || null; });

  if (pedir.length) {
    var respuestas;
    try { respuestas = UrlFetchApp.fetchAll(pedir); }
    catch (e) { return JSON.stringify(salida); }   // sin red: el mapa cae a fondo claro

    var guardar = {};
    respuestas.forEach(function (r, k) {
      var i = indices[k];
      try {
        if (r.getResponseCode() !== 200) return;
        var blob = r.getBlob();
        var tipo = blob.getContentType() || 'image/jpeg';
        if (tipo.indexOf('image/') !== 0) return;
        var b64 = Utilities.base64Encode(blob.getBytes());
        var dato = 'data:' + tipo + ';base64,' + b64;
        salida[i] = dato;
        /* CacheService corta en 100 KB por clave; un tile satelital pesa
           bastante menos, pero se comprueba por si acaso. */
        if (dato.length < 95000) guardar[claves[i]] = dato;
      } catch (e2) { /* un tile que falla sólo deja un hueco */ }
    });
    if (Object.keys(guardar).length) {
      try { cache.putAll(guardar, 21600); } catch (e3) {}   // 6 horas
    }
  }

  /* Si TODOS los tiles vienen idénticos, no es imagen: es el mosaico de
   * relleno que Esri devuelve cuando se le pide más zoom del que tiene para
   * ese lugar ("Map data not yet available"). Se avisa para que el cliente
   * vuelva a pedir un nivel más abierto, donde sí hay fotografía. */
  var vivos = salida.filter(Boolean);
  var uniforme = false;
  if (vivos.length >= 4) {
    uniforme = true;
    for (var u = 1; u < vivos.length; u++) {
      if (vivos[u] !== vivos[0]) { uniforme = false; break; }
    }
  }

  return JSON.stringify({ tiles: salida, uniforme: uniforme });
}

/**
 * ¿Alcanza el servidor la imagen satelital? Devuelve el resultado en claro,
 * para que no haya que adivinar por qué el mapa sale sobre fondo liso.
 */
function probarTiles(token) {
  /* v28: antes el token era opcional y cualquiera podia gastar la cuota
     del mapa de fondo, que se paga. Ahora se exige. */
  validarSesion_(token);
  var prov = proveedorMapa_();
  var cfg = getConfig_();
  var pedido = String(cfg.PROVEEDOR_MAPA || 'esri').trim().toLowerCase();
  var t = { z: 13, x: 2016, y: 3770 };          // un tile sobre la costa sur
  var out = { proveedor: prov.nombre, pedido: pedido,
              tieneLlave: !!prov.llave, ok: false };
  if (pedido === 'google' && !prov.llave) {
    out.aviso = 'Config pide Google pero falta LLAVE_GOOGLE, así que se usa Esri.';
  }
  try {
    var r = UrlFetchApp.fetch(urlTile_(prov, t), { muteHttpExceptions: true });
    out.codigo = r.getResponseCode();
    var blob = r.getBlob();
    out.tipo = blob.getContentType();
    out.bytes = blob.getBytes().length;
    out.ok = out.codigo === 200 && String(out.tipo).indexOf('image/') === 0;
    if (!out.ok && out.bytes < 4000) {
      /* Google contesta con texto cuando la llave está mal o sin saldo */
      out.respuesta = r.getContentText().slice(0, 300);
    }
  } catch (e) {
    out.error = e.message;
  }
  return JSON.stringify(out);
}

/* ------------------------------------------------- listado de aplicaciones */

/**
 * Las aplicaciones que este usuario puede ver, con su PDF.
 * Es lo que abre el visor: la información y el enlace al mapa, sin tener que
 * escoger finca primero. Un usuario de zona ve sólo la suya; el administrador
 * ve todas. Devuelve string JSON.
 */
function getAplicaciones(token, filtros) {
  var sesion = validarSesion_(token);
  filtros = filtros || {};
  var permitidas = zonasDeSesion_(sesion);
  if (permitidas && !permitidas.length) {
    throw new Error('Su usuario no tiene zona asignada. Pidale al administrador ' +
      'que le ponga la zona en la hoja Catalogos.');
  }
  if (permitidas) filtros.zona = permitidas[0];

  var cfg = getConfig_();
  var zafra = String(filtros.zafra || cfg.ZAFRA || '');
  var tol = tolerancia_();

  var nombreLabor = {};
  getCatalogoLabores_().forEach(function (l) { nombreLabor[l.codigo] = l.nombre; });

  /* un mapa por evento; el detalle da el área por lote */
  var porMapa = {};
  getRegistrosMapas_(zafra).forEach(function (f) {
    if (String(f[M.ESTADO - 1] || '').trim().toUpperCase() === 'ANULADO') return;
    porMapa[String(f[M.ID - 1])] = f;
  });

  var filas = [], zonas = {}, fincas = {}, lotesSet = {}, labores = {};
  var areaTotal = 0, porLabor = {}, mapas = {};

  getDetalle_(zafra).forEach(function (d) {
    var idMapa = String(d[D.ID_MAPA - 1]);
    var m = porMapa[idMapa];
    if (!m) return;
    var z  = String(d[D.ZONA - 1]).trim();
    var fi = String(d[D.FINCA - 1]).trim();
    var lo = String(d[D.LOTE - 1]).trim();
    var cl = String(d[D.COD_LABOR - 1]).trim();

    if (permitidas && permitidas.indexOf(z) === -1) return;
    if (filtros.zona && z !== String(filtros.zona).trim()) return;
    if (filtros.finca && fi.toUpperCase() !== String(filtros.finca).trim().toUpperCase()) return;
    if (filtros.lote && lo !== String(filtros.lote).trim()) return;
    if (filtros.labor && cl !== String(filtros.labor).trim()) return;
    if (filtros.catorcena && String(d[D.CATORCENA - 1]).trim() !== String(filtros.catorcena).trim()) return;

    var ap = aNumero_(d[D.AREA_APLIC - 1]);
    areaTotal += ap;
    zonas[z] = true; fincas[fi] = true; lotesSet[lo] = true;
    labores[cl] = nombreLabor[cl] || cl;
    mapas[idMapa] = true;
    porLabor[cl] = (porLabor[cl] || 0) + ap;

    filas.push({
      idMapa: idMapa, zona: z, finca: fi, lote: lo,
      desc: String(d[D.DESC - 1] || '').trim(),
      labor: cl, laborNombre: nombreLabor[cl] || cl,
      fecha: fechaTexto_(d[D.F_APLIC - 1]),
      catorcena: String(d[D.CATORCENA - 1] || '').trim(),
      areaLote: r2_(aNumero_(d[D.AREA_LOTE - 1])),
      aplicada: r2_(ap),
      acumulado: r2_(aNumero_(d[D.ACUM_ACT - 1])),
      pendiente: r2_(aNumero_(d[D.PENDIENTE - 1])),
      avance: r1_(aNumero_(d[D.AVANCE - 1])),
      estado: String(d[D.ESTADO_LOTE - 1] || '').trim(),
      version: Number(m[M.VERSION - 1]) || 1,
      archivo: String(m[M.ARCHIVO - 1] || ''),
      url: String(m[M.URL - 1] || ''),
      archivoShp: String(m[M.ARCH_SHP - 1] || ''),
      urlShp: String(m[M.URL_SHP - 1] || ''),
      elaborado: String(m[M.ELABORADO - 1] || '').trim()
    });
  });

  /* más reciente primero, y dentro de un lote por versión descendente */
  filas.sort(function (a, b) {
    if (a.finca !== b.finca) return a.finca.localeCompare(b.finca);
    if (a.lote !== b.lote) return a.lote.localeCompare(b.lote);
    if (a.labor !== b.labor) return a.labor.localeCompare(b.labor);
    return b.version - a.version;
  });

  var resumenLabor = Object.keys(porLabor).sort().map(function (cl) {
    return { codigo: cl, nombre: nombreLabor[cl] || cl, area: r2_(porLabor[cl]) };
  });

  return JSON.stringify({
    zafra: zafra, tolerancia: tol, rol: sesion.rol,
    zonaUsuario: permitidas ? permitidas[0] : '',
    total: filas.length, mapas: Object.keys(mapas).length,
    areaAplicada: r2_(areaTotal),
    nZonas: Object.keys(zonas).length, nFincas: Object.keys(fincas).length,
    nLotes: Object.keys(lotesSet).length,
    labores: resumenLabor,
    opciones: {
      zonas: Object.keys(zonas).sort(),
      fincas: Object.keys(fincas).sort(),
      lotes: Object.keys(lotesSet).sort(),
      labores: Object.keys(labores).sort().map(function (c) {
        return { codigo: c, nombre: labores[c] };
      })
    },
    filas: filas.slice(0, 500),
    truncado: filas.length > 500
  });
}

/* --------------------------------------------- estado del maestro publicado */

var META_MAESTRO = '_META.json';

/** Sella el maestro recién publicado con su resumen. Lo llama el navegador
 *  del administrador al terminar de subir todas las fincas. */
function adminSellarMaestro(token, resumen) {
  var s = exigirAdmin_(token);
  var meta = {
    fecha: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'),
    usuario: s.nombre || s.usuario,
    fincas: Number(resumen && resumen.fincas) || 0,
    lotes: Number(resumen && resumen.lotes) || 0,
    registros: Number(resumen && resumen.registros) || 0,
    fusionados: Number(resumen && resumen.fusionados) || 0,
    archivo: String((resumen && resumen.archivo) || '')
  };
  var carpeta = carpetaGeometria_();
  var previos = carpeta.getFilesByName(META_MAESTRO);
  while (previos.hasNext()) previos.next().setTrashed(true);
  carpeta.createFile(Utilities.newBlob(JSON.stringify(meta), 'application/json', META_MAESTRO));
  CacheService.getScriptCache().remove('geomlista');
  CacheService.getScriptCache().remove('metamaestro');
  return meta;
}

/** Qué maestro está publicado ahora mismo. */
function getEstadoMaestro(token) {
  validarSesion_(token);
  var cache = CacheService.getScriptCache();
  var guardado = cache.get('metamaestro');
  if (guardado) { try { return JSON.parse(guardado); } catch (e) {} }

  var out = { publicado: false, fincas: 0, lotes: 0, fecha: '', usuario: '', archivo: '', kb: 0 };
  var carpeta;
  try { carpeta = carpetaGeometria_(); } catch (e) { return out; }

  var n = 0, bytes = 0;
  var it = carpeta.getFiles();
  while (it.hasNext()) {
    var f = it.next(), nom = f.getName();
    if (nom === META_MAESTRO) {
      try {
        var m = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
        out.fecha = m.fecha || ''; out.usuario = m.usuario || '';
        out.lotes = m.lotes || 0; out.archivo = m.archivo || '';
        out.registros = m.registros || 0; out.fusionados = m.fusionados || 0;
      } catch (e2) {}
      continue;
    }
    if (nom.slice(-5).toLowerCase() !== '.json') continue;
    n++; bytes += f.getSize();
  }
  out.fincas = n;
  out.kb = Math.round(bytes / 1024);
  out.publicado = n > 0;
  try { cache.put('metamaestro', JSON.stringify(out), 900); } catch (e3) {}
  return out;
}

/** Borra la geometría publicada, para reemplazarla por un maestro nuevo. */
function adminBorrarMaestro(token) {
  exigirAdmin_(token);
  var carpeta = carpetaGeometria_();
  var n = 0;
  var it = carpeta.getFiles();
  while (it.hasNext()) { it.next().setTrashed(true); n++; }
  var c = CacheService.getScriptCache();
  c.remove('geomlista'); c.remove('metamaestro');
  return { ok: true, borrados: n };
}

/** Fincas de una zona que el usuario puede ver, con su área y lotes. */
function getFincasZona(token, zona) {
  exigirZona_(token, zona);
  var zonaTxt = String(zona).trim();
  var mapa = {};
  getCatalogoLotes_(null).forEach(function (l) {
    if (l.zona !== zonaTxt) return;
    var k = l.finca.toUpperCase();
    if (!mapa[k]) mapa[k] = { finca: l.finca, lotes: 0, area: 0 };
    mapa[k].lotes++; mapa[k].area += l.area;
  });
  return Object.keys(mapa).sort().map(function (k) {
    mapa[k].area = r2_(mapa[k].area);
    return mapa[k];
  });
}

/* ==========================================================================
 *  8. GUARDAR EL MAPA
 * ========================================================================== */

/**
 * Siguiente número de versión para un grupo de lotes y una labor.
 * Cuenta los mapas vigentes ya registrados con la misma combinación. Las
 * versiones anuladas no cuentan, pero tampoco se reutiliza su número: se
 * toma el máximo registrado más uno, para que los nombres no choquen.
 */
function siguienteVersion_(zafra, zona, finca, listaLotes, codLabor) {
  var clave = listaLotes.slice().sort().join('-');
  var fincaTxt = String(finca).trim().toUpperCase();
  var max = 0;
  getRegistrosMapas_(zafra).forEach(function (f) {
    if (String(f[M.ZONA - 1]).trim() !== String(zona).trim()) return;
    if (String(f[M.FINCA - 1]).trim().toUpperCase() !== fincaTxt) return;
    if (String(f[M.COD_LABOR - 1]).trim() !== String(codLabor).trim()) return;
    var lotes = String(f[M.LOTES - 1] || '').split(/[,\s]+/).filter(String).sort().join('-');
    if (lotes !== clave) return;
    var v = Number(f[M.VERSION - 1]) || 0;
    if (v > max) max = v;
  });
  return max + 1;
}

/**
 * payload: {token, zona, finca, codLabor, fechaAplicacion, vehiculo, aguilon,
 *           operador, producto, dosisProgramada, unidad, cantidadLiquidada,
 *           elaboradoPor, observaciones,
 *           lotes:[{lote, areaAplicada}], archivo:{nombre, mimeType, base64}}
 */
function guardarMapa(payload) {
  var sesion = validarSesion_(payload && payload.token);
  var cfg = getConfig_();
  var zafra = String(cfg.ZAFRA || '').trim();
  if (!zafra) throw new Error('Falta definir la ZAFRA en la hoja Config.');
  if (!cfg.ID_CARPETA_RAIZ) throw new Error('Falta definir ID_CARPETA_RAIZ en la hoja Config.');

  ['zona', 'finca', 'codLabor', 'elaboradoPor'].forEach(function (k) {
    if (!payload[k] || String(payload[k]).trim() === '') {
      throw new Error('Campo obligatorio sin completar: ' + k);
    }
  });
  if (!payload.lotes || !payload.lotes.length) throw new Error('Seleccione al menos un lote.');
  if (!payload.archivo || !payload.archivo.base64) throw new Error('No se recibió el mapa generado.');
  /* El .zip del job es la fuente con que se generó el mapa. Se guarda junto al
   * PDF para que siempre se pueda rehacer o auditar la aplicación. */
  if (payload.fuente && !payload.fuente.base64) throw new Error('No se recibió el archivo del trabajo.');

  var zona = String(payload.zona).trim();
  /* El token viene dentro del payload, no suelto: en la v25 esta linea quedo
     pidiendo una variable `token` que no existe en esta funcion, y eso
     reventaba el guardado de todo mapa. */
  exigirZona_(payload.token, zona);

  var permitidas = String(cfg.EXTENSIONES_PERMITIDAS || 'pdf')
    .toLowerCase().split(',').map(function (e) { return e.trim().replace('.', ''); });
  var ext = String(payload.archivo.nombre).split('.').pop().toLowerCase();
  if (permitidas.indexOf(ext) === -1) {
    throw new Error('Solo se admite el mapa final en: ' + permitidas.join(', ').toUpperCase() + '.');
  }
  var bytes = Utilities.base64Decode(payload.archivo.base64);
  var maxMB = Number(cfg.TAMANO_MAX_MB) || 20;
  var tamanoMB = bytes.length / 1048576;
  if (tamanoMB > maxMB) {
    throw new Error('El mapa pesa ' + tamanoMB.toFixed(1) + ' MB y el máximo permitido es ' + maxMB + ' MB.');
  }
  var bytesFuente = null, tamanoFuenteMB = 0;
  if (payload.fuente) {
    bytesFuente = Utilities.base64Decode(payload.fuente.base64);
    tamanoFuenteMB = bytesFuente.length / 1048576;
    if (tamanoFuenteMB > maxMB) {
      throw new Error('El archivo del trabajo pesa ' + tamanoFuenteMB.toFixed(1) +
        ' MB y el máximo permitido es ' + maxMB + ' MB.');
    }
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('El sistema está ocupado. Intente de nuevo en unos segundos.');

  try {
    var finca = String(payload.finca).trim();
    var codLabor = String(payload.codLabor).trim();
    var tol = tolerancia_();

    var labores = getCatalogoLabores_();
    var labor = null;
    for (var j = 0; j < labores.length; j++) if (labores[j].codigo === codLabor) labor = labores[j];
    if (!labor) throw new Error('El código de labor no existe en el catálogo.');

    var cat = getCatalogoLotes_(null);
    var idx = {};
    cat.forEach(function (l) { idx[claveLote_(l.zona, l.finca, l.lote, '')] = l; });

    var acum = acumuladosPorLote_(zafra);
    var filasDetalle = [], areaTotal = 0, avisos = [];

    payload.lotes.forEach(function (sel) {
      var lote = String(sel.lote).trim();
      var info = idx[claveLote_(zona, finca, lote, '')];
      if (!info) throw new Error('El lote ' + lote + ' no existe en la finca ' + finca + '.');
      var aplicada = aNumero_(sel.areaAplicada);
      if (aplicada <= 0) throw new Error('Indique el área aplicada del lote ' + lote + '.');

      var k = claveLote_(zona, finca, lote, codLabor);
      var anterior = acum[k] ? acum[k].area : 0;
      var actual = anterior + aplicada;
      var pendiente = info.area - actual;
      var avance = info.area ? (actual / info.area) * 100 : 0;
      var variacion = info.area ? ((actual - info.area) / info.area) * 100 : 0;
      var estLote = estadoLote_(info.area, actual, tol);
      if (estLote === 'EXCEDIDO') {
        avisos.push('Lote ' + lote + ': el acumulado supera el área del lote en ' +
                    r1_(variacion) + '%.');
      }
      areaTotal += aplicada;
      filasDetalle.push({ lote: lote, info: info, aplicada: r2_(aplicada), anterior: r2_(anterior),
                          actual: r2_(actual), pendiente: r2_(pendiente), avance: r1_(avance),
                          variacion: r1_(variacion), estado: estLote });
    });

    if (!payload.confirmado && avisos.length) {
      return { aviso: true, mensajes: avisos };
    }

    /* ---- dosis ---- */
    var dosisProg = aNumero_(payload.dosisProgramada);
    var cantidad = aNumero_(payload.cantidadLiquidada);
    var dosisReal = areaTotal > 0 && cantidad > 0 ? r2_(cantidad / areaTotal) : '';
    var varDosis = dosisProg > 0 && dosisReal !== '' ? r1_(((dosisReal - dosisProg) / dosisProg) * 100) : '';

    /* ---- carpetas y archivo ---- */
    /* Estructura: ZAFRA / ZONA / FINCA / LOTE(S) / LABOR
       Los lotes que se trabajan juntos comparten carpeta, y dentro de ella
       se van creando las labores: 1er control, 2do control, etc. */
    var raiz = DriveApp.getFolderById(extraerId_(cfg.ID_CARPETA_RAIZ));
    var nZafra = 'ZAFRA ' + zafra, nZona = 'ZONA ' + zona;
    var nFinca = limpiarNombre_(finca), nLabor = limpiarNombre_(codLabor + ' - ' + labor.nombre);

    var listaLotes = filasDetalle.map(function (f) { return f.lote; }).sort();
    var nGrupo = (listaLotes.length === 1 ? 'LOTE ' : 'LOTES ') + listaLotes.join('-');

    var fLabor = carpeta_(carpeta_(carpeta_(carpeta_(carpeta_(raiz, nZafra), nZona), nFinca), nGrupo), nLabor);
    var ruta = [nZafra, nZona, nFinca, nGrupo, nLabor].join(' / ');

    var fechaTxt = (payload.fechaAplicacion || Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy'))
      .replace(/\//g, '-');

    /* Un lote puede necesitar varias pasadas: se aplica una parte, se vuelve
     * otro día y se completa. Cada subida al mismo grupo de lotes y la misma
     * labor es una VERSIÓN nueva, no un reemplazo: así queda el arrastre y se
     * puede ver cómo se fue completando el lote. */
    var version = siguienteVersion_(zafra, zona, finca, listaLotes, codLabor);
    var nombreFinal = ['Z' + zona, limpiarNombre_(finca).replace(/\s+/g, '_'),
                       listaLotes.join('-'), codLabor, fechaTxt,
                       'v' + version].join('_') + '.' + ext;

    var idMapa = 'MAP-' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss') + '-Z' + zona;
    var principal = fLabor.createFile(
      Utilities.newBlob(bytes, payload.archivo.mimeType || MimeType.PDF, nombreFinal));
    principal.setDescription('Mapa de aplicación aguilón electroelectrónico | ' + idMapa +
      ' | Lotes: ' + listaLotes.join(', ') + ' | ' + labor.nombre +
      ' | Elaborado por: ' + payload.elaboradoPor);
    /* el .zip del trabajo, con el mismo nombre base que el mapa */
    var fuenteNombre = '', fuenteUrl = '';
    if (bytesFuente) {
      var extF = String(payload.fuente.nombre || 'trabajo.zip').split('.').pop().toLowerCase();
      fuenteNombre = nombreFinal.replace(/\.[^.]+$/, '') + '_JOB.' + extF;
      var viejosF = fLabor.getFilesByName(fuenteNombre);
      while (viejosF.hasNext()) viejosF.next().setTrashed(true);
      var archFuente = fLabor.createFile(
        Utilities.newBlob(bytesFuente, payload.fuente.mimeType || 'application/zip', fuenteNombre));
      archFuente.setDescription('Shapefile del trabajo con que se generó ' + nombreFinal + ' | ' + idMapa);
      fuenteUrl = archFuente.getUrl();
    }

    filasDetalle.forEach(function (f) {
      f.idArchivo = principal.getId();
      f.url = principal.getUrl();
    });

    /* ---- registro del evento ---- */
    var hm = hoja_(HOJA_BDTOS);
    var fila = new Array(MAPAS_ANCHO).fill('');
    fila[M.ID - 1] = idMapa;
    fila[M.FECHA - 1] = new Date();
    fila[M.USUARIO - 1] = sesion.usuario;
    fila[M.ZAFRA - 1] = zafra;
    fila[M.ZONA - 1] = zona;
    fila[M.FINCA - 1] = finca;
    fila[M.COD_LABOR - 1] = codLabor;
    fila[M.LABOR - 1] = labor.nombre;
    fila[M.F_APLIC - 1] = payload.fechaAplicacion || Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy');
    var cal = datosFecha_(fila[M.F_APLIC - 1]);
    fila[M.CATORCENA - 1] = cal.catorcena;
    fila[M.DIA_ZAFRA - 1] = cal.diaZafra;
    fila[M.VEHICULO - 1] = payload.vehiculo || '';
    fila[M.AGUILON - 1] = payload.aguilon || '';
    fila[M.OPERADOR - 1] = payload.operador || '';
    fila[M.PRODUCTO - 1] = '';   // ya no se captura: una aplicación lleva varios productos
    fila[M.DOSIS_PROG - 1] = dosisProg || '';
    fila[M.UNIDAD - 1] = payload.unidad || '';
    fila[M.CANTIDAD - 1] = cantidad || '';
    fila[M.DOSIS_REAL - 1] = dosisReal;
    fila[M.VAR_DOSIS - 1] = varDosis;
    fila[M.LOTES - 1] = listaLotes.join(', ');
    fila[M.N_LOTES - 1] = listaLotes.length;
    fila[M.AREA_APLIC - 1] = r2_(areaTotal);
    fila[M.ELABORADO - 1] = payload.elaboradoPor;
    fila[M.ARCHIVO - 1] = nombreFinal;
    fila[M.ARCH_SHP - 1] = fuenteNombre;
    fila[M.URL_SHP - 1] = fuenteUrl;
    fila[M.TIPO - 1] = ext.toUpperCase();
    fila[M.TAMANO - 1] = r2_(tamanoMB);
    fila[M.ID_ARCH - 1] = principal.getId();
    fila[M.URL - 1] = principal.getUrl();
    fila[M.RUTA - 1] = ruta;
    fila[M.VERSION - 1] = version;
    fila[M.ESTADO - 1] = 'VIGENTE';
    fila[M.OBS - 1] = payload.observaciones || '';
    var filaM = hm.getLastRow() + 1;
    hm.getRange(filaM, 1, 1, MAPAS_ANCHO).setValues([fila]);
    hm.getRange(filaM, M.FECHA).setNumberFormat('dd/MM/yyyy HH:mm');

    /* ---- registro por lote ---- */
    var hd = hoja_(HOJA_DETALLE);
    var filas = filasDetalle.map(function (f, i) {
      var d = new Array(DETALLE_ANCHO).fill('');
      d[D.ID - 1] = idMapa + '-' + ('0' + (i + 1)).slice(-2);
      d[D.ID_MAPA - 1] = idMapa;
      d[D.FECHA - 1] = new Date();
      d[D.ZAFRA - 1] = zafra;
      d[D.ZONA - 1] = zona;
      d[D.FINCA - 1] = finca;
      d[D.LOTE - 1] = f.lote;
      d[D.DESC - 1] = f.info.desc;
      d[D.AREA_LOTE - 1] = f.info.area;
      d[D.VARIEDAD - 1] = f.info.variedad;
      d[D.COD_LABOR - 1] = codLabor;
      d[D.LABOR - 1] = labor.nombre;
      d[D.F_APLIC - 1] = fila[M.F_APLIC - 1];
      d[D.CATORCENA - 1] = cal.catorcena;
      d[D.AREA_APLIC - 1] = f.aplicada;
      d[D.ACUM_ANT - 1] = f.anterior;
      d[D.ACUM_ACT - 1] = f.actual;
      d[D.PENDIENTE - 1] = f.pendiente;
      d[D.AVANCE - 1] = f.avance;
      d[D.VARIACION - 1] = f.variacion;
      d[D.ESTADO_LOTE - 1] = f.estado;
      d[D.ID_ARCH - 1] = f.idArchivo;
      d[D.URL - 1] = f.url;
      d[D.ESTADO - 1] = 'VIGENTE';
      return d;
    });
    var filaD = hd.getLastRow() + 1;
    hd.getRange(filaD, 1, filas.length, DETALLE_ANCHO).setValues(filas);
    hd.getRange(filaD, D.LOTE, filas.length, 1).setNumberFormat('@');
    hd.getRange(filaD, D.FECHA, filas.length, 1).setNumberFormat('dd/MM/yyyy HH:mm');
    tocarVersion_();

    return {
      ok: true, id: idMapa, archivo: nombreFinal, url: principal.getUrl(), ruta: ruta,
      archivoFuente: fuenteNombre, urlFuente: fuenteUrl, version: version,
      lotes: filasDetalle.map(function (f) {
        return { lote: f.lote, aplicada: f.aplicada, acumulado: f.actual,
                 pendiente: f.pendiente, avance: f.avance, estado: f.estado };
      }),
      areaTotal: r2_(areaTotal), dosisReal: dosisReal, varDosis: varDosis,
      avisos: avisos
    };
  } finally {
    lock.releaseLock();
  }
}

/** Anula un mapa cargado por error: marca las filas y manda los PDF a la papelera. */
function anularMapa(token, idMapa, motivo) {
  exigirAdmin_(token);
  var hm = hoja_(HOJA_BDTOS), hd = hoja_(HOJA_DETALLE);
  var encontrado = false;

  var vm = hm.getRange(2, 1, Math.max(hm.getLastRow() - 1, 1), MAPAS_ANCHO).getValues();
  for (var i = 0; i < vm.length; i++) {
    if (String(vm[i][M.ID - 1]) === String(idMapa)) {
      hm.getRange(i + 2, M.ESTADO).setValue('ANULADO');
      hm.getRange(i + 2, M.OBS).setValue(
        String(vm[i][M.OBS - 1] || '') + ' | ANULADO: ' + (motivo || 'sin motivo'));
      encontrado = true;
    }
  }
  if (!encontrado) throw new Error('No se encontró el mapa ' + idMapa + '.');

  var vd = hd.getRange(2, 1, Math.max(hd.getLastRow() - 1, 1), DETALLE_ANCHO).getValues();
  for (var j = 0; j < vd.length; j++) {
    if (String(vd[j][D.ID_MAPA - 1]) === String(idMapa)) {
      hd.getRange(j + 2, D.ESTADO).setValue('ANULADO');
      try { DriveApp.getFileById(String(vd[j][D.ID_ARCH - 1])).setTrashed(true); } catch (e) {}
    }
  }
  tocarVersion_();
  return { ok: true };
}

/* ==========================================================================
 *  9. CARPETAS
 * ========================================================================== */

function limpiarNombre_(texto) {
  return String(texto).replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().toUpperCase();
}

function carpeta_(padre, nombre) {
  var cache = CacheService.getScriptCache();
  var clave = 'fld_' + padre.getId() + '_' + nombre;
  var id = cache.get(clave);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { cache.remove(clave); } }
  var it = padre.getFoldersByName(nombre);
  var f = it.hasNext() ? it.next() : padre.createFolder(nombre);
  cache.put(clave, f.getId(), 21600);
  return f;
}

function crearEstructuraBase() {
  var cfg = getConfig_();
  if (!cfg.ID_CARPETA_RAIZ) {
    SpreadsheetApp.getUi().alert('Primero defina ID_CARPETA_RAIZ en la hoja Config.');
    return;
  }
  var raiz = DriveApp.getFolderById(extraerId_(cfg.ID_CARPETA_RAIZ));
  var fZafra = carpeta_(raiz, 'ZAFRA ' + cfg.ZAFRA);
  String(cfg.ZONAS_HABILITADAS || '').split(',').forEach(function (z) {
    z = z.trim();
    if (z) carpeta_(fZafra, 'ZONA ' + z);
  });
  SpreadsheetApp.getUi().alert('Estructura base creada en: ' + fZafra.getUrl());
}

/* ==========================================================================
 *  10. AVANCE Y KPI
 * ========================================================================== */

function getRegistrosMapas_(zafra) {
  var h = libro_().getSheetByName(HOJA_BDTOS);
  if (!h || h.getLastRow() < 2) return [];
  var v = h.getRange(2, 1, h.getLastRow() - 1, MAPAS_ANCHO).getValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (!v[i][M.ID - 1]) continue;
    if (String(v[i][M.ESTADO - 1]).toUpperCase() !== 'VIGENTE') continue;
    if (zafra && String(v[i][M.ZAFRA - 1]).trim() !== String(zafra).trim()) continue;
    out.push(v[i]);
  }
  return out;
}

/** Opciones para los filtros del tablero. */
function getFiltros(token) {
  var sesion = validarSesion_(token);
  var zonasVista = zonasDeSesion_(sesion);
  var cfg = getConfig_();
  var registros = getRegistrosMapas_(String(cfg.ZAFRA || ''));
  var rangos = {};
  getCatorcenas_().forEach(function (c) { rangos[c.cat] = c; });
  var fincas = {}, operadores = {}, vehiculos = {}, meses = {}, cats = {};
  registros.forEach(function (f) {
    var z = String(f[M.ZONA - 1]).trim();
    if (zonasVista && zonasVista.indexOf(z) === -1) return;
    fincas[z + '|' + String(f[M.FINCA - 1]).trim()] = true;
    if (f[M.OPERADOR - 1]) operadores[String(f[M.OPERADOR - 1]).trim()] = true;
    if (f[M.VEHICULO - 1]) vehiculos[String(f[M.VEHICULO - 1]).trim()] = true;
    if (f[M.CATORCENA - 1] !== '' && f[M.CATORCENA - 1] != null) cats[String(f[M.CATORCENA - 1])] = true;
    var d = f[M.FECHA - 1] ? new Date(f[M.FECHA - 1]) : null;
    if (d && !isNaN(d.getTime())) {
      meses[d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)] = true;
    }
  });
  return {
    fincas: Object.keys(fincas).sort().map(function (k) {
      var p = k.split('|');
      return { zona: p[0], finca: p[1] };
    }),
    operadores: Object.keys(operadores).sort(),
    vehiculos: Object.keys(vehiculos).sort(),
    catorcenas: Object.keys(cats).sort(function (a, b) { return a - b; }).map(function (c) {
      var r = rangos[c];
      return { valor: c, etiqueta: 'Catorcena ' + c + (r ? ' \u00b7 ' + r.inicio + ' al ' + r.fin : '') };
    }),
    meses: Object.keys(meses).sort().map(function (k) {
      var p = k.split('-');
      return { valor: k, etiqueta: MESES[Number(p[1]) - 1] + ' ' + p[0] };
    })
  };
}

/**
 * Filtros y reporte en una sola llamada, con caché de 10 minutos.
 * Evita que el navegador tenga que esperar dos viajes al servidor.
 */
/**
 * Devuelve el tablero como cadena JSON. Un objeto anidado puede fallar al
 * serializarse entre el servidor y el navegador; una cadena nunca falla.
 */
function getTablero(token, filtros, incluirFiltros) {
  return JSON.stringify(tableroObjeto_(token, filtros, incluirFiltros));
}

/** Igual que getTablero, para clientes antiguos que esperan un objeto. */
function getTableroObjeto(token, filtros, incluirFiltros) {
  return tableroObjeto_(token, filtros, incluirFiltros);
}

function tableroObjeto_(token, filtros, incluirFiltros) {
  var t0 = new Date().getTime();
  try {
    var sesion = validarSesion_(token);
    var clave = 'tab_' + versionDatos_() + '_' + sesion.rol + sesion.zona + '_' +
                JSON.stringify(filtros || {}) + '_' + (incluirFiltros ? 'F' : 'R');
    var cache = CacheService.getScriptCache();
    var guardado = cache.get(clave);
    if (guardado) {
      try {
        var prev = JSON.parse(guardado);
        prev.ms = new Date().getTime() - t0;
        prev.deCache = true;
        return prev;
      } catch (e) { cache.remove(clave); }
    }
    var res = { reporte: getReporte(token, filtros) };
    if (incluirFiltros) res.filtros = getFiltros(token);
    try { cache.put(clave, JSON.stringify(res), MINUTOS_CACHE_TABLERO * 60); } catch (e2) {}
    res.ms = new Date().getTime() - t0;
    return res;
  } catch (err) {
    return { error: String(err && err.message ? err.message : err),
             ms: new Date().getTime() - t0 };
  }
}

/**
 * Tablero de avance. filtros: {zona, finca, codLabor, catorcena, mes, operador}
 */
function getReporte(token, filtros) {
  var sesion = validarSesion_(token);
  filtros = filtros || {};
  var cfg = getConfig_();
  var zafra = String(cfg.ZAFRA || '');
  var tol = tolerancia_();
  var zonasVista = zonasDeSesion_(sesion);
  if (zonasVista && !zonasVista.length) {
    throw new Error('Su usuario no tiene zona asignada. Pidale al administrador ' +
      'que le ponga la zona en la hoja Catalogos.');
  }
  if (zonasVista) filtros.zona = zonasVista[0];

  /* mapas del evento, para KPI de equipo y dosis */
  var mapas = getRegistrosMapas_(zafra).filter(function (f) {
    return coincide_(filtros, {
      zona: f[M.ZONA - 1], finca: f[M.FINCA - 1], labor: f[M.COD_LABOR - 1],
      fecha: f[M.FECHA - 1], operador: f[M.OPERADOR - 1], vehiculo: f[M.VEHICULO - 1],
      catorcena: f[M.CATORCENA - 1]
    });
  });
  var idsMapa = {};
  mapas.forEach(function (f) { idsMapa[String(f[M.ID - 1])] = true; });

  var detalle = getDetalle_(zafra).filter(function (f) { return idsMapa[String(f[D.ID_MAPA - 1])]; });

  var areaAplicada = 0, porZona = {}, porLabor = {}, porFinca = {}, porOperador = {};
  var porMes = {}, porCat = {}, porCatorcena = {}, cruce = {};
  var lotes = {};

  detalle.forEach(function (f) {
    var z = String(f[D.ZONA - 1]).trim(), fi = String(f[D.FINCA - 1]).trim();
    var lo = String(f[D.LOTE - 1]).trim(), cl = String(f[D.COD_LABOR - 1]).trim();
    var ap = aNumero_(f[D.AREA_APLIC - 1]);
    areaAplicada += ap;

    var k = claveLote_(z, fi, lo, cl);
    if (!lotes[k]) {
      lotes[k] = { zona: z, finca: fi, lote: lo, codLabor: cl, labor: String(f[D.LABOR - 1]).trim(),
                   areaLote: aNumero_(f[D.AREA_LOTE - 1]), aplicada: 0, aplicaciones: 0, ultima: '' };
    }
    lotes[k].aplicada += ap;
    lotes[k].aplicaciones++;
    lotes[k].ultima = f[D.F_APLIC - 1] ? String(f[D.F_APLIC - 1]) : lotes[k].ultima;

    if (!porZona[z]) porZona[z] = { zona: z, aplicada: 0, mapas: {}, lotes: {} };
    porZona[z].aplicada += ap; porZona[z].lotes[fi + '|' + lo] = true;
    porZona[z].mapas[String(f[D.ID_MAPA - 1])] = true;

    if (!porLabor[cl]) porLabor[cl] = { codigo: cl, labor: String(f[D.LABOR - 1]).trim(), aplicada: 0, lotes: {} };
    porLabor[cl].aplicada += ap; porLabor[cl].lotes[z + fi + lo] = true;

    var kf = z + '|' + fi;
    if (!porFinca[kf]) porFinca[kf] = { zona: z, finca: fi, aplicada: 0, lotes: {} };
    porFinca[kf].aplicada += ap; porFinca[kf].lotes[lo] = true;

    var d = f[D.FECHA - 1] ? new Date(f[D.FECHA - 1]) : null;
    if (d && !isNaN(d.getTime())) {
      var km = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
      if (!porMes[km]) porMes[km] = { clave: km, etiqueta: MESES[d.getMonth()] + ' ' + d.getFullYear(), area: 0, mapas: {} };
      porMes[km].area += ap;
      porMes[km].mapas[String(f[D.ID_MAPA - 1])] = true;
    }
    var cat = f[D.CATORCENA - 1];
    if (cat !== '' && cat != null) {
      var kc = String(cat);
      if (!porCat[kc]) porCat[kc] = { cat: kc, area: 0, mapas: {} };
      porCat[kc].area += ap;
      porCat[kc].mapas[String(f[D.ID_MAPA - 1])] = true;
    }
  });

  var dosisZona = {}, mapasZona = {}, catZona = {};
  mapas.forEach(function (f) {
    var z = String(f[M.ZONA - 1]).trim();
    var areaMapa = aNumero_(f[M.AREA_APLIC - 1]);

    mapasZona[z] = (mapasZona[z] || 0) + 1;
    var c = f[M.CATORCENA - 1];
    if (c !== '' && c != null) {
      if (!catZona[z]) catZona[z] = {};
      catZona[z][String(c)] = true;
    }

    var dr = aNumero_(f[M.DOSIS_REAL - 1]);
    if (dr > 0 && areaMapa > 0) {
      if (!dosisZona[z]) dosisZona[z] = { suma: 0, area: 0 };
      dosisZona[z].suma += dr * areaMapa;   // promedio ponderado por área
      dosisZona[z].area += areaMapa;
    }

    var op = String(f[M.OPERADOR - 1] || '').trim();
    if (op) {
      if (!porOperador[op]) porOperador[op] = { operador: op, mapas: 0, area: 0 };
      porOperador[op].mapas++;
      porOperador[op].area += areaMapa;
    }

    var kc = (c !== '' && c != null) ? String(c) : '';
    if (kc) {
      if (!porCatorcena[kc]) porCatorcena[kc] = { cat: kc, mapas: 0, area: 0, zonas: {} };
      porCatorcena[kc].mapas++;
      porCatorcena[kc].area += areaMapa;
      porCatorcena[kc].zonas[z] = true;
    }

    var cl = String(f[M.COD_LABOR - 1]).trim();
    var kz = cl + '|' + z;
    if (!cruce[kz]) cruce[kz] = 0;
    cruce[kz] += areaMapa;
  });

  /* estados de lote */
  var lista = Object.keys(lotes).map(function (k) { return lotes[k]; });
  var areaLotes = 0, estados = { 'EN PROCESO': 0, 'COMPLETO': 0, 'EXCEDIDO': 0 };
  var areaLotesZona = {}, estadosZona = {};
  lista.forEach(function (l) {
    areaLotes += l.areaLote;
    areaLotesZona[l.zona] = (areaLotesZona[l.zona] || 0) + l.areaLote;
    l.aplicada = r2_(l.aplicada);
    l.pendiente = r2_(l.areaLote - l.aplicada);
    l.avance = l.areaLote ? r1_((l.aplicada / l.areaLote) * 100) : 0;
    l.variacion = l.areaLote ? r1_(((l.aplicada - l.areaLote) / l.areaLote) * 100) : 0;
    l.estado = estadoLote_(l.areaLote, l.aplicada, tol);
    if (estados[l.estado] === undefined) estados[l.estado] = 0;
    estados[l.estado]++;
    if (!estadosZona[l.zona]) estadosZona[l.zona] = { completos: 0, proceso: 0, excedidos: 0 };
    if (l.estado === 'COMPLETO') estadosZona[l.zona].completos++;
    else if (l.estado === 'EXCEDIDO') estadosZona[l.zona].excedidos++;
    else estadosZona[l.zona].proceso++;
  });

  var dosisMapas = mapas.filter(function (f) { return aNumero_(f[M.DOSIS_REAL - 1]) > 0; });
  var dosisProm = '', varDosisProm = '';
  if (dosisMapas.length) {
    var sd = 0, sv = 0, nv = 0;
    dosisMapas.forEach(function (f) {
      sd += aNumero_(f[M.DOSIS_REAL - 1]);
      if (aNumero_(f[M.DOSIS_PROG - 1]) > 0) { sv += aNumero_(f[M.VAR_DOSIS - 1]); nv++; }
    });
    dosisProm = r2_(sd / dosisMapas.length);
    varDosisProm = nv ? r1_(sv / nv) : '';
  }

  var acumulado = 0;
  var serie = Object.keys(porMes).sort().map(function (k) {
    acumulado += porMes[k].area;
    return { etiqueta: porMes[k].etiqueta, area: r2_(porMes[k].area),
             mapas: Object.keys(porMes[k].mapas).length, acumulado: r2_(acumulado) };
  });

  var acumCat = 0;
  var serieCat = Object.keys(porCat).sort(function (a, b) { return a - b; }).map(function (k) {
    acumCat += porCat[k].area;
    return { etiqueta: 'C' + k, area: r2_(porCat[k].area),
             mapas: Object.keys(porCat[k].mapas).length, acumulado: r2_(acumCat) };
  });

  function pctArea(n) { return areaAplicada ? r1_((n / areaAplicada) * 100) : 0; }

  return {
    zafra: zafra,
    tolerancia: tol,
    totalMapas: mapas.length,
    totalAplicaciones: detalle.length,
    totalLotes: lista.length,
    totalFincas: Object.keys(porFinca).length,
    areaAplicada: r2_(areaAplicada),
    areaLotes: r2_(areaLotes),
    cumplimiento: areaLotes ? r1_((areaAplicada / areaLotes) * 100) : 0,
    estados: estados,
    dosisProm: dosisProm,
    varDosisProm: varDosisProm,
    porZona: Object.keys(porZona).sort().map(function (k) {
      var z = porZona[k];
      var d = dosisZona[z.zona];
      var e = estadosZona[z.zona] || { completos: 0, proceso: 0, excedidos: 0 };
      var areaL = areaLotesZona[z.zona] || 0;
      return {
        zona: z.zona,
        aplicada: r2_(z.aplicada),
        pct: pctArea(z.aplicada),
        mapas: Object.keys(z.mapas).length,
        lotes: Object.keys(z.lotes).length,
        areaLotes: r2_(areaL),
        cumplimiento: areaL ? r1_((z.aplicada / areaL) * 100) : 0,
        completos: e.completos, proceso: e.proceso, excedidos: e.excedidos,
        catorcenas: catZona[z.zona] ? Object.keys(catZona[z.zona]).length : 0,
        dosis: d && d.area ? r2_(d.suma / d.area) : ''
      };
    }),
    porCatorcena: Object.keys(porCatorcena).sort(function (a, b) { return a - b; })
      .map(function (k) {
        var c = porCatorcena[k];
        return { cat: c.cat, mapas: c.mapas, area: r2_(c.area),
                 zonas: Object.keys(c.zonas).sort().join(', '), pct: pctArea(c.area) };
      }),
    porLabor: Object.keys(porLabor).map(function (k) { return porLabor[k]; })
      .sort(function (a, b) { return b.aplicada - a.aplicada; })
      .map(function (l) {
        return { codigo: l.codigo, etiqueta: l.codigo + ' - ' + l.labor, aplicada: r2_(l.aplicada),
                 lotes: Object.keys(l.lotes).length, pct: pctArea(l.aplicada) };
      }),
    cruce: (function () {
      var zonas = Object.keys(porZona).sort();
      var labores = {};
      Object.keys(cruce).forEach(function (k) {
        var p = k.split('|');
        if (!labores[p[0]]) labores[p[0]] = {};
        labores[p[0]][p[1]] = r2_(cruce[k]);
      });
      return {
        zonas: zonas,
        filas: Object.keys(labores).sort().map(function (cl) {
          var fila = { codigo: cl, etiqueta: cl, areas: [], total: 0 };
          var nom = porLabor[cl] ? porLabor[cl].labor : '';
          fila.etiqueta = cl + (nom ? ' - ' + nom : '');
          zonas.forEach(function (z) {
            var v = labores[cl][z] || 0;
            fila.areas.push(v);
            fila.total += v;
          });
          fila.total = r2_(fila.total);
          return fila;
        })
      };
    })(),
    porFinca: Object.keys(porFinca).map(function (k) { return porFinca[k]; })
      .sort(function (a, b) { return b.aplicada - a.aplicada; })
      .slice(0, 25)
      .map(function (f) {
        return { zona: f.zona, finca: f.finca, aplicada: r2_(f.aplicada),
                 lotes: Object.keys(f.lotes).length, pct: pctArea(f.aplicada) };
      }),
    porOperador: Object.keys(porOperador).map(function (k) { return porOperador[k]; })
      .sort(function (a, b) { return b.area - a.area; })
      .map(function (o) { return { operador: o.operador, mapas: o.mapas, area: r2_(o.area) }; }),
    serie: serie,
    serieCat: serieCat,
    lotes: lista.sort(function (a, b) {
      if (a.zona !== b.zona) return a.zona - b.zona;
      if (a.finca !== b.finca) return a.finca.localeCompare(b.finca);
      return a.lote.localeCompare(b.lote);
    }).slice(0, 200),
    desviados: lista.slice().sort(function (a, b) { return Math.abs(b.variacion) - Math.abs(a.variacion); })
      .filter(function (l) { return Math.abs(l.variacion) > tol; }).slice(0, 12),
    ultimos: mapas.slice(-15).reverse().map(function (f) {
      return {
        id: String(f[M.ID - 1]),
        fecha: f[M.FECHA - 1] ? Utilities.formatDate(new Date(f[M.FECHA - 1]), TZ, 'dd/MM/yyyy HH:mm') : '',
        aplicacion: f[M.F_APLIC - 1], catorcena: f[M.CATORCENA - 1],
        zona: f[M.ZONA - 1], finca: f[M.FINCA - 1],
        lotes: f[M.LOTES - 1], labor: f[M.COD_LABOR - 1] + ' - ' + f[M.LABOR - 1],
        area: f[M.AREA_APLIC - 1], operador: f[M.OPERADOR - 1],
        elaborado: f[M.ELABORADO - 1], url: f[M.URL - 1]
      };
    })
  };
}

function coincide_(filtros, r) {
  if (filtros.zona && String(r.zona).trim() !== String(filtros.zona)) return false;
  if (filtros.finca && String(r.finca).trim().toUpperCase() !== String(filtros.finca).toUpperCase()) return false;
  if (filtros.codLabor && String(r.labor).trim() !== String(filtros.codLabor)) return false;
  if (filtros.operador && String(r.operador).trim() !== String(filtros.operador)) return false;
  if (filtros.vehiculo && String(r.vehiculo).trim() !== String(filtros.vehiculo)) return false;
  if (filtros.catorcena && String(r.catorcena).trim() !== String(filtros.catorcena)) return false;
  if (filtros.mes) {
    var d = r.fecha ? new Date(r.fecha) : null;
    if (!d || isNaN(d.getTime())) return false;
    var km = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
    if (km !== filtros.mes) return false;
  }
  return true;
}

/* ==========================================================================
 *  11. CORREO Y SOPORTE
 * ========================================================================== */

function enviarReporteCorreo() {
  var cfg = getConfig_();
  var destino = String(cfg.CORREO_NOTIFICACION || '').trim();
  if (!destino) throw new Error('Defina CORREO_NOTIFICACION en la hoja Config.');

  var zafra = String(cfg.ZAFRA || '');
  var tol = tolerancia_();
  var detalle = getDetalle_(zafra);
  var porZona = {}, lotes = {}, area = 0, mapas = {};
  detalle.forEach(function (f) {
    var z = String(f[D.ZONA - 1]).trim();
    var ap = aNumero_(f[D.AREA_APLIC - 1]);
    area += ap;
    mapas[String(f[D.ID_MAPA - 1])] = true;
    if (!porZona[z]) porZona[z] = { zona: z, area: 0, lotes: {}, mapas: {} };
    porZona[z].area += ap;
    porZona[z].lotes[f[D.FINCA - 1] + '|' + f[D.LOTE - 1]] = true;
    porZona[z].mapas[String(f[D.ID_MAPA - 1])] = true;
    var k = claveLote_(z, f[D.FINCA - 1], f[D.LOTE - 1], f[D.COD_LABOR - 1]);
    if (!lotes[k]) lotes[k] = { areaLote: aNumero_(f[D.AREA_LOTE - 1]), aplicada: 0 };
    lotes[k].aplicada += ap;
  });
  var completos = 0, proceso = 0, excedidos = 0;
  Object.keys(lotes).forEach(function (k) {
    var e = estadoLote_(lotes[k].areaLote, lotes[k].aplicada, tol);
    if (e === 'COMPLETO') completos++;
    else if (e === 'EXCEDIDO') excedidos++;
    else proceso++;
  });

  var html = '<div style="font-family:Calibri,Arial,sans-serif;font-size:13.5px;color:#3A4A42">' +
    '<div style="height:5px;background:linear-gradient(90deg,#86B641,#029B4D)"></div>' +
    '<h2 style="color:#01703A;margin-bottom:4px">Mapas de aplicación · Aguilón electroelectrónico</h2>' +
    '<p style="margin-top:0;color:#7A8A80">' +
    String(cfg.DEPARTAMENTO || 'Departamento de Malezas y Madurantes') + ' · zafra ' + zafra +
    ' · corte al ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + '</p>' +
    '<p><b>' + Object.keys(mapas).length + '</b> mapas · <b>' + r2_(area) + '</b> ha aplicadas · ' +
    completos + ' lotes completos, ' + proceso + ' en proceso, ' + excedidos + ' excedidos.</p>' +
    '<table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse;font-size:13px">' +
    '<tr style="background:#029B4D;color:#fff"><th align="left">Zona</th><th align="right">Mapas</th>' +
    '<th align="right">Lotes</th><th align="right">Ha aplicadas</th></tr>';
  Object.keys(porZona).sort().forEach(function (k, i) {
    var z = porZona[k];
    html += '<tr style="background:' + (i % 2 ? '#F2F7F0' : '#fff') + '">' +
      '<td>Zona ' + z.zona + '</td><td align="right">' + Object.keys(z.mapas).length + '</td>' +
      '<td align="right">' + Object.keys(z.lotes).length + '</td>' +
      '<td align="right">' + r2_(z.area) + '</td></tr>';
  });
  html += '</table><p style="margin-top:18px"><a href="' + libro_().getUrl() +
    '" style="background:#029B4D;color:#fff;padding:9px 16px;text-decoration:none;border-radius:4px">' +
    'Ver detalle</a></p></div>';

  MailApp.sendEmail({ to: destino, subject: 'Mapas de aplicación · avance zafra ' + zafra, htmlBody: html });
}

function crearTriggerSemanal() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'enviarReporteCorreo') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('enviarReporteCorreo')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();
  SpreadsheetApp.getUi().alert('Reporte semanal programado para los lunes a las 7:00.');
}

function enviarSoporte(datos) {
  /* v28: con el /exec abierto al publico, esto mandaba correo a quien
     quisiera. Ahora hay que haber entrado al modulo para usarlo. */
  datos = datos || {};
  validarSesion_(datos.token);
  var cfg = getConfig_();
  var destino = String(cfg.CORREO_SOPORTE || cfg.CORREO_NOTIFICACION || '').trim();
  if (!destino) throw new Error('No hay correo de soporte configurado. Avise al administrador.');

  var nombre = String(datos.nombre || '').trim();
  var correo = String(datos.correo || '').trim();
  var asunto = String(datos.asunto || 'Consulta').trim();
  var mensaje = String(datos.mensaje || '').trim();
  if (!nombre || !mensaje) throw new Error('Escriba su nombre y su consulta.');

  var sesion = null;
  try { sesion = validarSesion_(datos.token); } catch (e) { sesion = null; }

  var html = '<div style="font-family:Calibri,Arial,sans-serif;font-size:13.5px;color:#3A4A42">' +
    '<div style="height:5px;background:linear-gradient(90deg,#86B641,#029B4D)"></div>' +
    '<h2 style="color:#01703A;margin-bottom:4px">Consulta desde la aplicación de mapas</h2>' +
    '<p style="margin-top:0;color:#7A8A80">' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + '</p>' +
    '<p><b>De:</b> ' + nombre + (correo ? ' &lt;' + correo + '&gt;' : '') +
    (sesion ? '<br><b>Usuario:</b> ' + sesion.usuario + (sesion.zona ? ' (zona ' + sesion.zona + ')' : '') : '') +
    '</p><p><b>Asunto:</b> ' + asunto + '</p>' +
    '<p style="background:#F2F7F0;border-left:3px solid #86B641;padding:12px;white-space:pre-wrap">' +
    mensaje.replace(/</g, '&lt;') + '</p></div>';

  var opciones = { to: destino, subject: '[Mapas Aguilón] ' + asunto, htmlBody: html };
  if (correo && correo.indexOf('@') > 0) opciones.replyTo = correo;
  MailApp.sendEmail(opciones);
  return { ok: true };
}

/* ==========================================================================
 *  12. INSTALACION / ACTUALIZACION DE LA ESTRUCTURA
 * --------------------------------------------------------------------------
 *  Ejecute "instalarActualizacion" desde el menu del libro. Revisa lo que
 *  existe y crea unicamente lo que falta: hojas, encabezados, bloque de
 *  usuarios, catalogo de equipos y parametros de Config. No borra datos ni
 *  sobrescribe valores ya capturados, y se puede ejecutar cuantas veces sea
 *  necesario.
 * ========================================================================== */

var CAB_MAPAS = ['ID_MAPA', 'FECHA_HORA', 'USUARIO', 'ZAFRA', 'ZONA', 'FINCA', 'COD_LABOR', 'LABOR',
  'FECHA_APLICACION', 'CATORCENA', 'DIA_ZAFRA', 'VEHICULO', 'AGUILON', 'OPERADOR', 'PRODUCTO',
  'DOSIS_PROGRAMADA', 'UNIDAD', 'CANTIDAD_LIQUIDADA', 'DOSIS_REAL', 'VAR_DOSIS_PCT', 'LOTES',
  'N_LOTES', 'AREA_APLICADA', 'ELABORADO_POR', 'NOMBRE_ARCHIVO', 'TIPO_ARCHIVO', 'TAMANO_MB',
  'ID_ARCHIVO', 'URL_ARCHIVO', 'RUTA_CARPETA', 'VERSION', 'ESTADO', 'OBSERVACIONES',
  'ARCHIVO_SHP', 'URL_SHP'];

var CAB_DETALLE = ['ID_DETALLE', 'ID_MAPA', 'FECHA_HORA', 'ZAFRA', 'ZONA', 'FINCA', 'LOTE', 'DESC_LOTE',
  'AREA_LOTE', 'VARIEDAD', 'COD_LABOR', 'LABOR', 'FECHA_APLICACION', 'CATORCENA', 'AREA_APLICADA',
  'ACUM_ANTERIOR', 'ACUM_ACTUAL', 'PENDIENTE', 'AVANCE_PCT', 'VARIACION_PCT', 'ESTADO_LOTE',
  'ID_ARCHIVO', 'URL_ARCHIVO', 'ESTADO'];

var CAB_USUARIOS = ['USUARIO', 'CLAVE', 'NOMBRE', 'ZONA', 'ROL'];
var CAB_CALENDARIO = ['FECHA', 'CAT', 'DIA', 'MES', 'SEMANA', 'DIA_ZAFRA'];
var CAB_CATORCENAS = ['CAT', 'FECHA_INICIAL', 'FECHA_FINAL'];
var CAB_EQUIPOS = ['ZONA', 'CODIGO_TRACTOR', 'CODIGO_AGUILON'];
var CAB_OPERADORES = ['ZONA', 'CODIGO', 'NOMBRE_OPERADOR'];

var DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
var NOMBRE_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

var CONFIG_BASE = [
  ['ZAFRA', '2026-2027', 'Zafra activa. Es el primer nivel de la estructura de carpetas.'],
  ['DEPARTAMENTO', 'Departamento de Malezas y Madurantes', 'Aparece en el encabezado de la aplicación y en el correo.'],
  ['NOMBRE_MODULO', 'Mapas de Aplicación · Aguilón Electroelectrónico', 'Título de la aplicación web.'],
  ['ID_CARPETA_RAIZ', '', 'Carpeta de Drive donde se crean las carpetas de mapas. Acepta el ID o la URL completa.'],
  ['ID_CARPETA_RECURSOS', '', 'Carpeta de insumos. Su contenido se lista solo en la aplicación. Acepta ID o URL.'],
  ['ZONAS_HABILITADAS', '4,5,8', 'Zonas que aparecen en el formulario, separadas por coma.'],
  ['EXTENSIONES_PERMITIDAS', 'pdf', 'Formato del mapa que genera el módulo. Las zonas suben el .zip del trabajo, no el PDF.'],
  ['TAMANO_MAX_MB', 20, 'Tamaño máximo por archivo.'],
  ['PROVEEDOR_MAPA', 'esri', 'Imagen de fondo de los mapas: "esri" (gratis, sin llave) o "google" (exige LLAVE_GOOGLE y Google la cobra por petición).'],
  ['LLAVE_GOOGLE', '', 'Llave de Google Maps Platform con Static Maps API habilitada. Sólo hace falta si PROVEEDOR_MAPA es "google".'],
  ['TOLERANCIA_PCT', 5, 'Margen para dar un lote por completo. 5 = se acepta entre 95% y 105% del área del lote.'],
  ['PERMITIR_REEMPLAZO', 'SI', 'SI = el administrador puede anular un mapa cargado por error.'],
  ['CORREO_NOTIFICACION', '', 'Correo(s) que reciben el reporte de avance, separados por coma.'],
  ['CORREO_SOPORTE', '', 'Correo que recibe las consultas del botón Soporte. Vacío = usa CORREO_NOTIFICACION.']
];

/* Las claves de verdad NO van aqui: este archivo esta en un repositorio.
   Estas solo sirven para crear las filas la primera vez; la clave que vale
   es la que este en la hoja Catalogos. Cambielas ahi apenas instale. */
var USUARIOS_BASE = [
  ['ajreyes', 'CAMBIAR', 'Armando Reyes', '', 'ADMIN'],
  ['zona4', 'CAMBIAR', 'Zona 4', '4', 'ZONA'],
  ['zona5', 'CAMBIAR', 'Zona 5', '5', 'ZONA'],
  ['zona8', 'CAMBIAR', 'Zona 8', '8', 'ZONA']
];

function instalarActualizacion() {
  var libro = libro_();
  var hechos = [], avisos = [];

  /* ---- 1. BDTOS_MAPAS ---- */
  var hm = libro.getSheetByName(HOJA_BDTOS);
  if (!hm) {
    hm = libro.insertSheet(HOJA_BDTOS);
    escribirEncabezado_(hm, CAB_MAPAS);
    hechos.push('Hoja BDTOS_MAPAS creada.');
  } else {
    var actual = hm.getLastColumn()
      ? hm.getRange(1, 1, 1, hm.getLastColumn()).getDisplayValues()[0] : [];
    var iguales = actual.length === CAB_MAPAS.length &&
      CAB_MAPAS.every(function (c, i) { return String(actual[i]).trim().toUpperCase() === c; });
    /* Si lo unico que cambio es que se agregaron columnas AL FINAL, se anexan
     * y ya: reconstruir la hoja le costaria al usuario la continuidad de sus
     * datos por un cambio que no rompe nada. */
    var esPrefijo = actual.length < CAB_MAPAS.length && actual.length > 0 &&
      actual.every(function (c, i) { return String(c).trim().toUpperCase() === CAB_MAPAS[i]; });
    if (esPrefijo) {
      var faltan = CAB_MAPAS.slice(actual.length);
      hm.getRange(1, actual.length + 1, 1, faltan.length).setValues([faltan]);
      escribirEncabezado_(hm, CAB_MAPAS);
      hechos.push('BDTOS_MAPAS: se agregaron las columnas ' + faltan.join(', ') + ' sin tocar los datos.');
      iguales = true;
    }
    if (!iguales) {
      if (hm.getLastRow() > 1) {
        var respaldo = HOJA_BDTOS + '_ANTERIOR_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd');
        hm.setName(respaldo);
        hm = libro.insertSheet(HOJA_BDTOS);
        escribirEncabezado_(hm, CAB_MAPAS);
        avisos.push('BDTOS_MAPAS tenía el formato anterior con datos: se conservó como "' + respaldo +
                    '" y se creó la hoja nueva vacía.');
      } else {
        hm.clear();
        escribirEncabezado_(hm, CAB_MAPAS);
        hechos.push('Encabezados de BDTOS_MAPAS actualizados.');
      }
    }
  }

  /* ---- 2. BDTOS_DETALLE ---- */
  var hd = libro.getSheetByName(HOJA_DETALLE);
  if (!hd) {
    hd = libro.insertSheet(HOJA_DETALLE);
    escribirEncabezado_(hd, CAB_DETALLE);
    hd.getRange(2, D.LOTE, 500, 1).setNumberFormat('@');
    hechos.push('Hoja BDTOS_DETALLE creada.');
  }

  /* ---- 3. Bloques de calendario y equipos en Catalogos ---- */
  var hcat = hoja_(HOJA_CATALOGOS);
  var zonasCfg = String(getConfig_().ZONAS_HABILITADAS || '4,5,8')
    .split(',').map(function (z) { return z.trim(); }).filter(String);

  if (!String(hcat.getRange(1, CAT_CAL_COL).getValue()).trim()) {
    var cal = generarCalendario_(String(getConfig_().ZAFRA || '2026-2027'));
    bloqueCatalogo_(hcat, CAT_CAL_COL, CAB_CALENDARIO, cal.dias);
    hcat.getRange(2, CAT_CAL_COL, cal.dias.length, 1).setNumberFormat('dd/MM/yyyy');
    bloqueCatalogo_(hcat, CAT_CAT_COL, CAB_CATORCENAS, cal.catorcenas);
    hcat.getRange(2, CAT_CAT_COL + 1, cal.catorcenas.length, 2).setNumberFormat('dd/MM/yyyy');
    hechos.push('Calendario de la zafra generado: ' + cal.dias.length + ' días y ' +
                cal.catorcenas.length + ' catorcenas (columnas X:AG).');
  }

  if (!String(hcat.getRange(1, CAT_EQU_COL).getValue()).trim()) {
    bloqueCatalogo_(hcat, CAT_EQU_COL, CAB_EQUIPOS,
      zonasCfg.map(function (z) { return [z, '', '']; }));
    bloqueCatalogo_(hcat, CAT_OPE_COL, CAB_OPERADORES,
      zonasCfg.map(function (z) { return [z, '', '']; }));
    hechos.push('Bloques de tractor/aguilón y operadores agregados en Catalogos (AI:AO). ' +
                'Escriba los códigos y los nombres.');
  }

  /* ---- 4. Bloque de usuarios en Catalogos (R:V) ---- */
  var hc = hoja_(HOJA_CATALOGOS);
  if (!String(hc.getRange(1, CAT_USR_COL).getValue()).trim()) {
    hc.getRange(1, CAT_USR_COL, 1, CAB_USUARIOS.length).setValues([CAB_USUARIOS])
      .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#1F4E33');
    hc.getRange(2, CAT_USR_COL, USUARIOS_BASE.length, 5).setValues(USUARIOS_BASE);
    hc.getRange(USUARIOS_BASE.length + 3, CAT_USR_COL).setValue(
      'Cambie las claves antes de repartir los accesos. ROL: ADMIN administra insumos y ve todas ' +
      'las zonas; ZONA solo carga y consulta la suya.').setFontStyle('italic').setFontSize(9);
    hechos.push('Bloque de usuarios agregado en Catalogos (columnas R:V) con 4 accesos.');
  }

  /* ---- 5. Config ---- */
  var hcf = libro.getSheetByName(HOJA_CONFIG);
  if (!hcf) {
    hcf = libro.insertSheet(HOJA_CONFIG);
    escribirEncabezado_(hcf, ['PARAMETRO', 'VALOR', 'DESCRIPCION']);
    hcf.setColumnWidth(1, 200); hcf.setColumnWidth(2, 320); hcf.setColumnWidth(3, 520);
    hechos.push('Hoja Config creada.');
  }
  var existentes = {};
  if (hcf.getLastRow() > 1) {
    hcf.getRange(2, 1, hcf.getLastRow() - 1, 1).getDisplayValues().forEach(function (f) {
      if (String(f[0]).trim()) existentes[String(f[0]).trim().toUpperCase()] = true;
    });
  }
  var nuevos = CONFIG_BASE.filter(function (c) { return !existentes[c[0]]; });
  if (nuevos.length) {
    hcf.getRange(hcf.getLastRow() + 1, 1, nuevos.length, 3).setValues(nuevos);
    hechos.push('Parámetros agregados en Config: ' +
                nuevos.map(function (n) { return n[0]; }).join(', ') + '.');
  }

  /* ---- 6. Hojas que ya no se usan ---- */
  ['Plan', 'Resumen'].forEach(function (n) {
    var h = libro.getSheetByName(n);
    if (h) avisos.push('La hoja "' + n + '" ya no se usa; puede eliminarla cuando quiera.');
  });

  var msg = hechos.length ? '\u2713 ' + hechos.join('\n\u2713 ') : 'No hizo falta cambiar nada: el libro ya estaba al día.';
  if (avisos.length) msg += '\n\n\u26A0 ' + avisos.join('\n\u26A0 ');
  msg += '\n\nRevise la hoja Config: ID_CARPETA_RAIZ, ID_CARPETA_RECURSOS y los correos deben estar completos.';

  try { SpreadsheetApp.getUi().alert('Instalación del módulo', msg, SpreadsheetApp.getUi().ButtonSet.OK); }
  catch (e) { Logger.log(msg); }
  return msg;
}

function escribirEncabezado_(hoja, cabeceras) {
  hoja.getRange(1, 1, 1, cabeceras.length).setValues([cabeceras])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#1F4E33');
  hoja.setFrozenRows(1);
}


/** Escribe un bloque de catálogo (encabezado + filas) a partir de una columna. */
function bloqueCatalogo_(hoja, col, cabeceras, filas) {
  hoja.getRange(1, col, 1, cabeceras.length).setValues([cabeceras])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#1F4E33');
  if (filas && filas.length) {
    hoja.getRange(2, col, filas.length, cabeceras.length).setValues(filas);
  }
}

/**
 * Genera el calendario de la zafra: catorcenas de 14 días que arrancan en
 * lunes. Para 2026-2027 el día 1 es el 19/10/2026.
 */
function generarCalendario_(zafra) {
  var inicio = new Date(2026, 9, 19);
  var m = String(zafra).match(/(\d{4})/);
  if (m && Number(m[1]) !== 2026) {
    // otra zafra: arranca el tercer lunes de octubre del año indicado
    var d = new Date(Number(m[1]), 9, 1);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + 14);
    inicio = d;
  }
  var TOTAL = 378; // 27 catorcenas de 14 días
  var dias = [], catorcenas = [];
  for (var i = 0; i < TOTAL; i++) {
    var f = new Date(inicio.getTime());
    f.setDate(inicio.getDate() + i);
    var cat = Math.floor(i / 14) + 1;
    var semana = (i % 14) < 7 ? 1 : 2;   // primera o segunda semana de la catorcena
    dias.push([f, cat, DIAS_SEMANA[f.getDay()], NOMBRE_MESES[f.getMonth()], semana, i + 1]);
    if (i % 14 === 0) {
      var fin = new Date(f.getTime());
      fin.setDate(f.getDate() + 13);
      catorcenas.push([cat, f, fin]);
    }
  }
  return { dias: dias, catorcenas: catorcenas };
}

/* ==========================================================================
 *  13. DIAGNOSTICO
 * --------------------------------------------------------------------------
 *  Ejecute "diagnostico" desde el editor de Apps Script (o desde el menu del
 *  libro). Mide cuanto tarda cada pieza y muestra el resultado, para saber
 *  exactamente donde se atora la aplicacion.
 * ========================================================================== */

function diagnostico() {
  var lineas = [];
  var total0 = new Date().getTime();

  function medir(nombre, fn) {
    var t = new Date().getTime();
    var detalle = '';
    try {
      detalle = fn() || '';
    } catch (e) {
      detalle = 'ERROR: ' + (e && e.message ? e.message : e);
    }
    var ms = new Date().getTime() - t;
    lineas.push(pad_(nombre, 34) + pad_(ms + ' ms', 10) + detalle);
    return ms;
  }

  var libro = libro_();
  lineas.push('LIBRO: ' + libro.getName());
  lineas.push('HOJAS: ' + libro.getSheets().map(function (h) { return h.getName(); }).join(', '));
  lineas.push('');
  lineas.push(pad_('PASO', 34) + pad_('TIEMPO', 10) + 'DETALLE');
  lineas.push(new Array(92).join('-'));

  medir('Config', function () {
    var c = getConfig_();
    return Object.keys(c).length + ' parámetros · zafra ' + (c.ZAFRA || '(sin definir)');
  });

  medir('Catálogo de lotes', function () { return getCatalogoLotes_(null).length + ' lotes'; });
  medir('Catálogo de labores', function () { return getCatalogoLabores_().length + ' labores'; });
  medir('Usuarios', function () { return getUsuarios_().length + ' usuarios'; });
  medir('Equipos y operadores', function () {
    var e = getEquipos_('');
    return e.VEHICULO.length + ' tractores, ' + e.AGUILON.length + ' aguilones, ' +
           e.OPERADOR.length + ' operadores';
  });
  medir('Calendario', function () {
    var c = getCalendario_();
    return Object.keys(c).length + ' días · catorcenas: ' + getCatorcenas_().length;
  });

  medir('Hoja BDTOS_MAPAS', function () {
    var h = libro.getSheetByName(HOJA_BDTOS);
    if (!h) return 'NO EXISTE — ejecute instalarActualizacion';
    return h.getLastRow() - 1 + ' filas · ' + h.getLastColumn() + ' columnas (esperadas ' + MAPAS_ANCHO + ')';
  });
  medir('Hoja BDTOS_DETALLE', function () {
    var h = libro.getSheetByName(HOJA_DETALLE);
    if (!h) return 'NO EXISTE — ejecute instalarActualizacion';
    return h.getLastRow() - 1 + ' filas · ' + h.getLastColumn() + ' columnas (esperadas ' + DETALLE_ANCHO + ')';
  });

  medir('Lectura de mapas vigentes', function () {
    return getRegistrosMapas_(String(getConfig_().ZAFRA || '')).length + ' registros';
  });
  medir('Lectura de detalle vigente', function () {
    return getDetalle_(String(getConfig_().ZAFRA || '')).length + ' filas';
  });

  var tokenPrueba = null;
  medir('Sesión de prueba', function () {
    var u = getUsuarios_();
    if (!u.length) return 'sin usuarios en el catálogo';
    var r = login(u[0].usuario, u[0].clave);
    tokenPrueba = r.token;
    return r.ok ? 'ok como ' + r.usuario : r.mensaje;
  });

  medir('getReporte (sin filtros)', function () {
    if (!tokenPrueba) return 'omitido';
    var r = getReporte(tokenPrueba, {});
    return r.totalMapas + ' mapas · ' + r.areaAplicada + ' ha · ' + r.lotes.length + ' lotes';
  });
  medir('getFiltros', function () {
    if (!tokenPrueba) return 'omitido';
    var f = getFiltros(tokenPrueba);
    return f.fincas.length + ' fincas, ' + f.catorcenas.length + ' catorcenas';
  });
  medir('getTablero (primera vez)', function () {
    if (!tokenPrueba) return 'omitido';
    var t = getTablero(tokenPrueba, {}, true);
    return t.error ? 'ERROR: ' + t.error : 'ok, ' + t.ms + ' ms internos';
  });
  medir('getTablero (desde caché)', function () {
    if (!tokenPrueba) return 'omitido';
    var t = getTablero(tokenPrueba, {}, true);
    return t.deCache ? 'sirvió de caché' : 'no usó caché';
  });

  medir('Carpeta de insumos (Drive)', function () {
    var cfg = getConfig_();
    if (!cfg.ID_CARPETA_RECURSOS) return 'sin configurar';
    var r = getRecursosDrive_(extraerId_(cfg.ID_CARPETA_RECURSOS), true);
    if (!r) return 'sin configurar';
    if (r.error) return r.error;
    return r.carpetas.length + ' carpetas, ' + r.archivos.length + ' archivos sueltos';
  });
  medir('Carpeta raíz de mapas (Drive)', function () {
    var cfg = getConfig_();
    if (!cfg.ID_CARPETA_RAIZ) return 'sin configurar';
    return DriveApp.getFolderById(extraerId_(cfg.ID_CARPETA_RAIZ)).getName();
  });

  if (tokenPrueba) cerrarSesion(tokenPrueba);

  lineas.push(new Array(92).join('-'));
  lineas.push('TOTAL: ' + (new Date().getTime() - total0) + ' ms');

  var texto = lineas.join('\n');
  Logger.log(texto);
  try {
    SpreadsheetApp.getUi().alert('Diagnóstico del módulo', texto, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* ejecutado desde el editor: queda en el registro */ }
  return texto;
}

function pad_(txt, largo) {
  txt = String(txt);
  while (txt.length < largo) txt += ' ';
  return txt;
}
