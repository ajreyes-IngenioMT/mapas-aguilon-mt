# La aplicación de Android

Esto es la envoltura del módulo. Adentro se ve exactamente la misma pantalla
que está publicada en GitHub Pages — no es una copia aparte.

Se hizo así a propósito. Es la única forma de que, al publicar una versión
nueva del módulo, la gente la vea **sin volver a instalar nada**. El contenido
se actualiza solo; esta envoltura casi nunca cambia.

## Qué le agrega a la página

- Entra a pantalla completa, con su icono, como cualquier aplicación.
- El botón de regresar del teléfono funciona dentro del módulo.
- Deja escoger el archivo del trabajo del aguilón desde el teléfono.
- Usa el GPS, pidiendo permiso, para situarlo en el mapa.
- Guarda la sesión y la cola de pendientes aunque se cierre.
- Los enlaces de Drive y de los correos se abren afuera, en la aplicación
  que corresponda.

## Qué hay aquí

```
  android/
    app/src/main/java/gt/madretierra/mapas/MainActivity.java   la aplicación
    app/src/main/res/values/strings.xml                        el nombre visible
    app/src/main/res/values/colors.xml                         los colores
    app/build.gradle                                           cómo se compila
```

## Si cambia la dirección del módulo

Es lo único que hay que tocar. En `MainActivity.java`, arriba:

```java
private static final String INICIO = "https://ajreyes-ingeniomt.github.io/mapas-aguilon-mt/";
private static final String HOST   = "ajreyes-ingeniomt.github.io";
```

`HOST` es lo que decide qué se abre adentro y qué se manda al navegador. Si
queda mal, los enlaces del módulo empiezan a salirse de la aplicación.

## Cómo sale el APK

Solo desde GitHub: **Actions › APK › Run workflow**. También corre solo cada
vez que cambia algo de `android/`. El APK terminado queda publicado en
**Releases**, y de ahí lo bajan los usuarios.

El número de versión sube solo en cada compilación.

## La llave de firma

El APK sale **firmado siempre con la misma llave**. Eso es lo que permite
instalar una versión encima de la otra sin desinstalar. Si la llave cambiara,
Android rechazaría la actualización y habría que desinstalar en cada teléfono.

La llave **no está en el repositorio**. Vive en **Settings › Secrets and
variables › Actions**, en cuatro secretos:

| Secreto | Qué es |
|---|---|
| `ANDROID_LLAVE_BASE64` | el archivo `.jks` convertido a base64 |
| `ANDROID_CLAVE_ALMACEN` | la clave del almacén |
| `ANDROID_ALIAS` | el alias de la llave |
| `ANDROID_CLAVE_CLAVE` | la clave de la llave |

Para crear la llave, una sola vez, en una computadora con Java:

```bash
keytool -genkeypair -v -keystore mapas.jks -alias mapasmt \
        -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 mapas.jks > mapas.jks.b64      # el contenido va en ANDROID_LLAVE_BASE64
```

**Guarde el archivo `mapas.jks` y sus claves en un lugar seguro.** Si se
pierden, no hay forma de volver a firmar con la misma llave: la única salida
sería desinstalar la aplicación de todos los teléfonos y volver a instalarla.
No lo suba al repositorio.

Sin esos secretos el flujo compila igual, pero el APK sale **sin firmar** y no
se puede instalar. Por eso tampoco se publica en Releases.
