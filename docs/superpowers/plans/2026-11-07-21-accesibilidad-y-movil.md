# Fase 9: accesibilidad y móvil (M-28, M-25, M-29) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** recorrer y seleccionar los muebles del plano con el teclado, instalar Decorazon como app desde el menú y un modo oscuro que sigue al sistema sin tocar el plano ni la 3D.

**Architecture:** M-28: cada pieza de `CapaElementos` es un `<g>` focusable (`tabIndex=0`, `role="button"`, `aria-label` con nombre y medidas, `aria-pressed`), en orden de posición, y Enter o Espacio la seleccionan; el `<svg>` del plano pasa de `role="img"` a `role="group"`. M-25: un módulo `instalacion.ts` guarda el `beforeinstallprompt` y lo expone con `useSyncExternalStore`; «Instalar Decorazon» en «Más acciones» solo cuando hay aviso o es iOS (ahí abre una nota con los pasos). M-29: los tokens de `base.css` se redefinen bajo `prefers-color-scheme: dark`, los colores fijos de las hojas pasan a tokens, y `.lienzo` y el `<svg>` del plano fijan los tokens claros (el plano se ve igual de día y de noche, como la hoja impresa y el plano exportado).

**Tech Stack:** React 19, Vitest + Testing Library, Playwright (`colorScheme: 'dark'`), CSS con `prefers-color-scheme`.

**Spec:** `docs/mejoras.md` (M-28, M-25, M-29) y el esbozo de la fase 9 en `docs/superpowers/plans/2026-11-06-12-mejoras-hoja-de-ruta.md`.

## Global Constraints

- Nada del plano (`lienzo.css`, `Pieza`, `ESTILOS_DEL_PLANO`) ni de la 3D cambia de color en modo oscuro.
- El modo oscuro sigue a `prefers-color-scheme`; sin selector manual (fuera del mínimo de M-29).
- Contraste en oscuro: texto/fondo ≥ 4,5:1, bordes de control/fondo ≥ 3:1 (WCAG 1.4.3 y 1.4.11), comprobado por test.
- El foco visible sigue siendo el anillo doble de `base.css`; en el SVG, un contorno equivalente.
- Textos nuevos en `textos.ts`; commits con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` y `Claude-Session: https://claude.ai/code/session_01JaRMzYRcRvhKeiBV5tQkon`.

## Review Focus

1. Tab por el plano con 30 muebles: el orden es por posición (arriba-abajo, izquierda-derecha), no el de inserción, y las alfombras (pisables) van primero porque se pintan debajo (test en Tarea 1).
2. Enter sobre una pieza bloqueada la selecciona (se edita, no se mueve), y las flechas después no apuntan un paso de deshacer vacío (ya lo garantiza `cambiar`; test en Tarea 1).
3. Midiendo o en el paso 1, las piezas no están en el orden de tabulación (test en Tarea 1).
4. `beforeinstallprompt` llega antes de que React monte: el oyente va en `main.tsx` antes de `createRoot` (test en Tarea 2 con el evento disparado antes de montar).
5. En oscuro, la hoja para imprimir y el plano exportado siguen siendo claros: la hoja fija sus colores (`hoja.css` ya usa blanco) y `ESTILOS_DEL_PLANO` resuelve los colores a mano (test existente); se comprueba con el e2e en oscuro (Tarea 3).

---

### Task 1: M-28, muebles con el teclado

**Files:**
- Modify: `web/src/editor/lienzo/capas/CapaElementos.tsx`: orden = pisables primero y, dentro de cada grupo, por `posicion.y` y luego `posicion.x`; cada `<g data-elemento>` con `alPulsar` lleva `tabIndex={0}`, `role="button"`, `aria-label={etiquetaAccesible(e)}` («Cama 150 × 200 cm», «, bloqueado» si lo está), `aria-pressed={elegido}` y `onKeyDown`: Enter o Espacio → `preventDefault()` y `alSeleccionar(e.id)`. Nueva prop `alSeleccionar?(id: string): void` (el `Lienzo` la pasa junto a `alPulsar`). Sin `alPulsar` (paso 1, midiendo, plano exportado, vista compartida) no hay `tabIndex` ni `role`.
- Modify: `web/src/editor/lienzo/Lienzo.tsx`: `role="group"` en el `<svg>` (el `aria-label` se queda); `alSeleccionar={(id) => almacen.getState().seleccionar({ tipo: 'elemento', id })}` en `CapaElementos` cuando `paso === 2 && !midiendo`.
- Modify: `web/src/editor/lienzo/lienzo.css`: `.capa-elementos__pieza:focus-visible { outline: 2px solid var(--tinta); outline-offset: 2px; }` y, para que se vea sobre cualquier color, `filter: drop-shadow(0 0 0 var(--amarillo))`… no: mejor un contorno doble con `outline` tinta y `box-shadow` no vale en SVG; se usa `outline` tinta + `stroke` amarillo en `.pieza__cuerpo` por `:focus-visible` (`.capa-elementos__pieza:focus-visible > :first-child { stroke: var(--amarillo); stroke-width: 3px; }`). Y en `ESTILOS_DEL_PLANO` nada (no hay foco en una imagen).
- Modify: `web/src/editor/paneles/PanelPropiedades.tsx`: `ATAJOS_MUEBLES` gana `{ teclas: ['Tab'], accion: t.atajo.recorrer }` y `{ teclas: ['Intro'], accion: t.atajo.elegir }` delante de R; `textos.propiedades.atajo.recorrer = 'Recorrer los muebles del plano'`, `elegir = 'Seleccionar el mueble con el foco'`.
- Test: `CapaElementos.test.tsx`, `Lienzo.test.tsx`, `PanelPropiedades.test.tsx`.

- [ ] **Step 1: tests RED.** `CapaElementos.test`: «cada pieza es un botón con nombre y medidas, en orden de posición y las alfombras primero» (3 muebles en posiciones desordenadas + 1 alfombra: `getAllByRole('button')` devuelve [alfombra, el de menor y, …]; `aria-label` «Cama 150 × 200 cm»); «Enter y Espacio seleccionan; otra tecla no» (`alSeleccionar` espía); «una bloqueada lo dice en el nombre y se selecciona igual»; «sin alPulsar no hay botones» (`queryAllByRole('button')` vacío); «la seleccionada lleva aria-pressed». `Lienzo.test`: «en el paso 2 los muebles entran en el orden de tabulación y Enter abre su panel; en el paso 1 y midiendo, no» (`tab()` de user-event desde el svg; `almacen.getState().seleccion`); «el svg es un grupo con nombre, no una imagen». `PanelPropiedades.test`: los atajos del paso 2 incluyen Tab e Intro.
- [ ] **Step 2: `npx vitest run src/editor/lienzo src/editor/paneles/PanelPropiedades.test.tsx` → fallan los nuevos.**
- [ ] **Step 3: código.** Revisar quién busca `role: 'img'` del plano (`grep -rn "'img'" src e2e`) y cambiarlo a `group`.
- [ ] **Step 4: verde; `npm test`, `npm run lint`, `npx tsc -b`.**
- [ ] **Step 5: commit** `feat(web): los muebles del plano se recorren con Tab y se eligen con Intro`.

### Task 2: M-25, instalar como app

**Files:**
- Create: `web/src/instalacion.ts`:
  ```ts
  export type EstadoDeInstalacion = 'no' | 'aviso' | 'ios'
  export function conectarInstalacion(w: Window = window): void   // beforeinstallprompt → preventDefault, guarda; appinstalled → 'no'
  export function estadoDeInstalacion(): EstadoDeInstalacion        // 'no' si ya va en standalone (display-mode) o nada; 'aviso' con evento guardado; 'ios' en iPhone/iPad fuera de standalone
  export function useEstadoDeInstalacion(): EstadoDeInstalacion     // useSyncExternalStore
  export async function instalar(): Promise<boolean>                // prompt() + userChoice; true si accepted; el evento se consume
  export function reiniciarInstalacion(): void                      // tests
  ```
  iOS: `/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)`; standalone: `matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`.
- Modify: `web/src/main.tsx`: `conectarInstalacion()` antes de `createRoot`.
- Modify: `web/src/editor/paneles/BarraSuperior.tsx`: `const instalable = useEstadoDeInstalacion()`; opción `{ icono: 'instalar', texto: t.instalar, alElegir }` entre «Descargar diseño» y «Sugerencias» cuando `instalable !== 'no'`; con `'aviso'` → `void instalar()`; con `'ios'` → `setExplicandoIos(true)` y un `<Confirmar>`-like diálogo (`dialog` nativo como `Confirmar`, solo con «Entendido») con `t.instalarIos`: «En Safari, pulsa Compartir y luego «Añadir a pantalla de inicio».»
- Modify: `web/src/editor/iconos.ts`: icono `instalar` (flecha hacia una bandeja).
- Modify: `web/src/textos.ts`: `barra.instalar = 'Instalar Decorazon'`, `barra.instalarIosTitulo = 'Instalar en iPhone o iPad'`, `barra.instalarIos`, `comun.entendido = 'Entendido'` (si no existe).
- Test: `web/src/instalacion.test.ts` (jsdom): «sin evento, 'no'»; «con beforeinstallprompt antes de conectar React, 'aviso' y el evento lleva preventDefault»; «instalar() llama a prompt y devuelve true si acepta; después, 'no'»; «appinstalled deja 'no'»; «en iPhone fuera de standalone, 'ios'; en standalone, 'no'» (stub de `navigator.userAgent` y `matchMedia`). `BarraSuperior.test.tsx`: «sin aviso no hay «Instalar»»; «con aviso, elegirla instala»; «en iOS abre la nota y «Entendido» la cierra devolviendo el foco al menú».

- [ ] **Step 1: tests RED.** **Step 2: código.** **Step 3: verde + lint + tsc.** **Step 4: commit** `feat(web): «Instalar Decorazon» en Más acciones (aviso del navegador o pasos en iOS)`.

### Task 3: M-29, modo oscuro

**Files:**
- Modify: `web/src/estilos/base.css`: tokens nuevos en `:root` para lo que hoy va fijo: `--sobre-tinta: #fff` (texto sobre fondo tinta), `--sobre-terracota: #fff`, `--bien: #2e7d4f`, `--peligro-suave: #fbeceb`, `--sombra: 43 38 34` (para `rgb(var(--sombra) / 0.1)`), `--primario: var(--terracota)` (fondo de botones primarios). Bloque `@media (prefers-color-scheme: dark) { :root { color-scheme: dark; --crema: #1c1916; --crema-oscura: #2a2521; --superficie: #242019; --tinta: #f1eae1; --gris: #b4aa9f; --terracota: #e4836d; --primario: #b9473a; --borde: #d98a74; --borde-suave: #3c342d; --sobre-tinta: #1c1916; --bien: #7fd09a; --peligro: #f28b7f; --peligro-suave: #3a2522; --sombra: 0 0 0; --amarillo: #ffd166; } }` (valores de partida; el test de contraste manda). `button.primario` usa `--primario` y `--sobre-terracota`; `button.primario:hover` `#a33d31` → `color-mix(in srgb, var(--primario), #000 12%)`.
- Modify: `web/src/editor/editor.css`, `lienzo.css` (solo controles y pistas, no el plano), `vista3d.css` (solo la barra), `inicio.css`, `disenos.css`, `cuenta.css`, `hoja.css`: cada `#fff` sobre tinta/terracota → `var(--sobre-tinta)`/`var(--sobre-terracota)`; `#2e7d4f` → `var(--bien)`; `#fbeceb` → `var(--peligro-suave)`; `rgb(43 38 34 / x)` → `rgb(var(--sombra) / x)`; `background: #fff` de tarjetas → `var(--superficie)`; `#a33d31` → `color-mix`. `hoja.css` no cambia (papel blanco sobre fondo gris, también en oscuro). `vista3d.css` fondo `#f4efe8` no cambia (3D).
- Modify: `web/src/editor/lienzo/lienzo.css`: `.lienzo { background: #FFF8F0; }` y `.lienzo__svg { --tinta: #2b2622; --terracota: #B9473A; --amarillo: #FFD166; --borde: #C26C57; --gris: #6f6862; --crema: #FFF8F0; --crema-oscura: #F6EADB; --superficie: #fff; color-scheme: light; }`: el plano se ve igual en oscuro. Igual para `.panel-catalogo__miniatura svg` si hereda tokens (las miniaturas del catálogo usan `Pieza`): se decide mirando la captura.
- Modify: `web/index.html`: `<meta name="theme-color" content="#B9473A" media="(prefers-color-scheme: light)">` y otro `#1c1916` para dark.
- Create: `web/src/estilos/contraste.test.ts`: lee `base.css` con `?raw`, saca los tokens del bloque dark y comprueba con la fórmula de luminancia WCAG: tinta/crema ≥ 7, tinta/superficie ≥ 7, gris/crema ≥ 4,5, terracota/crema ≥ 4,5 (enlaces), sobre-terracota/primario ≥ 4,5, borde/superficie ≥ 3, borde/crema ≥ 3, sobre-tinta/tinta ≥ 4,5, bien/crema ≥ 4,5, peligro/crema ≥ 4,5. Y para el bloque claro, lo mismo (hoy ya cumple, salvo lo que diga el test).
- Create: `web/e2e/oscuro.spec.ts`: `test.use({ colorScheme: 'dark' })`; abre `/disenar`, crea una estancia, comprueba `getComputedStyle(body).backgroundColor` oscuro y `.lienzo` claro (`rgb(255, 248, 240)`), sin errores de consola; capturas 1440 y 390 en oscuro a `test-results/` para que Angel las mire (no se versionan).
- Test existente `editor.css` con `?raw`: añadir a `vite.config.ts` `css.include` `base.css` y `lienzo.css` para los nuevos tests.

- [ ] **Step 1: tests RED** (`contraste.test.ts` falla por no existir el bloque; e2e falla por fondo claro).
- [ ] **Step 2: código; `npm run e2e` incluye el nuevo spec; mirar las capturas en oscuro (1440 y 390) y ajustar lo que se vea mal (chips, segmentados, miniaturas del catálogo, pistas, diálogos).**
- [ ] **Step 3: verde + lint + tsc + e2e. Commit** `feat(web): modo oscuro que sigue al sistema; el plano y la 3D no cambian`.

### Task 4: cierre

- [ ] `CLAUDE.md` (muebles focusables y orden; `instalacion.ts`; tokens y regla «el plano fija los tokens claros»; cómo probar en oscuro), `docs/mejoras.md` M-28, M-25, M-29 → `realizada` (PR #51), este plan con «Decisiones», «Revisión final» y «Pendiente».
- [ ] PR `feature/accesibilidad-y-movil` → `main`, CI, revisor final (opus), fix pass, fusión con el sí de Angel; capturas en oscuro para que las vea desde el móvil.

## Decisiones al ejecutar

(Se rellena durante la ejecución.)

## Revisión final

(Se rellena al cerrar.)

## Pendiente

(Se rellena al cerrar.)
