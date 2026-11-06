# Plan 18: edición fina 2D (fase 6 de las mejoras)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** bloquear un mueble para que no se mueva (M-05), darle un nombre propio (M-07), voltearlo de lado con un botón (M-08) y medir cualquier distancia del plano con una cinta métrica (M-06), con cotas también a los muebles vecinos al arrastrar.

**Índice:** [plan 12](2026-11-06-12-mejoras-hoja-de-ruta.md); mejoras en [`docs/mejoras.md`](../../mejoras.md). **Spec:** `docs/superpowers/specs/2026-10-24-decorazon-design.md` (§4 editor 2D, §6 documento).

**Architecture:**
- Documento: dos campos opcionales en `Elemento` (`nucleo/modelo/documento.ts`), como `medidasExtra?`: `bloqueado?: true` (solo se guarda cuando es verdadero; ausente = libre) y `nombre?: string` (sin espacios a los lados, 1 a `LIMITE_NOMBRE_ELEMENTO` = 60 caracteres; ausente = el nombre del producto o del tipo). `validar.ts` los acepta ausentes y los comprueba si vienen (`booleano`, `textoAcotado`). Los diseños guardados no cambian.
- Edición pura (`nucleo/edicion/elementos.ts`): `bloquearElemento(doc, id, bloqueado)`, `renombrarElemento(doc, id, nombre)` y `voltearElemento(doc, catalogo, id)`. `moverElemento` y `desplazarElemento` devuelven el mismo documento si el elemento está bloqueado (así ni el arrastre, ni el tirador de giro, ni las flechas, ni R lo mueven, y el historial no apunta un paso vacío porque `cambiar` ignora el mismo documento); `editarElemento` ignora `rotacion` en un bloqueado. `cambiarTipo` conserva los dos campos; `duplicarElemento` hereda el nombre pero la copia nace libre (se duplica para colocar la copia en otro sitio).
- `nombreDeElemento(def, e)`: primero `e.nombre`, luego el producto, luego el tipo. Lo heredan el plano, el panel, la hoja y la vista compartida sin tocarlos. `filasDeMuebles` añade `tipo: string | null` (el tipo cuando el nombre es propio y el mueble no es de tienda, que ya lo dice en su línea) y `TablaDeMuebles` lo escribe bajo el nombre.
- Voltear: una variante «de lado» es la que admite `'izquierda'` y `'derecha'` (hoy `chaise` del sofá y `ala` del escritorio en L); `voltearElemento` intercambia el valor de todas las de lado cuyo valor sea uno de los dos (con `'no'` no hace nada) y devuelve el mismo documento si ninguna cambia. `sePuedeVoltear(def)` decide si el panel enseña el botón. Para una puerta, «Voltear» cambia la bisagra (`editarAbertura`).
- Plano: `CapaElementos` dibuja un candado (`data-candado`, 14 px de pantalla, en la esquina superior izquierda de la caja de medidas girada, por `transform` con `1/escala`) en cada bloqueado; `pulsarElemento` selecciona pero no arrastra un bloqueado; `Lienzo` no monta `TiradorGiro` para un bloqueado. `ESTILOS_DEL_PLANO` lleva el estilo del candado.
- Panel: botón «Bloquear»/«Desbloquear» (`aria-pressed`) junto a «Duplicar»; sin «Giro» en un bloqueado; botón «Voltear» si `sePuedeVoltear(def)`; campo de texto «Nombre» (`CampoTexto` nuevo en `comunes`, confirma al salir del campo o con Enter, Escape restaura, `maxLength` 60) con el nombre del tipo o del producto como `placeholder`; el `<h2>` sigue siendo `nombreDeElemento` y, con nombre propio, el subtítulo dice el tipo.
- Cinta métrica: estado local del `Lienzo` (`midiendo` y `medida: { a: Punto; b: Punto | null } | null`); botón «Medir» (`aria-pressed`, icono `regla`) al principio de `.lienzo__controles`. Midiendo, las piezas no se pulsan (`alPulsar` undefined: el toque cae al fondo, como en el paso 1 con los muebles) y un toque sin arrastre en el fondo fija un punto en cm enteros: el primero abre la cota, el segundo la cierra, el tercero empieza otra; entre el primero y el segundo la cota sigue al puntero (`onPointerMove`, en móvil no hay). Escape, el botón, cambiar de paso o salir del Lienzo la quitan. `CotaLibre` en `CapaCotas` (`data-cota-libre`): línea, puntos en los extremos y el valor `Math.round(hypot)` cm en el medio. No se guarda.
- Cotas a vecinos: `cotasAParedes(planta, rect, obstaculos = [])` toma el primer corte del rayo con la planta **o** con cualquier polígono de `obstaculos`; `CotasElemento` pasa las huellas de los demás elementos no pisables (las alfombras no cuentan). La cota a un vecino pegado (corte ≈ 0) se omite, como con la pared.

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), Playwright.

## Global Constraints

- Formato de documento compatible: campos nuevos opcionales; `FORMATO_ACTUAL` no cambia; `redondearNumeros` no toca textos ni booleanos.
- Textos en `web/src/textos.ts`; iconos en `comunes/iconos.ts` (`candado`, `regla`, `voltear`). Sin dependencias nuevas.
- Mover y girar solo en 2D (spec §4.2): bloquear no cambia nada en 3D.
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.

## Review Focus

- Un diseño guardado con `bloqueado: false` o `nombre: ''` que llegue de otro cliente: el validador los acepta (`booleano` admite false; `textoAcotado` opcional admite vacío) y la app los trata como ausentes.
- `cambiar` con un bloqueado: ningún camino (flechas, R, arrastre, tirador, Ctrl+D sobre la copia) apunta un paso de deshacer vacío ni cambia la posición.
- Medir en el paso 1 y en el 2: los tiradores de vértice (paso 1) siguen pulsables mientras se mide; solo los muebles dejan de serlo.
- Nombre de 60 caracteres con espacios a los lados: se recorta y se guarda sin ellos; uno de solo espacios borra el campo.
- Un vecino solapado con el mueble arrastrado: la cota va a su borde de salida y no revienta.

## Tasks

### Task 1: documento, validación y edición pura (rojo → verde)

- [x] `nucleo/modelo/validar.test.ts`: `bloqueado: 'sí'` → `elementos[0].bloqueado: debe ser verdadero o falso`; `nombre: 'a'.repeat(61)` → `elementos[0].nombre: debe ser un texto de hasta 60 caracteres`; `bloqueado: true, nombre: 'Armario de Ana'` válido; `bloqueado: false, nombre: ''` válido.
- [x] `nucleo/edicion/elementos.test.ts`: `bloquearElemento` pone `bloqueado: true` y al quitarlo el campo desaparece (`'bloqueado' in e` false); `moverElemento` y `desplazarElemento` devuelven el mismo documento (`toBe`) con un bloqueado; `editarElemento` con `rotacion` no lo gira pero sí cambia el color; `renombrarElemento` recorta espacios, corta a 60 y con solo espacios quita el campo; `voltearElemento` en un sofá con `chaise: 'izquierda'` da `'derecha'`, con `'no'` el mismo documento, en un armario el mismo documento; `cambiarTipo` conserva `bloqueado` y `nombre`; `duplicarElemento` copia el nombre y la copia no está bloqueada.
- [x] `nucleo/catalogo/elemento.test.ts`: `nombreDeElemento` prefiere `e.nombre` al producto y al tipo; `sePuedeVoltear` true para `sofa` y `escritorio-l` (el id real del catálogo), false para `armario`.
- [x] `nucleo/edicion/cotas.test.ts`: `cotasAParedes` con un obstáculo (cuadrado de 50 a la derecha del rectángulo) da esa distancia en vez de la pared; un obstáculo pegado omite la cota.
- [x] Código: `documento.ts` (`bloqueado?: true`, `nombre?: string`, `LIMITE_NOMBRE_ELEMENTO`), `validar.ts`, `elementos.ts` (las tres funciones y las guardas), `elemento.ts` (`nombreDeElemento`, `sePuedeVoltear`), `cotas.ts`, exports en `nucleo/index.ts`.
- [x] `npm test -- nucleo` en verde. Commit `feat(nucleo): bloquear, nombre propio, voltear y cotas a vecinos`.

### Task 2: plano y arrastres

- [x] `Lienzo.test.tsx`: un armario bloqueado se selecciona al pulsarlo pero un `pointerMove` no lo mueve y no hay `[data-giro]`; lleva `[data-elemento="a"] [data-candado]`; al arrastrar una cama con un armario a 40 cm a la derecha, entre las cotas sale `40 cm`.
- [x] `usarAtajos.test` (donde estén los tests de M-01): con un bloqueado, la flecha no mueve y `pasado` no crece; R tampoco.
- [x] Código: `arrastres.ts` (`pulsarElemento` sin `arrastrar` si `e.bloqueado`), `CapaElementos.tsx` (candado), `Lienzo.tsx` (`TiradorGiro` solo si no bloqueado; huellas de vecinos a `CotasElemento`), `CapaCotas.tsx` (`CotasElemento` con `obstaculos`), `lienzo.css` (`.capa-elementos__candado`), `exportarPlano.tsx` (`ESTILOS_DEL_PLANO`).
- [x] Commit `feat(web): candado en el plano, bloqueado sin arrastre ni giro, cotas a los vecinos`.

### Task 3: panel de propiedades

- [x] `PanelPropiedades.test.tsx`: «Bloquear» pone `bloqueado` y pasa a «Desbloquear» con `aria-pressed`; bloqueado no hay campo «Giro»; «Voltear» en un sofá con chaise cambia el lado y en un armario no existe; «Voltear» en una puerta cambia la bisagra; escribir «Armario de Ana» y Enter cambia `nombre` y el `<h2>`; borrar el texto quita el campo; el `placeholder` es «Armario».
- [x] `hoja.test.ts`: `filasDeMuebles` da `nombre: 'Armario de Ana'` y `tipo: 'Armario'`; sin nombre propio, `tipo: null`; en uno de tienda con nombre propio, `tipo: null` (la línea de tienda ya lo dice). `TablaDeMuebles` (test existente o nuevo) enseña el tipo bajo el nombre.
- [x] Código: `comunes/CampoTexto.tsx`, `PanelPropiedades.tsx`, `hoja.ts`, `TablaDeMuebles.tsx`, textos (`propiedades.bloquear`, `desbloquear`, `voltear`, `nombre`), iconos.
- [x] Commit `feat(web): bloquear, voltear y nombre propio en el panel y en la hoja`.

### Task 4: cinta métrica

- [x] `Lienzo.test.tsx`: pulsar «Medir» (`aria-pressed` true) y dos toques en el fondo (pointerDown + pointerUp sin mover) en (100, 100) y (400, 100) pintan `[data-cota-libre]` con «300 cm»; tras el primero, un `pointerMove` ya enseña la cota provisional; un tercer toque empieza otra (un solo `[data-cota-libre]`, con el valor nuevo); Escape la quita y suelta el botón; midiendo, pulsar un mueble no lo selecciona; un arrastre del fondo sigue haciendo pan sin fijar puntos; cambiar de paso la quita.
- [x] `e2e/anonimo.spec.ts` (o `medir.spec.ts`): «Medir», dos clics en el suelo, aparece un texto que termina en «cm» dentro de `[data-cota-libre]`, Escape lo quita.
- [x] Código: `Lienzo.tsx` (estado, botón, `alSoltar`, `onPointerMove`, Escape por `keydown` en `window` mientras se mide), `CapaCotas.tsx` (`CotaLibre`), `lienzo.css` (`.lienzo__svg--midiendo { cursor: crosshair }`, `.capa-cotas__punto`), textos (`lienzo.medir`), icono `regla`.
- [x] Commit `feat(web): cinta métrica en el plano`.

### Task 5: cierre

- [x] `npm test`, `npm run lint`, `npm run build`, `npm run e2e`; capturas a 1440 (panel con bloqueado y nombre; cota libre) y 390.
- [x] `CLAUDE.md`: los dos campos opcionales, el candado, la cinta y las cotas a vecinos, en una frase cada uno.
- [x] `mejoras.md`: M-05, M-06, M-07, M-08 → `realizada` con fecha y PR. Este plan con todo marcado.

## Decisiones al ejecutar (7 nov 2026)

- `bloqueado` se guarda como `true` o no se guarda: `bloquearElemento(doc, id, false)` quita el campo, así un diseño liberado es byte a byte el de antes. El validador acepta `false` por si llega de otro cliente.
- Duplicar un bloqueado da una copia **libre** con el mismo nombre: se duplica para colocar la copia en otro sitio, y una copia que no se puede mover estorba.
- «Voltear» vale para toda variante con `izquierda` y `derecha` (chaise, ala, rincón del esquinero y de la rinconera), no solo para las tres de la mejora: la regla general evita una lista a mano.
- Midiendo, el segundo punto no sigue al puntero mientras hay un botón pulsado en el fondo (sería un pan o el toque que lo fijará al soltar).
- Las cotas al arrastrar van también a los vecinos (la «otra mitad» que apuntaba M-06): `cotasAParedes` acepta `obstaculos` y `CotasElemento` pasa las huellas de los demás muebles salvo las pisables.
