# Plan 10: panel contextual y avisos sobre el plano (fase 3 del rediseño del editor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el panel derecho solo ocupe sitio cuando hay algo seleccionado, que los avisos de conflicto se vean sobre el plano (donde ocurren) y que los atajos de teclado dejen de llenar el estado vacío.

**Diseño de referencia:** canvas "Decorazon editor rediseño". Sigue a los planes 8 y 9.

**Architecture:**
- `AvisosDelPlano` (sustituye a `ListaAvisos`): un chip arriba a la izquierda de `.editor__lienzo`, en `Editor.tsx`, para que esté también en 3D. Sin conflictos es un `<p role="status">` verde ("Todo cabe y se abre"); con conflictos, un botón rojo ("N avisos", `textos.barra.avisos`) que despliega la lista de siempre (`.lista-avisos`, errores primero). Elegir un aviso lleva a la pieza y cierra la lista.
- El desplegable (abrir, cerrar con Escape o pulsando fuera, devolver el foco al botón) sale a un hook `useDesplegable` en `comunes/usarDesplegable.ts`, que `MenuMas` pasa a usar también.
- `Editor.tsx` calcula si el panel tiene algo que enseñar con `seleccionDelPaso(seleccion, paso)` (exportada por `PanelPropiedades`) y, si no, marca `.editor__cuerpo--sin-panel` y `.editor__derecha--oculta`: en escritorio la columna desaparece y el plano gana su sitio. En móvil no cambia nada: la hoja se abre desde la pestaña y, sin selección, dice qué pulsar.
- Los atajos de teclado pasan a un `<details>` al pie del panel cuando hay selección (los de la estancia en el paso 1, los de muebles en el 2). El estado vacío se queda con el título y la nota.
- La pestaña "Propiedades" del móvil deja de llevar la insignia de avisos: el chip está sobre el plano también ahí.

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), Playwright.

## Global Constraints

- Textos nuevos en `web/src/textos.ts`. Sin dependencias nuevas.
- Nombres accesibles que no cambian: `Todo cabe y se abre`, los mensajes de cada conflicto como nombre de su botón, `Atajos de teclado` (región), `Nada seleccionado`. Clase `.lista-avisos` en la lista desplegada (la usa el e2e).
- El e2e `anonimo.spec.ts` abre el chip antes de buscar un aviso; sin avisos comprueba el chip verde.
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.

## Tasks

### Task 1: tests

- [x] `AvisosDelPlano.test.tsx` (sustituye a `ListaAvisos.test.tsx`): chip verde sin conflictos; chip "N avisos" que abre la lista con el solape primero; elegir un aviso navega y cierra; Escape cierra y devuelve el foco; si los conflictos desaparecen con la lista abierta vuelve el verde.
- [x] `Editor.test.tsx`: sin selección el panel derecho se oculta y con una pared seleccionada aparece; al cambiar de paso el almacén suelta la selección y el panel se oculta; el chip vive en `.editor__lienzo` también en 3D; la pestaña Propiedades ya no lleva insignia.
- [x] `PanelPropiedades.test.tsx`: el estado vacío no lleva atajos; con una pared seleccionada el `<details>` enseña los de la estancia; con un mueble, girar y duplicar.
- [x] e2e `anonimo.spec.ts`: helper `abrirAvisos`; tras mover la cama puede quedar un aviso de paso estrecho, así que se comprueba que no hay solape, no el chip verde.

### Task 2: código

- [x] `comunes/usarDesplegable.ts`; `MenuMas` lo usa.
- [x] `paneles/AvisosDelPlano.tsx`; borrado `ListaAvisos.tsx`; icono `aviso` (triángulo). El chip verde no lleva `role="status"`: cambiaría a cada arrastre y el estado de guardado ya es el `status` de la barra (los tests de `EditorDeDiseno` buscan uno solo).
- [x] `seleccionDelPaso` vive en `estado/almacen.ts` junto a `pasoDe` (oxlint no quiere funciones exportadas en un fichero de componentes); `PanelPropiedades.tsx` con `<details class="atajos">` al pie y `SinSeleccion` sin atajos.
- [x] `Editor.tsx`: clases de panel oculto, `AvisosDelPlano` en el lienzo, pestaña sin insignia.

### Task 3: estilos

- [x] `editor.css`: `.editor__cuerpo--sin-panel`, `.editor__derecha--oculta` (solo desde 768 px; también la rejilla de tableta), `.avisos` chip y lista desplegada, `.atajos` como `<details>` pegado al pie; en móvil el chip se oculta con una hoja abierta. Sin la insignia.

### Task 4: cierre

- [x] `npm test` (1343), `npm run lint`, `npm run build`, `npm run e2e` (10 de 10); capturas a 1440 (sin selección, lista de avisos abierta, con selección y atajos desplegados) y 390 px.
- [x] El e2e de sombras del 3D muestrea el lienzo por fracciones y, sin panel derecho, el lienzo es más ancho: la fracción de la sombra de la cama pasa a `[0.64, 0.67]` (medida sobre una captura del nuevo encuadre, banda de sombra de unos 3 % de ancho).
- [x] `CLAUDE.md` y este plan.

## Pendiente para la fase 4 (catálogo y estancia)

- Catálogo en rejilla de tarjetas con icono y medidas; grupos como chips filtrables.
- Estancia: botón "Amueblar" al pie del panel; nota de dónde se añade bajo las baldosas.
