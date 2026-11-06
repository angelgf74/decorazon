# Plan 11: catálogo en rejilla y "Amueblar" al pie (fase 4 del rediseño del editor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el catálogo se recorra de un vistazo (rejilla de tarjetas en dos columnas, chips para quedarse con un grupo) y que el paso 1 termine con un botón claro para pasar a amueblar.

**Diseño de referencia:** canvas "Decorazon editor rediseño". Cierra el rediseño tras los planes 8, 9 y 10.

**Architecture:**
- `PanelCatalogo`: los grupos siguen siendo secciones con su título (los tests y el e2e buscan la región "Otros muebles"); encima, una fila de chips (`aria-pressed`), uno por grupo con tipos. Pulsar uno deja solo ese grupo; volver a pulsarlo enseña todos. El buscador filtra dentro de lo que se enseña. Las tarjetas pasan a una rejilla de dos columnas: nombre y medidas, sin el icono "+" (la nota de arriba ya dice que pulsar añade); el asa de arrastre táctil (`.panel-catalogo__asa`) se queda, en la esquina de la tarjeta.
- `PanelEstancia`: botón primario "Amueblar" al pie (`irAPaso(2)`), con flecha; el panel se estira al alto de la columna para que el botón quede abajo.
- Sin iconos por tipo de mueble: el catálogo no los tiene y dibujar sesenta no es de esta fase.

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), Playwright.

## Global Constraints

- Textos nuevos en `web/src/textos.ts`. Sin dependencias nuevas.
- Nombres accesibles que no cambian: el de cada tarjeta (`Armario 100 × 60 cm`), las regiones de grupo (`Para tu cocina`, `Decoración`, `Otros muebles`), el buscador `Buscar mueble`, `1 Estancia` y `2 Amueblar` en la barra. Clases `.panel-catalogo__tipo` y `.panel-catalogo__asa` (arrastre táctil y tests).
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.

## Tasks

### Task 1: tests

- [x] `PanelCatalogo.test.tsx`: sin chip pulsado se ven todos los grupos; pulsar "Decoración" deja solo esa región; volver a pulsarlo enseña todas; el buscador filtra dentro del grupo elegido.
- [x] `PanelEstancia.test.tsx`: "Amueblar" al pie pasa al paso 2.

### Task 2: código

- [x] `PanelCatalogo.tsx`: chips (solo de los grupos con tipos), rejilla, tarjeta sin "+".
- [x] `PanelEstancia.tsx`: botón "Amueblar" en `.panel-estancia__pie`; icono `flecha`.
- [x] Textos: `catalogo.grupos` (etiqueta del grupo de chips).

### Task 3: estilos

- [x] `editor.css`: `.chip`, `.panel-catalogo__chips`, `.panel-catalogo__rejilla` (dos columnas), tarjeta vertical con el asa táctil en la esquina derecha, `.panel-estancia` a todo el alto y `.panel-estancia__pie` con `margin-top: auto` y `padding-top` como separación mínima.

### Task 4: cierre

- [x] `npm test` (1347), `npm run lint`, `npm run build`, `npm run e2e` (10 de 10); capturas a 1440 (paso 1, catálogo, catálogo con chip) y 390 px (hoja del catálogo táctil, hoja de estancia con el botón).
- [x] `CLAUDE.md` y este plan.

## Lo que queda fuera del rediseño

- Iconos por tipo de mueble en las tarjetas del catálogo: el catálogo no los tiene.
- El chip de avisos tapa el extremo izquierdo de la cota superior del plano en el paso 1 (solo la línea, no el texto). Si molesta, subir `MARGEN_ENCUADRE_PX` o bajar el chip.
