# Plan 16: ejemplos y primer uso (fase 4 de las mejoras)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tres diseños de ejemplo en el inicio que se abren como copia (M-30), una guía de tres pasos la primera vez (M-32) y cerrar M-18 (cambiar el tipo de estancia sin sorpresas).

**Índice:** [plan 12](2026-11-06-12-mejoras-hoja-de-ruta.md); mejoras en [`docs/mejoras.md`](../../mejoras.md).

**Architecture:**
- Ejemplos: `web/src/ejemplos/{dormitorio,salon,cocina}.json`, hechos en el editor (puerta, ventana, al menos cinco muebles, sin solapes ni «no abre»; un paso estrecho se tolera si es real), y `ejemplos/index.ts` con nombre, tipo, documento e imagen. Las imágenes (`web/public/ejemplos/*.png`, vista 3D) se generan una vez con el script de capturas y se revisan a ojo. Un test vigila que cada ejemplo valida y no tiene conflictos.
- Inicio: sección «Empieza con un ejemplo» con tres tarjetas (imagen, nombre, tipo, «Abrir una copia») y el flujo de copia de la vista compartida: `sustituiriaDisenoAnonimo()` → `Confirmar` → `empezarAnonimoCon(doc)` → `/disenar`. Con sesión, además «Guardar en mi cuenta» (`crearDiseno`).
- Guía: `editor/GuiaInicial.tsx`, tres pasos (plano y esquinas, catálogo o «2 Amueblar», girar con el círculo) como tarjeta fija abajo-centro con «1 de 3», «Siguiente» y «Saltar», y un anillo `.guia__objetivo` sobre el objetivo de cada paso (`.lienzo__svg`, el botón «2 Amueblar», `.lienzo__controles`). Marca `localStorage` `decorazon.guia = 'vista'`. Mientras está activa se oculta la píldora de pistas. Escape la salta. No se enseña al abrir un diseño del servidor ni la copia de un ejemplo o de un enlace (ya hay cosas que ver): solo en un diseño anónimo recién creado.
- M-18: test de que cambiar el tipo con muebles los conserva y el catálogo reordena sus grupos; si pasa, se cierra con una nota en `mejoras.md`.

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), Playwright.

## Global Constraints

- Los ejemplos son documentos reales con `formato: 1`; pasan `validarDocumento` y se cargan por el mismo camino que un diseño cualquiera (nada especial en el editor).
- Textos nuevos en `web/src/textos.ts`. Sin dependencias nuevas. La guía no bloquea el editor (se puede seguir usando con ella abierta) y no sale en los e2e existentes: el `localStorage` de los e2e empieza con la marca puesta, salvo en el spec que la prueba.
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.

## Tasks

### Task 1: tests (rojo)

- [ ] `ejemplos/ejemplos.test.ts`: cada ejemplo pasa `validarDocumento`, `detectarConflictos` no da solapes ni «no abre», tiene puerta, ventana y ≥ 5 elementos, y su imagen existe en `web/public/ejemplos`.
- [ ] `paginas/Inicio.test.tsx`: tres tarjetas con nombre y tipo; «Abrir una copia» sin diseño anónimo abre `/disenar` con ese documento; con diseño anónimo pregunta y «Cancelar» no cambia nada; con sesión aparece «Guardar en mi cuenta» y llama a `crearDiseno`.
- [ ] `editor/GuiaInicial.test.tsx`: sin marca y con diseño anónimo nuevo se enseña «1 de 3»; «Siguiente» avanza y el anillo cambia de objetivo; «Saltar» y Escape la cierran y ponen la marca; con marca no se enseña; con un diseño del servidor no se enseña; con `localStorage` que lanza, se enseña una vez y no rompe.
- [ ] `editor/Editor.test.tsx`: con la guía abierta no hay píldora de pistas.
- [ ] M-18: `editor/paneles/PanelEstancia.test.tsx` + `PanelCatalogo.test.tsx`: cambiar el tipo de dormitorio a despacho conserva los muebles y «Para tu despacho» pasa a ser el primer grupo.

### Task 2: código

- [ ] Los tres ejemplos (hechos en el editor y exportados; si la fase 3 ya está, con «Descargar diseño») y `ejemplos/index.ts`.
- [ ] `Inicio.tsx` + `inicio.css`: sección de ejemplos; textos `inicio.ejemplos`, `inicio.abrirCopia`, `inicio.guardarEnCuenta`.
- [ ] `editor/GuiaInicial.tsx` + estilos en `editor.css` (`.guia`, `.guia__objetivo` con `outline` y `box-shadow` grandes, `position: fixed` calculado con `getBoundingClientRect` y recalculado en `resize`); `Editor.tsx` la monta cuando toca; `textos.guia.*`.
- [ ] `PestanasDeHojas` en móvil: el paso 2 señala la pestaña «Catálogo» en vez de «2 Amueblar» si es más claro.

### Task 3: e2e y cierre

- [ ] e2e nuevo `ejemplos.spec.ts`: abrir una copia del dormitorio desde el inicio, ver muebles en el plano, pasar a 3D; `guia.spec.ts` (o dentro del anterior): sin marca aparece la guía, «Saltar» y no vuelve al recargar. Los specs existentes ponen la marca en `localStorage` antes de navegar (helper en `e2e/`).
- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run e2e`; capturas a 1440 (inicio con ejemplos, guía paso 1) y 390 px.
- [ ] `CLAUDE.md`: dónde viven los ejemplos y cómo regenerar sus imágenes; la marca de la guía y por qué los e2e la ponen.
- [ ] `mejoras.md`: M-30, M-32 → `realizada`; M-18 → `realizada` o `descartada` con lo que diga el test. Este plan con todo marcado.

## Pendiente

- (se rellena al cerrar)
