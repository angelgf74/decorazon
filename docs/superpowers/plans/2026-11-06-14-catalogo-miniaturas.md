# Plan 14: catálogo con miniaturas (fase 2 de las mejoras)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que cada tarjeta del catálogo enseñe la huella del tipo (M-14), y que «Favoritos» y «Usados hace poco» vayan delante (M-15).

**Índice:** [plan 12](2026-11-06-12-mejoras-hoja-de-ruta.md); mejoras en [`docs/mejoras.md`](../../mejoras.md).

**Architecture:**
- La huella ya existe: `huellasEnPlanta(def, e)` y `def.zonasApertura(e)` (`nucleo/catalogo/elemento.ts`, `tipos.ts`) dependen de un `Elemento`, y `elementoNuevo(def, posicion, id)` da uno con las medidas, variantes y colores por defecto. La miniatura es ese elemento en (0, 0) con giro 0 (frente hacia abajo, como en el plano).
- `Pieza`, el componente privado de `lienzo/capas/CapaElementos.tsx` que pinta huellas y aperturas, se extrae a `lienzo/capas/Pieza.tsx` y lo usan el plano y la miniatura. Así lo que se ve en la tarjeta es lo que se verá en el plano.
- `paneles/MiniaturaDeTipo.tsx`: `<svg aria-hidden>` con `viewBox` = caja de huellas ∪ aperturas + margen, `vector-effect: non-scaling-stroke` en los trazos, y un `Map` a nivel de módulo por `def.id` (las medidas por defecto no cambian).
- Favoritos y recientes en `localStorage` (`decorazon.catalogo.favoritos`, `decorazon.catalogo.recientes`, máximo 6), siempre con `try/catch`; dos grupos nuevos delante de los demás, con chip, solo si tienen algo. La estrella es un `<button>` hermano de la tarjeta dentro del `<li>` (un botón dentro de otro no es válido), en una esquina.

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), Playwright.

## Global Constraints

- No cambian: el nombre accesible de cada tarjeta («Armario 100 × 60 cm»), las regiones de grupo que buscan los e2e («Para tu cocina», «Decoración», «Otros muebles»), las clases `.panel-catalogo__tipo` y `.panel-catalogo__asa`, el arrastre táctil por el asa.
- Textos nuevos en `web/src/textos.ts`. Sin dependencias nuevas. La miniatura no repinta el catálogo en cada render: se memoriza.
- Verde al cerrar: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.

## Tasks

### Task 1: tests (rojo)

- [x] `nucleo/catalogo/integridad.test.ts`: para todo tipo de `catalogoBase`, el elemento por defecto en (0, 0) tiene al menos una huella con área > 0 y la caja (huellas ∪ aperturas) es finita.
- [x] `editor/paneles/MiniaturaDeTipo.test.tsx`: el `svg` lleva `aria-hidden`, un `viewBox` que contiene todos los puntos de las huellas y las aperturas, un `polygon` por huella y los de apertura con trazo discontinuo.
- [x] `editor/lienzo/capas/CapaElementos.test.tsx`: sigue pintando el halo del elegido y las aperturas (ahora vía `Pieza`).
- [x] `editor/paneles/PanelCatalogo.test.tsx`: cada tarjeta contiene un `svg`; pulsar la estrella de «Armario» crea el grupo «Favoritos» con esa tarjeta y marca `aria-pressed`; volver a pulsarla lo quita; añadir un tipo (pulsar la tarjeta) lo pone en «Usados hace poco», el más reciente primero y como mucho 6; con un `localStorage` que lanza, el catálogo se pinta igual y sin esos grupos; los chips incluyen los grupos nuevos solo cuando tienen algo; el buscador filtra también dentro de ellos.

### Task 2: código

- [x] `lienzo/capas/Pieza.tsx` exportado (`def`, `e`, `elegido?`); `CapaElementos.tsx` lo importa.
- [x] `paneles/MiniaturaDeTipo.tsx` con la caché por `def.id`.
- [x] `paneles/catalogoLocal.ts`: `leerFavoritos`, `alternarFavorito`, `leerRecientes`, `anotarReciente` (con `try/catch` y respaldo en memoria mientras dure la pestaña). `estado/elementos.ts` → `anadirTipo` llama a `anotarReciente`.
- [x] `PanelCatalogo.tsx`: grupos «Favoritos» y «Usados hace poco» delante de `todos`; estrella como botón hermano con `aria-pressed` y `aria-label` `textos.catalogo.marcarFavorito(nombre)`; tarjeta en columna: miniatura, nombre, medidas.
- [x] `textos.catalogo.favoritos`, `textos.catalogo.recientes`, `textos.catalogo.marcarFavorito`.

### Task 3: estilos

- [x] `editor.css`: `.panel-catalogo__miniatura` (alto fijo ~56 px, fondo `--crema-oscura`, radio), `.panel-catalogo__favorito` (esquina superior derecha de la tarjeta, 2.5 rem de objetivo táctil, no pisa el asa), relleno de huella con `--borde-suave` y trazo `--tinta`; en móvil (hoja) igual.

### Task 4: cierre

- [x] `npm test` (1384), `npm run lint`, `npm run build`, `npm run e2e` (10 de 10); capturas a 1440 (catálogo; favoritos y recientes delante) y 390 px (hoja del catálogo, con asa y estrella).
- [x] `CLAUDE.md`: `Pieza` compartida; claves nuevas de `localStorage`.
- [x] `mejoras.md`: M-14, M-15 → `realizada` (PR #44). Este plan con todo marcado.

## Decisiones al ejecutar (6 nov 2026)

- La huella de la miniatura conserva el color por defecto de su zona (atributo `fill` de `Pieza`) en vez del `--borde-suave` del plan: una regla CSS de `fill` pisaría el atributo y la tarjeta dejaría de parecerse al plano.
- `catalogoLocal` guarda en memoria solo lo que `localStorage` rechazó al escribir, y lo lee solo cuando tampoco se puede leer de él: así el respaldo nunca pisa el valor real cuando `localStorage` vuelve.
- Favoritos por nombre (como los demás grupos); recientes, el último primero.

## Revisión final (6 nov 2026)

Arreglado tras la revisión de la rama: con el almacenamiento lleno (`setItem` lanza y `getItem` no) la estrella no hacía nada (ahora el respaldo en memoria manda hasta que una escritura vuelve a entrar); con el chip «Favoritos» pulsado, quitar el último favorito dejaba el panel vacío (el chip elegido se deriva de los grupos que existen); añadir un mueble reordenaba «Usados hace poco» bajo el puntero y el segundo clic caía en otro (los recientes se congelan mientras el puntero está sobre el panel, `useRecientesQuietos`); quitar un favorito desde «Favoritos» mandaba el foco a `body` (pasa a la siguiente estrella del grupo, a la del mismo tipo en su grupo de siempre o al buscador); `MiniaturaDeTipo` va con `memo`.

## Pendiente

- Menores de la revisión: `estado/elementos.ts` importa de `paneles/catalogoLocal` (mejor en `persistencia/`); ids repetidos en el JSON darían claves duplicadas; `Pieza.tsx` depende de `lienzo.css` sin importarlo; en `editor.css` el `3.5rem` de la miniatura está dos veces, hay una regla muerta de la apertura, en escritorio la estrella tapa una esquina de la miniatura y el hover pisa el color de la estrella marcada; el comentario del asa en `iconos.ts` quedó sobre `estrella`.
- Los favoritos y recientes no se sincronizan entre pestañas abiertas (sin oyente de `storage`): cada pestaña lee al montar el catálogo. Tampoco se borran al cerrar sesión ni distinguen cuentas en el mismo navegador.
- Un tipo a la vez en favoritos y en su grupo de siempre aparece dos veces en el panel (a propósito: el grupo de siempre no cambia); en los e2e, `getByRole` por nombre solo es ambiguo tras añadir ese mismo tipo.
