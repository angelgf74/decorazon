# Plan 1: núcleo del editor (modelo, geometría y conflictos)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biblioteca TypeScript pura, con tests, que define el documento de diseño, lo valida y detecta los conflictos de fidelidad (no cabe, se solapa, no abre, tapa, paso estrecho) con mensajes concretos.

**Architecture:** Proyecto `web/` (Vite + React + TypeScript), aunque este plan solo toca lógica sin interfaz bajo `web/src/nucleo/`. Capas: `modelo` (tipos y validación del documento) → `geometria` (polígonos convexos, SAT, prismas) → `catalogo` (definiciones paramétricas: volúmenes y zonas de apertura) → `conflictos` (obstáculos de la estancia y detección). Nada de esto importa React ni Three.js; los planes 3 y 4 lo consumen.

**Tech Stack:** Node 24, npm, Vite (plantilla `react-ts`, versión estable actual), TypeScript en modo `strict`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-24-decorazon-design.md` (§4.3, §4.4, §4.5, §6.1, §6.2, §8).

**Planes siguientes (fuera de este):** 2 API · 3 editor 2D y catálogo completo · 4 vista 3D · 5 front↔API, sincronización y PWA · 6 despliegue con `srv`.

## Global Constraints

- Medidas en **centímetros enteros**; rotaciones en **grados enteros** (§4.5).
- Tolerancia geométrica única: `TOLERANCIA_CM = 0.1` (1 mm). Separación ≤ 1 mm no es conflicto; solape > 1 mm sí. Ante la duda, conflicto (§4.5).
- Cifras de los mensajes de conflicto: `cantidadMostrada(p) = redondearArriba(p - TOLERANCIA_CM)`, al centímetro hacia arriba descontando la tolerancia, para que la holgura de los sectores circunscritos (< 1 mm) no sume un centímetro; todo conflicto muestra ≥ 1 cm. El ancho de un paso estrecho se muestra redondeado **hacia abajo** (mostrar menos paso del real es lo conservador).
- Mensaje de referencia, literal: `La puerta del armario choca con la cama: faltan 12 cm` (§4.5).
- Conflictos **informan, no bloquean**; el paso estrecho es `aviso`, el resto `error`.
- Formato del documento: `formato: 1` (§6.1). Elementos con `origen: { tipo: 'generico' }` (§6.3).
- Nombres en español (tipos, funciones, ficheros); TypeScript `strict`; sin `any`.
- Coordenadas del plano: x a la derecha, **y hacia abajo** (como SVG); rotación en grados, positiva en sentido **horario en pantalla**. Planta en sentido horario en pantalla (área de la fórmula del lazo **positiva** con y hacia abajo). Normal interior de una pared de `a` a `b` con dirección unitaria `d`: `(-d.y, d.x)`.
- Sistema local de un elemento: `posicion` es el centro de su huella; ancho sobre el eje x local, fondo sobre el y local; **el frente mira hacia +y local** (la trasera en `y = -fondo/2`).

## Review Focus

1. Elemento girado 90° pegado a una pared: el ruido de coma flotante (`cos 90° ≈ 6e-17`) no debe producir un conflicto falso → test en Task 3 y Task 7.
2. Estancia en L: la esquina entrante (vértice reflejo) que se mete en un mueble con todos sus vértices dentro de la planta → test en Task 6.
3. Mueble girado 45° cuya esquina atraviesa la pared por menos de 1 mm (no conflicto) y por más (conflicto) → test en Task 7.
4. Documento corrupto o manipulado (medidas negativas, planta que se cruza, `formato` desconocido, ids repetidos, pared fuera de rango) → `validarDocumento` devuelve errores, nunca lanza → test en Task 2.
5. Barrido de una puerta cubierto solo en parte por un mueble girado → `faltan` refleja la penetración real → test en Task 7.

---

## Estructura de ficheros

```
web/
  package.json, vite.config.ts, tsconfig*.json      (plantilla Vite react-ts + Vitest)
  src/nucleo/
    modelo/documento.ts        tipos del documento + FORMATO_ACTUAL
    modelo/crear.ts            documentoNuevo()
    modelo/validar.ts          validarDocumento()
    geometria/tolerancia.ts    TOLERANCIA_CM, redondeos
    geometria/vector.ts        Punto y operaciones
    geometria/poligono.ts      área, simple, punto dentro, distancias
    geometria/convexo.ts       SAT: penetración y distancia entre convexos
    geometria/formas.ts        rectángulo orientado, sector circunscrito
    geometria/prisma.ts        Prisma (huella convexa + z) y solape 3D
    catalogo/tipos.ts          DefinicionTipo, Catalogo, helpers de nombre
    catalogo/transformar.ts    local → mundo para un Elemento
    catalogo/definiciones/{cama,armario,comoda,alfombra}.ts
    catalogo/catalogoBase.ts   Map con las cuatro definiciones
    conflictos/tipos.ts        Conflicto, TipoConflicto
    conflictos/estancia.ts     obstáculos y zonas derivados de la estancia
    conflictos/mensajes.ts     textos
    conflictos/detectar.ts     detectarConflictos()
```
Los tests van junto al fichero (`*.test.ts`).

---

### Task 1: Proyecto `web/` con Vitest

**Files:**
- Create: `web/` (plantilla `npm create vite@latest web -- --template react-ts`)
- Modify: `web/package.json` (scripts `test`, `test:watch`), `web/vite.config.ts` (bloque `test` con `environment: 'node'`, `include: ['src/**/*.test.ts']`)
- Modify: `.gitignore` (añadir `node_modules/`, `web/dist/`)
- Create: `web/src/nucleo/geometria/tolerancia.ts`, `web/src/nucleo/geometria/tolerancia.test.ts`

**Interfaces:**
- Produces: `TOLERANCIA_CM: number` (= 0.1); `redondearArriba(cm: number): number` (= `Math.ceil(cm - 1e-6)`); `redondearAbajo(cm: number): number` (= `Math.floor(cm + 1e-6)`); `cantidadMostrada(penetracion: number): number` (= `redondearArriba(penetracion - TOLERANCIA_CM)`).

- [ ] **Step 1:** Crear la plantilla, `npm install`, `npm install -D vitest`, y comprobar que `tsconfig.app.json` tiene `"strict": true`.
- [ ] **Step 2: Test que falla** (`tolerancia.test.ts`):

```ts
expect(TOLERANCIA_CM).toBe(0.1)
expect(redondearArriba(12)).toBe(12)
expect(redondearArriba(12.0000001)).toBe(12)
expect(redondearArriba(11.2)).toBe(12)
expect(redondearAbajo(44.9999999)).toBe(45)
expect(redondearAbajo(45.7)).toBe(45)
expect(cantidadMostrada(12.03)).toBe(12)
expect(cantidadMostrada(11.2)).toBe(12)
expect(cantidadMostrada(0.15)).toBe(1)
```

- [ ] **Step 3:** `cd web && npm test` → FAIL (módulo inexistente).
- [ ] **Step 4:** Implementar `tolerancia.ts`.
- [ ] **Step 5:** `npm test` → PASS. `npm run build` → sin errores.
- [ ] **Step 6:** Commit `feat(web): proyecto Vite + Vitest y tolerancias geométricas`.

---

### Task 2: Modelo del documento, creación y validación

**Files:**
- Create: `web/src/nucleo/modelo/documento.ts`, `crear.ts`, `validar.ts`, `validar.test.ts`, `crear.test.ts`

**Interfaces:**
- Produces (`documento.ts`):

```ts
export const FORMATO_ACTUAL = 1
export type TipoEstancia = 'dormitorio' | 'salon' | 'cocina'
export interface Punto { x: number; y: number }            // reexportado desde geometria/vector en Task 3
export interface Estancia { tipo: TipoEstancia; alto: number; grosorPared: number; planta: Punto[]; colorParedes: string; colorSuelo: string }
export interface Puerta  { id: string; tipo: 'puerta';  pared: number; posicion: number; ancho: number; alto: number; hoja: 'abatible' | 'corredera'; bisagra: 'izquierda' | 'derecha'; abreHacia: 'dentro' | 'fuera' }
export interface Ventana { id: string; tipo: 'ventana'; pared: number; posicion: number; ancho: number; alto: number; alturaSuelo: number; abreHaciaDentro: boolean }
export type Abertura = Puerta | Ventana
export interface Columna  { id: string; tipo: 'columna';  centro: Punto; ancho: number; fondo: number; rotacion: number }
export interface Viga     { id: string; tipo: 'viga';     desde: Punto; hasta: Punto; ancho: number; canto: number }
export interface Radiador { id: string; tipo: 'radiador'; pared: number; posicion: number; ancho: number; alto: number; fondo: number; alturaSuelo: number }
export type Estructura = Columna | Viga | Radiador
export interface Medidas { ancho: number; fondo: number; alto: number }
export type Origen = { tipo: 'generico' }
export interface Elemento { id: string; tipo: string; posicion: Punto; rotacion: number; medidas: Medidas; alturaSuelo: number; variantes: Record<string, string | number | boolean>; colores: Record<string, string>; origen: Origen }
export interface DocumentoDiseno { formato: 1; estancia: Estancia; aberturas: Abertura[]; estructura: Estructura[]; elementos: Elemento[] }
```

`pared` es el índice del tramo `planta[i] → planta[(i+1) % n]`; `posicion` son los cm desde `planta[i]` hasta el borde cercano del hueco. `bisagra` se mira desde dentro de la estancia.

- Produces (`crear.ts`): `documentoNuevo(tipo: TipoEstancia, ancho: number, largo: number, alto: number): DocumentoDiseno`. Planta `[(0,0),(ancho,0),(ancho,largo),(0,largo)]`, `grosorPared: 10`, `colorParedes: '#f4f1ea'`, `colorSuelo: '#c8a77e'`, listas vacías.
- Produces (`validar.ts`): `type ResultadoValidacion = { valido: true; documento: DocumentoDiseno } | { valido: false; errores: string[] }` y `validarDocumento(dato: unknown): ResultadoValidacion`. **Nunca lanza.** Comprueba la forma de cada campo y además: `formato === 1`; planta de ≥ 3 vértices, simple y con área positiva (usa `esSimple` y `areaConSigno` de Task 3, así que esta comprobación se añade en el Step 6 tras Task 3); medidas y alturas enteras y > 0 (`alturaSuelo` ≥ 0); rotaciones enteras; `pared` dentro de rango y `posicion + ancho` ≤ longitud de esa pared; ids únicos en todo el documento. Los mensajes de error indican la ruta (`elementos[2].medidas.ancho: debe ser un entero mayor que 0`).

- [ ] **Step 1: Tests que fallan.** `crear.test.ts`: `documentoNuevo('dormitorio', 400, 330, 250)` tiene 4 vértices en ese orden, `alto` 250 y pasa `validarDocumento`. `validar.test.ts`, un caso por regla:
  - `validarDocumento(null)` → `{ valido: false }`, sin lanzar;
  - `formato: 2` → error que contiene `formato`;
  - `medidas.ancho: -5` y `ancho: 10.5` → error con la ruta `elementos[0].medidas.ancho`;
  - dos elementos con el mismo id → error que contiene `id repetido`;
  - puerta con `pared: 7` en una planta de 4 → error;
  - puerta con `posicion + ancho` mayor que la pared → error;
  - documento correcto con una de cada abertura, estructura y elemento → `valido: true`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar `documento.ts`, `crear.ts` y `validar.ts` (validación a mano, sin bibliotecas).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(nucleo): documento de diseño, creación y validación`.
- [ ] **Step 6 (tras Task 3):** Añadir la comprobación de planta simple y en sentido horario, y los tests "planta en pajarita → error que contiene `planta`" y "planta en sentido antihorario → error". Commit `feat(nucleo): validar forma de la planta`.

---

### Task 3: Geometría 2D (vectores, polígonos, convexos)

**Files:**
- Create: `geometria/vector.ts`, `geometria/poligono.ts`, `geometria/convexo.ts`, `geometria/formas.ts` y sus `*.test.ts`

**Interfaces:**
- Produces (`vector.ts`): `Punto` (se mueve aquí; `documento.ts` lo reexporta), `sumar`, `restar`, `escalar(p, k)`, `punto(a, b)` (producto escalar), `cruz(a, b)`, `longitud`, `normalizar`, `rotar(p: Punto, grados: number): Punto` (horario en pantalla con y hacia abajo: `x' = x·cos − y·sin`, `y' = x·sin + y·cos`).
- Produces (`poligono.ts`): `areaConSigno(p: Punto[]): number`, `esSimple(p: Punto[]): boolean`, `contienePunto(p: Punto[], q: Punto): boolean` (borde cuenta como dentro), `distanciaPuntoSegmento(q, a, b): number`, `distanciaAlBorde(p: Punto[], q: Punto): number`, `distanciaSegmentos(a1, a2, b1, b2): number`.
- Produces (`convexo.ts`): `penetracion(a: Punto[], b: Punto[]): number`: profundidad mínima de solape por SAT entre dos convexos (≤ 0 si están separados o se tocan); `distanciaConvexos(a: Punto[], b: Punto[]): number`: 0 si se solapan o tocan, si no la distancia mínima entre bordes.
- Produces (`formas.ts`): `rectangulo(centro: Punto, ancho: number, fondo: number, rotacion: number): Punto[]` (4 vértices en sentido horario); `sectorCircunscrito(centro: Punto, radio: number, desdeGrados: number, hastaGrados: number, segmentos = 16): Punto[]` (convexo: el centro más los vértices en los ángulos `desde, desde+paso, …, hasta`, todos a distancia `radio / cos(paso/2)`, de modo que cada arista es tangente al arco y el polígono contiene el sector real: "ante la duda, conflicto"; con 16 segmentos en 90° sobra < 0,04 cm por cada 50 cm de radio).

- [ ] **Step 1: Tests que fallan:**
  - `areaConSigno` del rectángulo 400×330 de Task 2 = `132000`;
  - `esSimple` falso para una pajarita y verdadero para una L de 6 vértices;
  - `contienePunto` verdadero en el borde;
  - `penetracion` de dos cuadrados 100×100 desplazados 88 en x = `12`; separados 5 → `≤ 0`; tocándose → `≤ TOLERANCIA_CM`;
  - `penetracion` de `rectangulo(c, 100, 60, 90)` contra otro pegado → `≤ TOLERANCIA_CM` (Review Focus 1);
  - `distanciaConvexos` de cuadrados separados 45 = `45` (±1e-9);
  - `sectorCircunscrito(o, 50, 0, 90)` contiene todos los puntos del arco real (muestrear 100) y ningún vértice está a más de `50 + TOLERANCIA_CM` del centro.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar. SAT: ejes = normales de las aristas de ambos polígonos; penetración = mínimo del solape de proyecciones sobre todos los ejes.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(nucleo): geometría 2D`. Después, el Step 6 de Task 2.

---

### Task 4: Prismas y solape 3D

**Files:**
- Create: `geometria/prisma.ts`, `geometria/prisma.test.ts`

**Interfaces:**
- Produces: `interface Prisma { huella: Punto[]; zMin: number; zMax: number }` (huella convexa); `solapeZ(a: Prisma, b: Prisma): number` (= `min(zMax) − max(zMin)`); `penetracion3D(a: Prisma, b: Prisma): number` (= `min(penetracion(huellas), solapeZ)`; ≤ `TOLERANCIA_CM` significa que no chocan).

- [ ] **Step 1: Tests que fallan:** módulo alto (z 140–210) sobre módulo bajo (z 0–85) con la misma huella → `penetracion3D ≤ 0`; armario z 0–240 contra viga z 230–250 con huellas solapadas 30 → `10`; huellas separadas → `≤ 0` aunque se solape z.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(nucleo): prismas y solape 3D`.

---

### Task 5: Catálogo: interfaz y cuatro tipos de prueba

El catálogo completo de §6.2 y los generadores 3D son del plan 3/4. Aquí solo la interfaz geométrica y los tipos que necesitan los casos obligatorios de §8.

**Files:**
- Create: `catalogo/tipos.ts`, `catalogo/transformar.ts`, `catalogo/definiciones/cama.ts`, `armario.ts`, `comoda.ts`, `alfombra.ts`, `catalogo/catalogoBase.ts` y los `*.test.ts` de cada definición

**Interfaces:**
- Produces (`tipos.ts`):

```ts
export interface Rango { min: number; max: number; defecto: number }
export interface DefinicionVariante { clave: string; etiqueta: string; valores: (string | number | boolean)[]; defecto: string | number | boolean }
export interface ZonaColor { clave: string; etiqueta: string; material: 'tela' | 'madera' | 'lacado' | 'metal' | 'vidrio' | 'ceramica'; defecto: string }
export interface ZonaApertura extends Prisma { nombre: string }   // 'la puerta', 'el cajón'
export interface DefinicionTipo {
  id: string; nombre: string; genero: 'm' | 'f'; estancias: TipoEstancia[]
  medidas: { ancho: Rango; fondo: Rango; alto: Rango }; alturaSuelo: number
  variantes: DefinicionVariante[]; zonasColor: ZonaColor[]
  pisable: boolean        // alfombra: no choca con muebles
  bloqueaPaso: boolean    // cuenta para el paso estrecho
  sobreVentana: boolean   // cortina: no "tapa" ventanas
  volumenes(e: Elemento): Prisma[]          // en coordenadas del mundo
  zonasApertura(e: Elemento): ZonaApertura[]
}
export type Catalogo = ReadonlyMap<string, DefinicionTipo>
export function conArticulo(nombre: string, genero: 'm' | 'f'): string   // 'el armario', 'la cama'
export function deArticulo(nombre: string, genero: 'm' | 'f'): string    // 'del armario', 'de la cómoda'
export function capitalizar(texto: string): string
```

- Produces (`transformar.ts`): `aMundo(e: Elemento, local: Punto): Punto`; `cajaMundo(e: Elemento, x0, y0, x1, y1, zMin, zMax): Prisma`. La caja está en coordenadas locales relativas al centro; z es relativa a `e.alturaSuelo`.
- Produces: `catalogoBase: Catalogo` con `cama`, `armario`, `comoda`, `alfombra`.

Valores (decisiones de este plan, coherentes con §6.2):

| id | nombre / género | ancho · fondo · alto (defecto, min–max) | variantes | volúmenes | aperturas |
|---|---|---|---|---|---|
| `cama` | cama / f | 150 (80–220) · 200 (180–220) · 45 (20–70) | `cabecero`: true/false (true) | caja base; si `cabecero`, franja trasera de fondo 6 y alto 100 | ninguna |
| `armario` | armario / m | 100 (40–400) · 60 (35–70) · 220 (60–260) | `puertas`: 'abatibles'/'correderas'; `modulos`: 1–4 (1) | caja | abatibles: `2·modulos` puertas de ancho `ancho/(2·modulos)`; puerta k con bisagra a la izquierda si k es par y a la derecha si es impar; cada una es un `sectorCircunscrito` de radio igual a su ancho, de 90° hacia el frente, con z en toda la altura y `nombre: 'la puerta'`. Correderas: ninguna |
| `comoda` | cómoda / f | 100 (40–200) · 50 (35–60) · 85 (50–130) | `cajones`: 3–6 (4) | caja | un rectángulo delante del frente, de fondo `fondo − 5`, con z en toda la altura y `nombre: 'el cajón'` |
| `alfombra` | alfombra / f | 200 (60–400) · 140 (40–400) · 1 (1–3) | — | caja | ninguna; `pisable: true`, `bloqueaPaso: false` |

Los cuatro tienen `alturaSuelo: 0`, `sobreVentana: false` y `bloqueaPaso: true` (salvo la alfombra).

- [ ] **Step 1: Tests que fallan:**
  - `conArticulo('armario','m')` = `'el armario'` y `deArticulo('cómoda','f')` = `'de la cómoda'`;
  - armario en (100,100), rotación 0, 2 puertas → 2 zonas de radio 50 que quedan en `y ≥ 130` (delante) y cubren x 50–150;
  - el mismo armario rotado 90° → zonas en `x ≤ 70`;
  - correderas → 0 zonas;
  - cómoda de fondo 50 → zona de 45 de fondo pegada al frente;
  - cama con cabecero → 2 volúmenes, y el más alto con `zMax = 100`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(nucleo): interfaz del catálogo y tipos cama, armario, cómoda y alfombra`.

---

### Task 6: Obstáculos y zonas de la estancia

**Files:**
- Create: `conflictos/estancia.ts`, `conflictos/estancia.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces:

```ts
export interface Obstaculo { id: string; nombre: string; genero: 'm' | 'f'; prisma: Prisma }   // nombre sin artículo: 'columna'
export interface ObstaculosEstancia {
  fisicos: Obstaculo[]          // columnas (z 0–alto), vigas (z alto−canto … alto), radiadores (su caja)
  protegidos: Obstaculo[]       // ventana: franja de 10 cm hacia dentro, z de la ventana; radiador: franja de 10 cm delante de su caja, z del radiador
  aperturas: (ZonaApertura & { id: string })[]   // puertas y ventanas de la estancia (ver abajo)
}
export function obstaculosDeEstancia(doc: DocumentoDiseno): ObstaculosEstancia
export function penetracionEnParedes(planta: Punto[], huella: Punto[]): number
```

- Puertas: siempre una franja del hueco (ancho × 10 cm hacia dentro, z 0–alto). Si son `abatible` y abren hacia dentro, además un `sectorCircunscrito` de radio `ancho`, con el giro en la jamba de la `bisagra`. `nombre: 'la puerta'`.
- Ventanas con `abreHaciaDentro`: un rectángulo de ancho × `ancho/2` hacia dentro, con la z de la ventana (dos hojas). `nombre: 'la ventana'`.
- `penetracionEnParedes`: devuelve cuánto se sale una huella convexa de la planta (0 si está dentro con tolerancia). Es el máximo de (a) la distancia al borde de cada vértice de la huella que cae fuera de la planta y (b) la distancia al borde de la huella de cada vértice de la planta que cae estrictamente dentro de la huella (esquinas entrantes de una L). Con eso basta para dos polígonos simples cuando la huella es convexa.

- [ ] **Step 1: Tests que fallan:**
  - rectángulo 400×330 con una puerta abatible hacia dentro en la pared 0, posición 20, ancho 80, bisagra izquierda → 2 zonas de apertura, y el sector cubre el punto (25, 75);
  - puerta corredera → 1 zona (la franja);
  - viga de (0,150) a (400,150), ancho 20, canto 20, alto 250 → prisma z 230–250;
  - `penetracionEnParedes`: caja dentro → 0; caja que sale 7 cm por la pared derecha → 7;
  - **L** `[(0,0),(400,0),(400,200),(200,200),(200,400),(0,400)]` con una caja de 100×100 centrada en (230,230), con todos sus vértices dentro o casi pero la esquina (200,200) dentro de la huella → resultado > 0 (Review Focus 2).
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(nucleo): obstáculos y zonas de apertura de la estancia`.

---

### Task 7: Detección de conflictos y mensajes

**Files:**
- Create: `conflictos/tipos.ts`, `conflictos/mensajes.ts`, `conflictos/detectar.ts`, `conflictos/detectar.test.ts`, `web/src/nucleo/index.ts` (reexporta la API pública: modelo, `catalogoBase`, `detectarConflictos`, tipos)

**Interfaces:**
- Produces:

```ts
export type TipoConflicto = 'fueraDeEstancia' | 'solape' | 'techo' | 'viga' | 'apertura' | 'tapaVentana' | 'tapaRadiador' | 'pasoEstrecho'
export interface Conflicto { tipo: TipoConflicto; gravedad: 'error' | 'aviso'; ids: string[]; cantidadCm: number; mensaje: string }
export function detectarConflictos(doc: DocumentoDiseno, catalogo: Catalogo): Conflicto[]
```

`ids[0]` es el elemento al que se le atribuye el conflicto (el que abre, el que se sale, el que tapa). Un elemento cuyo `tipo` no está en el catálogo se ignora.

Reglas y mensajes (literales; N = `cantidadMostrada` de la penetración o del solape en z, P = `redondearAbajo`; `A` y `B` con artículo vía `conArticulo`):

| tipo | cuándo | mensaje |
|---|---|---|
| `fueraDeEstancia` | `penetracionEnParedes` de cada volumen > tolerancia | `{A} atraviesa la pared: sobran N cm` |
| `solape` | `penetracion3D` > tolerancia entre dos elementos no pisables, o entre un elemento y un obstáculo físico que no sea viga (una vez por par) | `{A} y {B} se solapan N cm` |
| `techo` | zMax de algún volumen > `estancia.alto` + tolerancia | `{A} no cabe bajo el techo: sobran N cm` |
| `viga` | `penetracion3D` con una viga > tolerancia; N = `solapeZ` | `{A} no cabe bajo la viga: sobran N cm` |
| `apertura` (mueble) | una zona de A contra un volumen de B (B ≠ A, no pisable), contra un obstáculo físico, o fuera de la planta | `{Zona} {deA} choca con {B}: faltan N cm` (B = `la pared` si se sale de la planta) |
| `apertura` (estancia) | una zona de una puerta o ventana contra un volumen de un elemento no pisable | `{Zona} choca con {B}: faltan N cm` |
| `tapaVentana` | volumen de un elemento sin `sobreVentana` contra la zona protegida de una ventana | `{A} tapa la ventana` |
| `tapaRadiador` | volumen contra la zona protegida de un radiador | `{A} tapa el radiador` |
| `pasoEstrecho` (aviso) | distancia en planta entre dos elementos con `bloqueaPaso`, o entre uno y la pared o una columna, con `20 ≤ d < 60` | `Paso estrecho entre {A} y {B}: P cm` |

`{Zona}` = `capitalizar(zona.nombre)`. Los huecos < 20 cm no se avisan porque no se usan como paso (**decisión de este plan**). Los umbrales 20/60 van como constantes exportadas `PASO_MINIMO_CM = 60` y `HUECO_IGNORADO_CM = 20`. Las aperturas entre sí (dos puertas que se cruzan) no se comprueban en v1. La distancia a la pared es `distanciaAlBorde` mínima de los vértices de la huella y de los vértices de la planta a la huella.

- [ ] **Step 1: Tests que fallan.** Estancia base: `documentoNuevo('dormitorio', 400, 330, 250)`, con elementos creados por un helper de test `elemento(tipo, x, y, rotacion, medidas?, variantes?)` que toma los valores por defecto del catálogo. Cada test busca su conflicto filtrando por `tipo` (o con `toContainEqual`), para que los avisos de paso estrecho propios de la disposición no lo rompan; los casos "sin conflictos" colocan los muebles pegados a pared o a ≥ 60 cm. Casos obligatorios de §8, cada uno con su mensaje exacto:
  1. Armario (alto 240) bajo una viga de canto 20 → `El armario no cabe bajo la viga: sobran 10 cm`.
  2. Armario de 2 puertas pegado a la pared superior y cama con su borde a 38 cm del frente del armario (las puertas barren 50) → `La puerta del armario choca con la cama: faltan 12 cm`.
  3. Cómoda girada 180° con el frente a 30 cm de la pared → `El cajón de la cómoda choca con la pared: faltan 15 cm`.
  4. Puerta de la estancia (abatible hacia dentro, ancho 80) y armario dentro de su barrido → `apertura` cuyo mensaje empieza por `La puerta choca con el armario: faltan`.
  5. Cama que atraviesa una columna 8 cm → `La cama y la columna se solapan 8 cm`.
  6. Cama y cómoda tocándose exactamente (0 cm), también giradas 90° → sin conflictos de `solape` (Review Focus 1).

  Además:
  - cama de 45° cuya esquina sale 0,05 cm de la pared → sin `fueraDeEstancia`; si sale 3 cm → `La cama atraviesa la pared: sobran 3 cm` (Review Focus 3);
  - armario girado 30° tapando la mitad del barrido de la puerta → `cantidadCm` igual a `cantidadMostrada(penetracion)` calculada a mano con `penetracion` (Review Focus 5);
  - armario de alto 260 en una estancia de 250 → `El armario no cabe bajo el techo: sobran 10 cm`;
  - cómoda delante de una ventana con alturaSuelo 80 → `La cómoda tapa la ventana`; con alturaSuelo 90 → nada;
  - cómoda delante de un radiador → `La cómoda tapa el radiador`;
  - cama y armario separados 45 cm → aviso `Paso estrecho entre la cama y el armario: 45 cm`; separados 10 → nada;
  - alfombra bajo la cama → ningún conflicto;
  - elemento con `tipo: 'desconocido'` → ignorado, sin lanzar.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar `mensajes.ts` (una función por fila de la tabla) y `detectar.ts`. Recorrido O(n²) por pares; con unos 40 elementos sobra.
- [ ] **Step 4:** `npm test` → PASS. `npm run build` → sin errores ni avisos de TypeScript.
- [ ] **Step 5:** Commit `feat(nucleo): detección de conflictos con mensajes`.

---

### Task 8: Integración continua

**Files:**
- Create: `.github/workflows/verificar.yml`

- [ ] **Step 1:** Workflow en `push` y `pull_request`: `actions/checkout`, `actions/setup-node` (Node 24, caché npm con `web/package-lock.json`), y en `web/`: `npm ci`, `npm test`, `npm run build`. No despliega. (El remoto de GitHub aún no existe; el fichero queda listo.)
- [ ] **Step 2:** En local, `cd web && npm ci && npm test && npm run build` → todo en verde.
- [ ] **Step 3:** Commit `ci: verificar web en cada cambio`.
