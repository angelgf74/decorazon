# Plan 17: vista desde dentro (fase 5 de las mejoras)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ver la habitación en 3D como al entrar por la puerta (M-09) y decidir M-12 (materiales con textura).

**Índice:** [plan 12](2026-11-06-12-mejoras-hoja-de-ruta.md); mejoras en [`docs/mejoras.md`](../../mejoras.md).

**Architecture:**
- `camaraDesdeDentro(doc)` en `nucleo/modelo3d/camara.ts`: a 1,6 m de altura, 0,6 m dentro de la estancia desde el centro de la primera puerta (`hueco(planta, pared, posicion + ancho / 2)` da el punto en la pared y `n`, la normal interior); sin puerta, desde el centro de la pared 0. Mira hacia el centro de la estancia a 1 m de altura: el objetivo es el punto a 1 m de la cámara en esa dirección.
- `Escena3D` recibe `desdeDentro` (por defecto `false`: `Captura3D` y `Vista3DSoloVer` no cambian). Con él: `OrbitControls` sin zoom ni desplazamiento, distancia fija de 1 m (orbitar alrededor de un punto a un metro es girar la cabeza), ángulo polar más amplio (mirar al suelo y al techo) y `rotateSpeed` negativo (arrastrar a la derecha gira a la derecha, como una cámara en primera persona); las paredes nunca se ocultan. Al activarlo, la cámara va a `camaraDesdeDentro`; al desactivarlo, a `camaraInicial`; «Encuadrar» recoloca en el modo que esté. El efecto que hoy atiende `encuadres` pasa a atender también `desdeDentro`.
- `Vista3D`: botón «Desde dentro» (`aria-pressed`) en la barra junto a «Ocultar paredes delante», que queda desactivado mientras se está dentro.
- M-12: con las capturas 3D de los ejemplos (fase 4) y la captura desde dentro de este plan se decide en una línea. Si no hacen falta texturas ahora, M-12 pasa a `descartada` con el motivo (se puede reabrir).

**Tech Stack:** React 19, react-three-fiber + drei, Vitest (`@react-three/test-renderer`), Playwright.

## Global Constraints

- `Lienzo3D` va con `frameloop="demand"`: todo movimiento de cámara por código llama a `controles.update()` e `invalidate()`.
- Nada cambia en `Captura3D` ni en `Vista3DSoloVer` (la vista previa del enlace y la hoja para imprimir siguen desde la cámara inicial).
- Textos nuevos en `web/src/textos.ts`. Sin dependencias nuevas.
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.

## Tasks

### Task 1: tests (rojo)

- [x] `nucleo/modelo3d/modelo3d.test.ts`: `camaraDesdeDentro` con una puerta en la pared 0 (posición 159, ancho 82) de un salón de 400 × 330: cámara en (2, 1,6, 0,6) y objetivo a 1 m hacia el centro (más z, algo más bajo); con la puerta en la pared 2 (de abajo, derecha → izquierda) la cámara queda a 0,6 m por dentro de esa pared; sin puerta, desde el centro de la pared 0; la cámara siempre dentro de la planta.
- [x] `editor/vista3d/Escena3D.test.tsx`: con `desdeDentro` la cámara va a `camaraDesdeDentro` y el objetivo de los controles también; los controles llevan zoom y desplazamiento desactivados y distancia fija 1; con `ocultar` activo y `desdeDentro`, no se omite ninguna pared; al volver a `desdeDentro={false}` la cámara vuelve a `camaraInicial`; `encuadres` desde dentro recoloca en la puerta.
- [x] `editor/vista3d/Vista3D.test.tsx`: el botón «Desde dentro» alterna `aria-pressed` y, pulsado, «Ocultar paredes delante» queda desactivado.

### Task 2: código

- [x] `camara.ts`: `camaraDesdeDentro`; export en `modelo3d/index.ts`.
- [x] `Escena3D.tsx`: prop `desdeDentro`, colocación de la cámara y props de `OrbitControls` según el modo.
- [x] `Vista3D.tsx`: estado `dentro`, botón y `ocultar && !dentro`; `textos.vista3d.desdeDentro`.

### Task 3: cierre

- [x] `e2e/vista3d.spec.ts`: pulsar «Desde dentro», el lienzo sigue con contenido y sin errores de consola, y «Ocultar paredes delante» está desactivado; volver y comprobar que se reactiva.
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run e2e`; captura a 1440 desde dentro del dormitorio de ejemplo y a 390 px.
- [x] M-12: decisión en `mejoras.md` con el motivo.
- [x] `CLAUDE.md`: la vista desde dentro (cámara, controles, paredes) en una frase.
- [x] `mejoras.md`: M-09 → `realizada`; M-12 según la decisión. Este plan con todo marcado.

## Decisiones al ejecutar (6 nov 2026)

- M-12 descartada: con las capturas de los ejemplos y desde dentro (Chromium con SwiftShader; no se ha mirado en un portátil real) los materiales planos con sombras se leen bien; una textura procedimental añadiría shaders y coste en móvil. Se reabre si lo piden los usuarios.
- Primera versión con `rotateSpeed` negativo: la captura girada enseñó que invertía el giro (con el objetivo delante, el sentido por defecto de OrbitControls ya es el de girar la cabeza). Queda positivo y más lento (0,5).

## Pendiente

- Desde dentro no se anda: la cámara está fija en la puerta y solo gira (el plan lo pedía así).
- La altura de los ojos (1,6 m) y la entrada (0,6 m) son fijas; en una estancia muy pequeña o con la puerta junto a un mueble, la cámara puede quedar dentro de él.
