# Plan 12: hoja de ruta de las mejoras (índice)

Orden de implementación de las sugerencias de [`docs/mejoras.md`](../../mejoras.md), por impacto. Una fase = una rama `feature/…`, un plan con tareas marcables en esta carpeta y un PR. Se arranca con «arranca la fase N». Las fases 1 a 4 tienen ya su plan; de la 5 en adelante hay un esbozo abajo y el plan se escribe al arrancarla, con lo aprendido hasta entonces.

**Criterio:** valor / esfuerzo de `mejoras.md`, corregido con lo que salió al leer el código el 6 de noviembre de 2026 (apartado «Correcciones»). Las fases agrupan mejoras que tocan los mismos ficheros para que cada PR sea coherente y pequeño; una mejora de valor bajo entra en una fase solo si cae encima de lo que esa fase ya toca.

## Orden

| Fase | Plan | Mejoras | Por qué en este sitio |
|---|---|---|---|
| 1 | [13 Teclado, avisos y superficie](2026-11-06-13-teclado-avisos-superficie.md) | M-01, M-26, M-03 | Tres S de valor alto/medio; sin dependencias; todo en el editor |
| 2 | [14 Catálogo con miniaturas](2026-11-06-14-catalogo-miniaturas.md) | M-14, M-15 | La mejora más visible; M-15 cae encima |
| 3 | [15 Descargar, exportar y compartir](2026-11-06-15-descargar-exportar-compartir.md) | M-11, M-20, M-22, M-24 | Cuatro S que comparten `Captura3D`, `HojaImpresion`, `MenuMas` y el flujo de copia |
| 4 | [16 Ejemplos y primer uso](2026-11-06-16-ejemplos-primer-uso.md) | M-30, M-32, M-18 | Valor alto; los ejemplos sirven luego a los e2e y a las capturas |
| 5 | 17 Vista desde dentro | M-09, M-12 (decisión) | Valor alto en 3D; M-12 se decide mirando la 3D, no se asume |
| 6 | 18 Edición fina 2D | M-05, M-07, M-08, M-06 | Dos campos opcionales del documento + dos herramientas del plano |
| 7 | 19 Mis diseños y plantillas | M-19, M-04 | Tocan `MisDisenos` y la creación; M-19 lleva API |
| 8 | 20 Medir | M-31, M-34 | Datos antes de las fases caras; M-34 pasa por WebAnalytics |
| 9 | 21 Accesibilidad y móvil | M-28, M-25, M-29 | M-28 depende de M-01 (fase 1) |
| 10 | 22 Más tipos y mis productos | M-16, M-17 | Sin urgencia; M-16 se filtra con los datos de la fase 8 |
| 11 | 23 Selección múltiple y 3D | M-02, M-10, M-27, M-13 | Las L del editor; se replantean con lo aprendido |
| 12 | 24 Versión anterior e inglés | M-21, M-33 | API + base de datos, y traducción: lo más lejano |

## Regla de cada fase

- Al arrancar: rama `feature/<nombre>`, tests primero (rojo), código, `npm test`, `npm run lint`, `npm run build`, `npm run e2e` (y `npm run e2e:cuentas` si toca cuentas o Mis diseños), capturas con un script temporal de Playwright desde `web/` (puerto libre, se borra después), PR con CI en verde y merge con el sí de Angel.
- Al cerrar: las mejoras pasan a `realizada` en `mejoras.md` con la fecha y el PR; lo que no es obvio va a `CLAUDE.md`; lo que quede fuera se apunta en el plan de la fase («Pendiente») o como nota en `mejoras.md`.
- Publicar en producción solo con `srv subir` (ensayo) y el sí explícito de Angel a `srv subir --publicar`.

## Correcciones a `mejoras.md` que salieron al leer el código (6 nov 2026)

- **M-23 ya estaba hecha**: `VistaCompartida.tsx` pinta `TablaDeMuebles` con `enlaces`, que enseña tienda, referencia, precio con fecha, total y aviso (test «muebles de tienda» en `VistaCompartida.test.tsx`). Pasa a `realizada`.
- **M-26 se reduce a los avisos**: el estado de guardado ya es `role="status"` (`BarraSuperior.tsx`), que implica `aria-live="polite"`. Solo falta anunciar los avisos de conflicto.
- **M-34 sube a esfuerzo M y depende de WebAnalytics**: el tracker solo hace un POST a `/api/visits`; no admite eventos con nombre. Hay que añadir un endpoint y una función global en ese proyecto antes.
- **M-24**: la vista compartida reutiliza `PlanoDelDiseno`, `PlanoAmpliado` y `TablaDeMuebles`, pero no `HojaImpresion`, que lee el documento del almacén y solo acepta `{ alCerrar }`.
- **M-01**: `moverElemento` (`nucleo/edicion/elementos.ts`) siempre pasa por `imantar` (`IMAN_CM = 15`); 1 cm de flecha junto a una pared volvería a pegarse. Hace falta una función sin imán.
- **M-19 necesita API**: el resumen de la lista (`RespuestaDeResumenDeDiseno`) no trae imagen y solo existe `GET /compartidos/{enlace}/imagen` (público, solo compartidos).

## Esbozos de las fases 5 a 12

### Fase 5 (plan 17): vista desde dentro (M-09, M-12)

`Escena3D.tsx` usa `OrbitControls` de drei con límites de `camaraInicial` (`nucleo/modelo3d/camara.ts`); `Lienzo3D` va con `frameloop="demand"`, así que todo control nuevo llama a `invalidate()`. Botón «Desde dentro» en la barra de `Vista3D`: cámara a 1,6 m junto a la primera puerta (normal interior con `normalExterior`) mirando al centro; `OrbitControls` con `target` a 1 m delante de la cámara, `enableZoom=false`, `enablePan=false` y distancia fija (orbitar = girar la cabeza); «Ocultar paredes delante» se desactiva mientras tanto. Los controles son opcionales para que `Captura3D` y `Vista3DSoloVer` no cambien. M-12: antes de nada, mirar la 3D en un portátil normal y decidir en una línea si las texturas hacen falta; si sí, textura procedimental por material en `materiales3d.ts`, con medida de fps antes y después.

### Fase 6 (plan 18): edición fina 2D (M-05, M-07, M-08, M-06)

Campos opcionales `bloqueado?: boolean` y `nombre?: string` en `Elemento` (`nucleo/modelo/documento.ts`, precedente `medidasExtra?`), validados en `validar.ts` con `booleano` y `textoAcotado`; `cambiarTipo` (`nucleo/edicion/elementos.ts`) debe copiarlos (hoy parte de `elementoNuevo`); `duplicarElemento` los hereda. Bloqueado: `lienzo/arrastres.ts` no arrastra ni gira, `CapaElementos` dibuja un candado, Propiedades lleva el botón. Nombre: `nombreEnPlanta` (`nucleo/catalogo/elemento.ts`), `filasDeMuebles` (`hoja/hoja.ts`) y la vista compartida. Voltear: botón que invierte la variante de lado (`chaise`, `ala`, `bisagra`). Cinta métrica: herramienta en `.lienzo__controles`, dos clics, cota flotante en `CapaCotas`, Escape la quita; en móvil, dos toques.

### Fase 7 (plan 19): Mis diseños y plantillas (M-19, M-04)

API: `GET /disenos/{id}/vista-previa` (dueño, misma tabla `vistas_previas`) y `tieneVistaPrevia` en `RespuestaDeResumenDeDiseno`; `RefrescoDeVistaPrevia` genera también para los no compartidos (misma frecuencia de 5 min de `frecuencia.ts`); `dotnet build` + `npm run api:tipos`. `MisDisenos.tsx`: miniatura, buscador por nombre y orden por nombre, tipo o fecha (en el cliente). Plantillas: `documentoNuevo` (`nucleo/modelo/crear.ts`) admite forma `rectangulo | ele | conHueco` con sus medidas; `NuevaEstancia.tsx` y `DialogoNuevo` de `MisDisenos.tsx` enseñan las tres con un dibujo; en una L el panel ya enseña la nota `noRectangular`.

### Fase 8 (plan 20): medir (M-31, M-34)

M-31: Lighthouse móvil sobre `/disenar` y `/`; cifras y tope anotados aquí; revisar que el service worker no precargue el fragmento 3D (`vite.config.ts`, `workbox`) si la cifra lo pide. M-34: en WebAnalytics, `POST /api/events` y `window.webanalytics.evento(nombre, datos?)` en el tracker; en Decorazon, `analitica.ts` expone `evento()` y se llama en `anadirTipo`, al entrar en 3D, al imprimir, al crear un enlace y al abrir un ejemplo; sin datos personales ni ids de diseño.

Plan propio: `2026-11-07-20-medir.md`.

#### Medidas de la fase 8 (7 nov 2026, Lighthouse 13.6.0, móvil simulado, `--throttling-method=simulate`)

| Página | Dónde | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | TBT | CLS | Peso |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | producción (release `a6230ed`, fase 7) | 94 | 100 | 100 | 83 | 0,9 s | 3,1 s | 0 ms | 0 | 422 kB |
| `/disenar` | producción (release `a6230ed`) | 98 | 98 | 100 | 82 | 0,8 s | 2,4 s | 0 ms | 0 | 184 kB |
| `/` | `vite preview` local, antes de los arreglos | 90 | — | — | — | 0,9 s | 3,6 s | 0 ms | 0 | 419 kB |
| `/` | `vite preview` local, con los arreglos de esta fase | 92 | — | — | 100 | 0,9 s | 3,4 s | 0 ms | 0 | 419 kB |
| `/disenar` | `vite preview` local | 100 | — | — | — | 0,9 s | 0,9 s | 0 ms | 0 | 182 kB |

- Tamaños del build (sin comprimir): arranque 535 kB (`index` 425 + `jsx-runtime` 110 + runtime 1), CSS 42 kB, fragmento 3D (`Escena3D`) 1015 kB. Three solo entra al pulsar 3D: `index.html` no lo enlaza ni lo precarga, y ninguna medida lo cargó. **Tope** en `web/pruebas-build/presupuesto.test.ts`: arranque 620 kB, CSS 48 kB, 3D 1170 kB (lo medido + 15 %). Si se pasa, no se sube el tope sin mirar qué entró.
- Lo que salió y se arregló en esta fase: faltaba `robots.txt` (nginx devolvía `index.html` y Lighthouse lo leía como robots roto), faltaba la meta `description`, y la imagen del primer ejemplo (el elemento LCP del inicio en móvil) iba con `loading="lazy"`: ahora `eager` + `fetchpriority="high"`. SEO del inicio 83 → 100 en local.
- El LCP del inicio sigue en 3,4 s simulados: la imagen solo se pide cuando React ya ha pintado la página, y antes hay que bajar y ejecutar 167 kB (gzip) de JS. Se probó un `<link rel="preload">` de esa imagen en `index.html` y el LCP simulado empeoró de forma consistente (3,8 s en tres pasadas: la imagen compite con el JS por el ancho de banda), así que no se deja. Lo que lo bajaría de verdad es menos JS en el arranque (los 110 kB de `jsx-runtime` son React entero) o pintar el inicio sin JS; queda fuera de esta fase.
- El service worker sigue precargando el fragmento 3D (276 kB gzip): pasa después de la carga, no cuenta en ninguna de estas cifras y es lo que hace que la 3D funcione sin conexión. Se deja.
- Repetir: `cd web && npm run build && npx vite preview --port 5328` y `npx -y lighthouse@13.6.0 http://localhost:5328/ --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --output=json --output-path=lh.json --chrome-flags="--headless=new"`; en producción, la URL pública (pasa por Cloudflare; el `userAgent` de Lighthouse no cuenta como visita ni como evento).

### Fase 9 (plan 21): accesibilidad y móvil (M-28, M-25, M-29)

M-28: en `CapaElementos`, `tabIndex=0` y `aria-label` por elemento, Enter selecciona, orden por posición; con las flechas de la fase 1 ya se mueven. M-25: `beforeinstallprompt` guardado en un módulo y opción «Instalar Decorazon» en `MenuMas` solo cuando exista; nota para iOS. M-29: `prefers-color-scheme: dark` sobre los tokens de `base.css`, sin tocar el plano ni la 3D; revisar el contraste de chips y segmentados.

### Fase 10 (plan 22): más tipos y mis productos (M-16, M-17)

M-16: una definición por tipo en `nucleo/catalogo/definiciones/` (huella, volúmenes, aperturas, 3D, estancias) y alta en `catalogoBase.ts`; `modelos3dIntegridad.test.ts` e `integridad.test.ts` vigilan; los tipos se eligen con los datos de la fase 8 y las sugerencias recibidas. M-17: `localStorage` `decorazon.tienda.productos` (lista de `OrigenTienda` + medidas + tipo, reglas de `nucleo/modelo/tienda.ts`) y «Elegir uno guardado» en `ProductoDeTienda.tsx`; en la cuenta solo si se usa.

### Fase 11 (plan 23): selección múltiple y 3D (M-02, M-10, M-27, M-13)

M-02: `Seleccion` (`estado/almacen.ts`) admite `{ tipo: 'elementos', ids }`; arrastre conjunto con `desplazarElemento` (fase 1) sin imán y borrado múltiple; panel con «N muebles». M-10: arrastre en 3D sobre el plano del suelo (raycast) con `moverElemento` e imán, con `OrbitControls` desactivados durante el gesto. M-27: gesto de dos dedos en `Lienzo.tsx`, distinguido del pellizco porque empieza sobre el seleccionado. M-13: luces por ventana y lámpara con tope, medidas en fps.

### Fase 12 (plan 24): versión anterior e inglés (M-21, M-33)

M-21: tabla `versiones_anteriores` (una por diseño) escrita en `GestionDeDisenos.ActualizarAsync` antes de `diseno.Actualizar`, endpoints `GET/POST /disenos/{id}/version-anterior`, migración EF y límite de tamaño igual al del contenido; «Recuperar la versión anterior» en `MenuMas`. M-33: `textos.ts` pasa a `textos/es.ts` y `textos/en.ts` con el mismo tipo, elección por `navigator.language` y selector en el pie; las etiquetas de variantes y zonas de color salen de las definiciones del catálogo a los textos.
