/* ===================================================================
 * TRABAJADOR DE SERVICIO
 *
 * Es lo que convierte la página en una aplicación de teléfono: guarda la
 * pantalla, Leaflet y las imágenes de satélite ya vistas, para que en la
 * finca abra aunque no haya señal.
 *
 * Tres reglas, en orden de importancia:
 *
 *   1. NUNCA toca las llamadas al servidor. Los datos del módulo viajan
 *      como POST a script.google.com y pasan de largo: aquí no se guarda
 *      ni un dato de aplicación, ni una clave, ni una sesión.
 *   2. La pantalla se pide primero al servidor y solo se usa la copia
 *      guardada si no hay señal. Así una versión nueva entra sola y
 *      nadie se queda trabajando con una pantalla vieja.
 *   3. Las imágenes del mapa sí se guardan de una vez (son siempre
 *      iguales), con un tope para no llenar el teléfono.
 *
 * Al publicar una versión nueva, suba el número de VERSION. Con eso se
 * borra lo guardado de la versión anterior y, además, el teléfono se da
 * cuenta de que este archivo cambió: ahí es cuando la pantalla saca el
 * botón «Actualizar».
 *
 * Este trabajador NO se adelanta a entrar. Se queda esperando hasta que
 * la persona toca «Actualizar», porque entrar solo a media carga de un
 * mapa en el campo es peor que esperar.
 * =================================================================== */

var VERSION = 'mapas-v8';
var CACHE_APP    = VERSION + '-app';      // la pantalla y sus archivos
var CACHE_MAPA   = VERSION + '-mapa';     // Leaflet
var CACHE_IMAGEN = VERSION + '-imagen';   // las imágenes de satélite
var TOPE_IMAGENES = 1200;                 // ~120 MB en el peor caso

/** Lo mínimo para que la aplicación abra sin señal la primera vez. */
var BASICOS = [
  './',
  './index.html',
  './manifest.json',
  './icono-192.png',
  './icono-512.png'
];

function esImagenDeMapa(url) {
  return url.hostname.indexOf('arcgisonline.com') >= 0 ||
         url.hostname.indexOf('googleapis.com') >= 0 && url.pathname.indexOf('/staticmap') >= 0;
}

function esLeaflet(url) {
  return url.hostname === 'unpkg.com' && url.pathname.indexOf('leaflet') >= 0;
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_APP)
      .then(function (c) { return c.addAll(BASICOS); })
      .catch(function () { /* sin señal al instalar: se llena al primer uso */ })
  );
  /* A propósito no se llama skipWaiting: entra cuando la persona lo pida. */
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(nombres.map(function (n) {
        if (n.indexOf(VERSION) !== 0) return caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/** La pantalla puede pedir que entre la versión nueva. */
self.addEventListener('message', function (e) {
  if (e.data === 'ENTRAR_YA') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var pedido = e.request;

  /* REGLA 1. Lo que no es un GET —todas las llamadas al servidor— pasa de
     largo. Aquí no se guarda ni se mira un solo dato del módulo. */
  if (pedido.method !== 'GET') return;

  var url;
  try { url = new URL(pedido.url); } catch (err) { return; }

  /* Tampoco se toca nada de Apps Script, ni aunque viniera por GET. */
  if (url.hostname.indexOf('script.google.com') >= 0 ||
      url.hostname.indexOf('googleusercontent.com') >= 0) return;

  /* REGLA 3. Imágenes de satélite: de la copia si está, y si no se pide y
     se guarda. Son siempre iguales, así que no caducan. */
  if (esImagenDeMapa(url)) {
    e.respondWith(
      caches.open(CACHE_IMAGEN).then(function (c) {
        return c.match(pedido).then(function (hay) {
          if (hay) return hay;
          return fetch(pedido).then(function (r) {
            if (r && r.ok) {
              c.put(pedido, r.clone());
              podar(c, TOPE_IMAGENES);
            }
            return r;
          });
        });
      })
    );
    return;
  }

  /* Leaflet: igual, de la copia primero. Es una versión fija. */
  if (esLeaflet(url)) {
    e.respondWith(
      caches.open(CACHE_MAPA).then(function (c) {
        return c.match(pedido).then(function (hay) {
          return hay || fetch(pedido).then(function (r) {
            if (r && r.ok) c.put(pedido, r.clone());
            return r;
          });
        });
      })
    );
    return;
  }

  /* REGLA 2. La pantalla: primero el servidor, la copia solo si no hay
     señal. Así una versión nueva entra sola. */
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(pedido).then(function (r) {
        if (r && r.ok) {
          var copia = r.clone();
          caches.open(CACHE_APP).then(function (c) { c.put(pedido, copia); });
        }
        return r;
      }).catch(function () {
        return caches.match(pedido).then(function (hay) {
          return hay || caches.match('./index.html');
        });
      })
    );
  }
});

/** Deja la caché de imágenes en su tope, botando las más viejas. */
function podar(c, tope) {
  c.keys().then(function (llaves) {
    if (llaves.length <= tope) return;
    for (var i = 0; i < llaves.length - tope; i++) c.delete(llaves[i]);
  });
}
