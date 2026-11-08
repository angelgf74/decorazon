# Plan 27: captura 3D con sombras suaves y más resolución

> Ejecución inline con TDD. Un PR (`feature/captura-suave`), tras el plan 26. Solo cambia `Captura3D` (Descargar imagen 3D, hoja para imprimir, vista previa); la vista interactiva sigue igual.

**Goal:** que «Descargar imagen 3D» y la hoja salgan a 2400 × 1600 con antialias y sombras suaves acumuladas; al final, regenerar las imágenes de ejemplo, la de redes y las de «Cómo funciona» con los redondeos del plan 26.

**Architecture:** `SombrasSuaves` (`AccumulativeShadows` + `RandomizedLight` de drei, 24 pasos horneados antes del primer fotograma, `memo` por valor) montado por `Escena3D` con `sombras="suaves"`; en ese modo el suelo no recibe la sombra dura. `Captura3D` acepta `dpr` (1 | 2) y lo sube en el fotograma `FOTOGRAMAS − 2` para que solo los dos últimos sean caros; `gl.antialias` explícito.

## Tareas

- [x] 1. `SombrasSuaves.tsx` + test (posición, escala, pasos sin temporal, luces desde el sol, `memo`).
- [x] 2. `Escena3D` prop `sombras`, `Estancia3D` prop `sueloConSombra`; `Escena3D.sombras.test.tsx`.
- [x] 3. `Captura3D` con `dpr` escalonado, `antialias` y `sombras="suaves"`; `CapturaFueraDePantalla` pasa `dpr={2}`; tests.
- [x] 4. Medir: build y presupuesto, e2e (hoja ≤ 20 s), tiempo de la captura en SwiftShader; afinar `frames`/`amount`; mirar salón y dormitorio.
- [ ] 5. Cierre (con el plan 26 en `main`): regenerar `public/ejemplos/*.png` (reducidos a 1200 × 800), `npm run imagen-redes`, `public/capturas/*.webp`; `CLAUDE.md`; PR.

## Hallazgos (tarea 4)

- El plano de `AccumulativeShadows` es un cuadrado mayor que la estancia: las sombras caían fuera, sobre el fondo transparente. El receptor pasa a ser la planta (`geometriaReceptor`, uv normalizadas; el horneado desenvuelve por uv) y se rehornea desde un `useEffect` del hijo `Receptor` (la ref del mesh de drei no existe en los layout effects de los hijos).
- Con un receptor del tamaño de la estancia el mapa salía vacío (suelo negro): three descartaba el mesh por *frustum culling* en la pasada de horneado, aunque esa pasada ignora la posición. `frustumCulled = false` en el receptor. El plano de drei solo se libraba por ser enorme.
- Medido en SwiftShader (el CI): captura completa a dpr 2 en 4,3–5,3 s (tope 8 s); PNG de 490–625 kB. El fragmento 3D queda en 1028 kB (tope 1170).
