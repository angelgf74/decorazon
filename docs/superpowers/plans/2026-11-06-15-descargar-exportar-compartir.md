# Plan 15: descargar, exportar y compartir (fase 3 de las mejoras)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** descargar la imagen 3D y el plano como PNG (M-11), el diseño como fichero y volver a abrirlo (M-20), compartir con la hoja nativa del móvil (M-22) e imprimir desde la vista compartida (M-24).

**Índice:** [plan 12](2026-11-06-12-mejoras-hoja-de-ruta.md); mejoras en [`docs/mejoras.md`](../../mejoras.md).

**Architecture:**
- `editor/comunes/descargar.ts`: `descargar(nombre, blob | dataUrl)` (`<a download>`, `URL.createObjectURL` y `revokeObjectURL`) y `nombreDeFichero(nombre)` (sin caracteres que no admita un sistema de ficheros).
- Imagen 3D: `Captura3D` (`editor/vista3d/Captura3D.tsx`) ya devuelve un PNG por `alCapturar` cuando se monta fuera de pantalla con `.hoja-impresion__lienzo3d` (1200 × 800). El hook `usarCaptura3D(doc)` sale de lo que hoy hace `HojaImpresion.tsx` (comprobar `hayWebgl()`, montar, tiempo límite 8 s, desmontar al capturar) y lo usan la hoja y la descarga.
- Plano: `hoja/exportarPlano.ts` toma el `<svg>` de `PlanoDelDiseno` (`marcoDeImpresion` de `hoja.ts` para el encuadre), le incrusta un `<style>` con las reglas necesarias (`ESTILOS_DEL_PLANO`, copiadas de `lienzo.css`/`hoja.css` con las variables de `base.css` resueltas), lo serializa con `XMLSerializer`, lo pinta en un canvas a 2× y saca PNG. Sin canvas (jsdom) devuelve el SVG.
- Exportar: `serializarDocumento(doc)` (`nucleo/edicion/serializar.ts`) a `<nombre>.decorazon.json`. Importar: `validarDocumento` (`nucleo/modelo/validar.ts`) y el flujo que ya usa «Hacer una copia» de la vista compartida: `sustituiriaDisenoAnonimo()` → `Confirmar` → `empezarAnonimoCon(doc)` (`cuenta/disenosLocales.ts`) → `/disenar`. En Mis diseños, `crearDiseno(nombre del fichero, doc)`.
- Compartir nativo: en `DialogoCompartir`, si `typeof navigator.share === 'function'`, botón «Enviar» con `{ title, url }`; `AbortError` se ignora; «Copiar enlace» se queda.
- Hoja desde la vista compartida: `HojaImpresion` acepta `{ doc?, nombre?, alCerrar }` y cae al almacén si no se los pasan; `VistaCompartida` la carga con `lazy` y la abre con «Imprimir».

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), Playwright.

## Global Constraints

- Las opciones nuevas van en el menú «Más acciones» (`MenuMas` en `BarraSuperior.tsx`) y devuelven el foco al botón del menú **antes** de ejecutarse (regla del menú); en móvil el menú las enseña igual.
- Textos nuevos en `web/src/textos.ts`. Sin dependencias nuevas. Nada se sube al servidor: todo es local.
- Importar nunca pisa el diseño anónimo sin preguntar; un fichero inválido enseña un error y no cambia nada.
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`, `npm run e2e:cuentas`.

## Tasks

### Task 1: tests (rojo)

- [x] `editor/comunes/descargar.test.ts`: crea un `<a download="nombre">`, lo pulsa y lo quita; con un `Blob` crea y revoca la URL; `nombreDeFichero('Dormitorio de Ana / 2')` → `Dormitorio de Ana - 2`.
- [x] `editor/hoja/exportarPlano.test.ts`: el SVG serializado lleva `<style>` y el `viewBox` de `marcoDeImpresion`; sin canvas devuelve `image/svg+xml`.
- [x] `editor/paneles/BarraSuperior.test.tsx`: el menú lleva «Descargar imagen 3D», «Descargar plano» y «Descargar diseño»; cada una devuelve el foco al botón y llama a su `alDescargar…`; «Descargar diseño» produce un JSON que pasa `validarDocumento`.
- [x] `editor/hoja/HojaImpresion.test.tsx`: con `doc` y `nombre` por props no lee el almacén; sin ellos, como hasta ahora.
- [x] `disenos/paginas/VistaCompartida.test.tsx`: «Imprimir» abre la hoja con el documento compartido y su nombre.
- [x] `disenos/paginas/DialogoCompartir.test.tsx`: con `navigator.share` simulado aparece «Enviar» y se llama con la URL de `direccionCompartida`; `AbortError` no enseña error; sin `share` el botón no existe.
- [x] `paginas/Inicio.test.tsx`: «Abrir un fichero» con un JSON válido abre `/disenar` con ese documento; con diseño anónimo pregunta antes y «Cancelar» no cambia nada; con un JSON inválido enseña `textos.importar.noValido`.
- [x] `disenos/paginas/MisDisenos.test.tsx`: «Importar» con un JSON válido llama a `crearDiseno` con el nombre del fichero (sin `.decorazon.json`) y el documento; inválido enseña el error.

### Task 2: código

- [x] `editor/comunes/descargar.ts`, `editor/hoja/usarCaptura3D.ts` (y `HojaImpresion` lo usa), `editor/hoja/exportarPlano.ts` con `ESTILOS_DEL_PLANO`.
- [x] `BarraSuperior.tsx`: tres opciones en `MenuMas` con `alDescargarImagen`, `alDescargarPlano`, `alDescargarDiseno` cableadas en `Editor.tsx` (la imagen 3D monta `Captura3D` fuera de pantalla dentro de `SinFallos` + `Suspense`, como la hoja; mientras captura, la opción enseña «Preparando…»).
- [x] `nucleo/edicion/serializar.ts` o `editor/persistencia/fichero.ts`: `exportarDiseno(doc, nombre)` e `importarDiseno(File): Promise<Resultado>` (lee, `JSON.parse` con `try/catch`, `validarDocumento`).
- [x] `Inicio.tsx`: «Abrir un fichero» (`<input type="file" accept=".json,application/json">` oculto tras un botón) con el flujo de copia; `MisDisenos.tsx`: «Importar».
- [x] `DialogoCompartir.tsx`: «Enviar» con `navigator.share`.
- [x] `HojaImpresion.tsx`: props opcionales; `VistaCompartida.tsx`: botón «Imprimir» junto a «Hacer una copia».
- [x] Textos: `barra.descargarImagen`, `barra.descargarPlano`, `barra.descargarDiseno`, `barra.preparandoImagen`, `importar.abrir`, `importar.importar`, `importar.noValido`, `importar.sustituir` (reutilizar `compartir.confirmarSustituir` si encaja), `compartir.enviar`, `compartir.imprimir`.

### Task 3: cierre

- [x] `npm test`, `npm run lint`, `npm run build`, `npm run e2e`, `npm run e2e:cuentas`.
- [x] A mano en Chromium: descargar el plano de un diseño con puerta, ventana y cotas y abrir el PNG (los estilos incrustados son lo frágil); descargar la imagen 3D; exportar e importar el mismo diseño y comprobar que es idéntico; en un móvil o con `navigator.share` emulado, «Enviar».
- [x] Capturas a 1440 (menú con las opciones nuevas) y 390 px (diálogo de compartir con «Enviar»).
- [x] `CLAUDE.md`: el PNG del plano lleva los estilos incrustados (`ESTILOS_DEL_PLANO`): al cambiar `lienzo.css` hay que revisarlo; formato del fichero exportado.
- [x] `mejoras.md`: M-11, M-20, M-22, M-24 → `realizada` con fecha y PR. Este plan con todo marcado.

## Decisiones al ejecutar (6 nov 2026)

- En vez del hook `usarCaptura3D`, un componente `CapturaFueraDePantalla` (WebGL, `Captura3D` perezoso, `SinFallos`, `Suspense`, tiempo límite) que usan la hoja y «Descargar imagen 3D».
- El svg del plano se obtiene con `renderToStaticMarkup(PlanoDelDiseno)` (`react-dom/server`): no depende de que la hoja esté montada.
- `HojaImpresion` se importa de forma estática en la vista compartida: Vite avisaba de que el import dinámico no la movía de fragmento (el editor ya la importa estática).
- El campo de fichero va oculto tras una etiqueta con aspecto de botón y se vacía al elegir, para poder repetir el mismo fichero.
- La captura a 390 px del diálogo de compartir con «Enviar» necesita la API con sesión: lo cubre el test con `navigator.share` simulado; se tomó la del inicio con «Abrir un fichero».

## Revisión final (6 nov 2026)

Arreglado tras la revisión de la rama: `react-dom/server` entraba en el fragmento principal (+64 kB gzip en todas las rutas; ahora `exportarPlano` se carga al pedir el plano, con aviso si falla); el foco del campo de fichero no se veía (el anillo va en la etiqueta, `base.css`); «Nuevo diseño» a mitad de la captura de la imagen 3D no la anulaba y la estancia siguiente descargaba una imagen que nadie pidió; sin WebGL, «Imprimir» en la vista compartida descargaba three para nada (regresión del componente nuevo); el nombre del fichero importado conservaba el « (1)» del navegador y no se recortaba a 100 caracteres (400 del servidor).

## Pendiente

- Menores de la revisión: las flechas del menú se atascan en una opción desactivada; `importarDiseno` no aplica las reglas del servidor (1 MB en UTF-8, números sin exponente, sin NUL) con ficheros editados a mano; «Preparando…» no se ve porque el menú se cierra, y el fallo por tiempo usa el texto de «sin 3D»; «Enviar» dos veces seguidas avisa (`InvalidStateError`); clase muerta `inicio__abrir`, la etiqueta «Importar» no parece desactivada con `ocupado` y el aviso no se limpia antes de leer otro fichero; `rel="noopener"` sin `target` y `revokeObjectURL` a 1 s (Safari usa más); `CapturaFueraDePantalla` depende de `hoja.css`.
- Safari/iOS y Firefox sin verificar (solo hay Chromium): `decode()` con un svg en URL de datos, canvas «tainted» y `<a download>` con URL de datos.
- El PNG del plano sale a 2× del tamaño de la hoja (1360 px de ancho); no hay opción de tamaño.
- «Descargar imagen 3D» en un dispositivo sin WebGL avisa con el texto de la hoja («La vista 3D no está disponible…»); no se oculta la opción de antemano.
- `ESTILOS_DEL_PLANO` copia reglas de `lienzo.css` a mano: al cambiar el css del plano hay que revisarlo (lo dice CLAUDE.md).
