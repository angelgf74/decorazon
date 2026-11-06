# Plan 13: teclado, avisos y superficie (fase 1 de las mejoras)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mover lo seleccionado con las flechas del teclado (M-01), que un lector de pantalla oiga los avisos de conflicto (M-26) y que la estancia diga su superficie y sus metros de pared (M-03).

**Índice:** [plan 12](2026-11-06-12-mejoras-hoja-de-ruta.md); mejoras en [`docs/mejoras.md`](../../mejoras.md).

**Architecture:**
- Flechas sin imán: `moverElemento` siempre imanta (`nucleo/edicion/iman.ts`, `IMAN_CM = 15`), así que 1 cm junto a una pared se volvería a pegar. Función nueva `desplazarElemento(doc, id, dx, dy)` en `nucleo/edicion/elementos.ts`, sin imán, con `redondearNumeros`. Esquinas, puertas, ventanas, radiadores, columnas y vigas van por las funciones que ya existen (`moverVertice`, `editarAbertura`, `editarEstructura`), con `intentar`.
- Un recorrido de flechas es un solo paso del historial: grupo `teclado:<id>` en `cambiar`/`intentar`, cerrado con `terminarGrupo()` al soltar la tecla o al cambiar la selección (como hace `arrastrar` al soltar).
- Avisos: región `aria-live="polite"` oculta (`.solo-lectores`) en `AvisosDelPlano`, sin `role="status"` (los tests de `EditorDeDiseno` cuentan uno solo, el del guardado). Anuncia solo cuando cambia el número, con un retardo de 600 ms para no hablar en cada movimiento de un arrastre.
- Superficie y perímetro: `superficie` y `perimetro` en `nucleo/geometria/poligono.ts` (hay `areaConSigno`), en el panel de Estancia y en la portada de la hoja para imprimir.

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), Playwright.

## Global Constraints

- Textos nuevos en `web/src/textos.ts`. Sin dependencias nuevas.
- No cambian: los atajos que ya existen (`usarAtajos.test.tsx`), el nombre accesible del chip de avisos, el único `role="status"` del editor.
- Las flechas no actúan con el foco en un campo, con un diálogo abierto, en 3D, durante un arrastre ni con `e.defaultPrevented` (el menú «Más acciones» ya usa ↑↓ y para la propagación con `preventDefault`).
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.

## Tasks

### Task 0: corregir `docs/mejoras.md` con lo que salió al leer el código (hecho el 6 nov 2026, al escribir este plan)

- [x] M-23 → `realizada` (ya existía: `TablaDeMuebles` con `enlaces` en la vista compartida, test «muebles de tienda»).
- [x] M-26: nota de que el guardado ya es `role="status"`; queda solo anunciar los avisos.
- [x] M-34: esfuerzo M y nota de que el tracker de WebAnalytics no admite eventos: hay que añadirlos allí.
- [x] M-24: nota de que la vista compartida reutiliza piezas de la hoja pero no `HojaImpresion`.
- [x] M-01: nota de que hace falta una función sin imán.

### Task 1: tests (rojo)

- [x] `nucleo/edicion/elementos.test.ts`: `desplazarElemento` suma (dx, dy) a la posición, redondea a 2 decimales, no imanta (el armario a ras de la pared se aleja 1 cm) y devuelve el mismo documento si el id no existe.
- [x] `nucleo/geometria/poligono.test.ts`: `superficie` (rectángulo en los dos sentidos y una L) y `perimetro`.
- [x] `editor/usarAtajos.test.tsx`: flechas en el paso 2 (1 cm, 10 con Mayúsculas, un solo paso de deshacer hasta soltar la tecla, `preventDefault`, nada con el foco en un campo, con `defaultPrevented` ni en 3D) y en el paso 1 (esquina, ventana recortada a su pared e ignorando ↑↓, columna, viga entera, movimiento inválido rechazado con aviso).
- [x] `editor/paneles/AvisosDelPlano.test.tsx`: región `[aria-live="polite"].solo-lectores` sin `role`, vacía al abrir; anuncia pasados 600 ms y no antes; «Todo cabe y se abre» al volver a cero; el mismo número no se repite y varios cambios seguidos solo anuncian el último.
- [x] `editor/paneles/PanelEstancia.test.tsx`: «Superficie 13,2 m²» y «Paredes 14,6 m» para 400 × 330, cambian con el ancho; en una L la superficie real (10,6), no la de la caja. `formatos.test.ts`: `formatoMetros`.
- [x] `editor/hoja/HojaImpresion.test.tsx`: la portada lleva «· 12 m²».
- [x] `editor/paneles/PanelPropiedades.test.tsx`: los atajos de la estancia incluyen «Mover».

### Task 2: código

- [x] `nucleo/edicion/elementos.ts`: `desplazarElemento`; export en `nucleo/index.ts`.
- [x] `nucleo/geometria/poligono.ts`: `superficie = Math.abs(areaConSigno(p))`, `perimetro`; export en `nucleo/index.ts`.
- [x] `editor/usarAtajos.ts`: rama de flechas con paso 1 / 10 (`shiftKey`), ignorada con `defaultPrevented`, Ctrl o Alt; por tipo de selección: elemento (solo en 2D) → `cambiar(desplazarElemento, 'teclado:' + id)`; vértice → `intentar(moverVertice, 'teclado:v' + i)`; abertura y radiador → solo ←→, posición recortada a `[0, largo − ancho]` como `posicionEnPared`; columna → `centro`; viga → `desde` y `hasta` a la vez. `keyup` de una flecha → `terminarGrupo()` (cambiar de selección ya cambia la clave del grupo).
- [x] `editor/paneles/PanelPropiedades.tsx`: fila «← → ↑ ↓» · «Mover 1 cm (con Mayúsculas, 10 cm)» en `ATAJOS_ESTANCIA` (y por tanto en los de muebles); `textos.propiedades.atajo.mover`.
- [x] `editor/paneles/AvisosDelPlano.tsx`: `useAnuncio(n)` con `setTimeout` de 600 ms que no anuncia el estado inicial; `<p className="solo-lectores" aria-live="polite">` en los dos estados del chip.
- [x] `editor/paneles/PanelEstancia.tsx`: `<p className="panel__dato">` bajo el tipo; `textos.estancia.superficie/paredes`; `formatoMetros` en `comunes/formatos.ts`.
- [x] `editor/hoja/HojaImpresion.tsx` + `textos.hoja.superficie`: «· 12 m²» en la portada.
- [x] `editor.css`: `.panel__dato`.

### Task 3: cierre

- [x] `npm test` (1365), `npm run lint`, `npm run build`, `npm run e2e` (10 de 10); capturas a 1440 (pared seleccionada, atajos desplegados, panel de Estancia con m²) y 390 px (hoja de Estancia).
- [x] `CLAUDE.md`: flechas sin imán y agrupadas; aviso `aria-live` con retardo y por qué no es `status`.
- [x] `mejoras.md`: M-01, M-26, M-03 → `realizada` (PR #43). Este plan con todo marcado.

## Revisión final (6 nov 2026)

Arreglado tras la revisión de la rama: las flechas no movían en 3D lo del paso 1; las aberturas y radiadores iban al revés en las paredes de abajo y de la izquierda y ↑↓ no servían en una vertical (ahora se proyecta la flecha sobre la pared con `posicionEnPared`, como el ratón); una flecha en el tope de la pared creaba un paso de deshacer vacío y borraba el rehacer; soltar una flecha a mitad de un arrastre partía el arrastre en dos pasos (el `keyup` solo cierra grupos `teclado:`, y `blur` también los cierra); la región `aria-live` se recreaba al cambiar de chip (ahora va siempre en el mismo sitio del árbol) y en StrictMode anunciaba el estado inicial (se compara con el último valor visto).

## Pendiente

- Los atajos del panel enseñan «Mover» también con una pared seleccionada (las flechas no mueven paredes) y en 3D; la lista no depende del tipo de selección ni de la vista.
- Con el menú «Más acciones» abierto, ←→ mueven lo seleccionado (el menú solo consume ↑↓); con la lista de avisos abierta, ↑↓ también. Con el foco en un botón del panel las flechas mueven en vez de desplazar el panel: revisar con M-28.
- La vista compartida enseña las dimensiones sin los m² (`VistaCompartida.tsx` copia la línea de `HojaImpresion.tsx`; una función `resumenEstancia` compartida lo evitaría).
- Con el teclado se puede meter un mueble 1 cm en la pared (el imán del ratón lo impide); lo marca `fueraDeEstancia` y, si luego cambian medidas o giro, `paredesTocadas` lo vuelve a pegar. Aceptado.
