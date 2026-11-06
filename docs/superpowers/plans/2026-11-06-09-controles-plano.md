# Plan 9: controles sobre el plano (fase 2 del rediseño del editor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada control viva donde se usa: 2D/3D, zoom y encuadre flotan sobre el plano (y sobre la vista 3D), y las pistas son una línea discreta que se puede cerrar, no un panel que tapa el dibujo.

**Diseño de referencia:** canvas "Decorazon editor rediseño". Sigue al plan 8 (barra en tres zonas).

**Architecture:**
- El selector 2D/3D sale de `BarraSuperior` y va en `Editor.tsx`, dentro de `.editor__lienzo`, para que exista en las dos vistas (el `Lienzo` se desmonta al pasar a 3D).
- `Lienzo.tsx` agrupa abajo a la derecha Alejar, Acercar y Encuadrar (`.lienzo__controles`). El zoom por botón usa `zoomEn` alrededor del centro del svg, con factor 1,25, y marca la vista como movida a mano (igual que la rueda).
- `Vista3D` lleva su barra (Ocultar paredes delante, Encuadrar) al mismo sitio, abajo a la derecha, para que Encuadrar esté siempre donde mismo.
- `PistasDelPlano` conserva su DOM (lista con una pista por `li`, botón de ocultar, botón de mostrar): cambia solo el CSS, a una píldora oscura abajo a la izquierda con las pistas separadas por puntos.

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), Playwright.

## Global Constraints

- Textos nuevos en `web/src/textos.ts`. Sin dependencias nuevas.
- Nombres accesibles que no cambian: `2D`, `3D`, `Encuadrar`, `Ocultar paredes delante`, `Ocultar pistas`, `Mostrar pistas`, `Plano de la estancia`. Clases que usan tests o CSS del editor: `.lienzo__pistas`, `.lienzo__mostrar-pistas`, `.lienzo__svg`.
- Móvil: los botones de zoom se ocultan (hay pellizco); Encuadrar se queda. La píldora de pistas no pisa los controles de la derecha.
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.

## Tasks

### Task 1: tests

- [x] `BarraSuperior.test.tsx`: la barra ya no lleva `2D`/`3D`; "pulsar fuera cierra el menú" pulsa `1 Estancia`.
- [x] `Editor.test.tsx`: el selector de vista está en el editor, `2D` pulsado por defecto y `3D` cambia la vista.
- [x] `Lienzo.test.tsx`: `Acercar` multiplica la escala por 1,25 y `Alejar` la divide; a la escala máxima `Acercar` se desactiva.

### Task 2: marcado y lógica

- [x] `BarraSuperior.tsx`: quitar el segmentado de vista.
- [x] `Editor.tsx`: `SelectorDeVista` (`.editor__vista`) dentro de `.editor__lienzo`.
- [x] `Lienzo.tsx`: `.lienzo__controles` con Alejar, Acercar y Encuadrar (solo icono, con `aria-label`); icono `menos`; textos `lienzo.zoom`, `acercar` y `alejar`.
- [x] `Vista3D.tsx`: barra abajo a la derecha (CSS; también la de `Vista3DSoloVer`, que comparte la clase).

### Task 3: estilos

- [x] `editor.css`: `.editor__lienzo { position: relative }`, `.editor__vista` arriba a la derecha.
- [x] `lienzo.css`: `.lienzo__controles` abajo a la derecha; `.lienzo__pistas` como píldora oscura abajo a la izquierda con el punto al final de cada pista (una línea partida empieza limpia); en móvil sin zoom y solo las dos primeras pistas.
- [x] `vista3d.css`: `.vista3d__barra` abajo a la derecha.

### Task 4: cierre

- [x] `npm test` (1335), `npm run lint`, `npm run build`, `npm run e2e` (10 de 10); capturas a 1440 (2D paso 1 y 2, 3D) y 390 px (con y sin hoja, táctil).
- [x] `CLAUDE.md` y este plan.

## Pendiente para la fase 3 (panel derecho contextual y avisos)

- Panel de propiedades solo con selección; sin selección el plano ocupa el ancho.
- Avisos como chip sobre el plano (arriba a la izquierda) que despliega la lista, en vez de la caja bajo propiedades.
- Atajos de teclado en un desplegable al pie del panel, no en el estado vacío.
- En 3D, Encuadrar es texto y en 2D icono: unificar cuando se toque la barra 3D.
