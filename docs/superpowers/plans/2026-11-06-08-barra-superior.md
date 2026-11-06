# Plan 8: barra superior en tres zonas (fase 1 del rediseño del editor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la barra del editor diga tres cosas y nada más: qué diseño es y si está guardado, en qué paso estoy, y deshacer/rehacer. Lo demás (nuevo diseño, imprimir, sugerencias) pasa a un menú "Más acciones".

**Diseño de referencia:** canvas "Decorazon editor rediseño" (artboards Escritorio · Amueblar, Escritorio · Estancia y Móvil). Esta fase toca solo la barra; 2D/3D sigue en ella hasta la fase 2 (controles sobre el plano).

**Architecture:**
- Todo en `web/src/editor/paneles/BarraSuperior.tsx` y la sección "Barra superior" de `web/src/editor/editor.css`. El estado del editor (`almacen`) y la sincronización no cambian.
- El menú es un componente local `MenuMas` (estado React, sin Popover API: jsdom no la implementa). Al elegir una opción, el menú se cierra y **devuelve el foco al botón "Más acciones" antes** de ejecutar la acción: así `Editor` guarda ese botón como `focoAntes` y al cerrar la hoja de impresión el foco vuelve a un sitio que existe.
- La sugerencia se abre desde el menú con `DialogoDeSugerencia` directamente (no `BotonDeSugerencia`, que cerraría su diálogo al desmontarse el menú).

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), Playwright.

## Global Constraints

- Textos nuevos en `web/src/textos.ts`. Sin dependencias nuevas.
- Nombres accesibles que **no cambian**: `1 Estancia`, `2 Amueblar`, `2D`, `3D`, `Deshacer`, `Rehacer`, `Nombre del diseño`, `Guardar`, `Entrar`, `Mis diseños`, el nombre del usuario como enlace a la cuenta, `Guardar en mi cuenta`, `Nuevo diseño`, `Imprimir`, `Sugerencias`, y el `role="status"` del guardado con la clase `.barra__guardado` (la usan los e2e).
- Lo que cambia a propósito: `Nuevo diseño`, `Imprimir` y `Sugerencias` solo existen en el DOM con el menú abierto. Los tests y e2e que los pulsan abren antes "Más acciones".
- Móvil: el botón de sugerencias de las pestañas de abajo se queda (fase 3 decide); la opción del menú se oculta ahí por CSS para no duplicar.
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`; `npm run e2e` al final.

## Tasks

### Task 1: tests de la barra con el menú

- [x] `BarraSuperior.test.tsx`: `Nuevo diseño` y `Sugerencias` se pulsan tras abrir `Más acciones`; con el menú cerrado no están en el DOM; `Escape` cierra el menú y deja el foco en el botón; con diseño del servidor el menú no ofrece `Nuevo diseño` pero sí `Imprimir`.
- [x] `Editor.test.tsx`: `Imprimir` tras abrir el menú; al cerrar la hoja el foco vuelve a `Más acciones`.
- [x] e2e `anonimo.spec.ts`, `sugerencias.spec.ts`, `cuentas.spec.ts`: abrir el menú antes de `Imprimir`/`Sugerencias`; en escritorio, `Sugerencias` está dentro de `.barra` con el menú abierto y hay un solo botón.

### Task 2: marcado

- [x] Zona izquierda: enlace al inicio con la marca (`/favicon.svg`), nombre del diseño (solo del servidor), estado de guardado.
- [x] Zona central: pasos como segmentado; 2D/3D al lado (se mueve en la fase 2).
- [x] Zona derecha: deshacer/rehacer solo icono con `aria-label` y `title`; `MenuMas`; cuenta (sin sesión: Guardar primario + Entrar; con sesión: Guardar en mi cuenta si procede, Mis diseños, avatar con la inicial enlazando a la cuenta).
- [x] Icono `puntos` (tres puntos) en `iconos.ts`; textos `barra.mas`, `barra.inicio`.

### Task 3: estilos

- [x] `.barra` en tres zonas (`flex`, la izquierda y la derecha con `flex: 1 1 0` para centrar los pasos); `.segmentado` como píldora oscura; `.menu` desplegable con sombra.
- [x] Móvil (≤767 px): rejilla de dos filas; fila 1 estado + deshacer + Más + cuenta (la marca se oculta); fila 2 pasos + vista. `.barra__acciones` pasa a `display: contents` para que sus hijos entren en la rejilla. Segmentados compactos: a 320 px caben los dos y quedan unos 90 px para el estado de guardado.

### Task 4: cierre

- [x] `npm test` (1331), `npm run lint`, `npm run build`, `npm run e2e`.
- [x] `vista3d.spec.ts` "canvas con contenido" fallaba ya en `main` desde la PR #38: el build de e2e es de producción, lee `VITE_ANALITICA_SITIO` de `.env.production` y el tracker nuevo falla por CORS desde `localhost:5322`. Arreglado en `playwright.config.ts`: el `webServer` arranca con `VITE_ANALITICA_SITIO` vacío y la analítica no se carga en los e2e.
- [x] `CLAUDE.md` actualizado.

## Pendiente para la fase 2 (controles sobre el plano)

- Mover 2D/3D, zoom y Encuadrar a controles flotantes del lienzo; la barra se queda sin el segmentado de vista en `.barra__centro`.
- Pistas como una línea cerrable abajo del plano en vez del aside.
