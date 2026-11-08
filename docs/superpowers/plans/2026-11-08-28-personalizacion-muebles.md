# Plan 28: más personalización de los muebles

> Diseño, pendiente del OK de Angel antes de implementar. Tres PR independientes con TDD, en el orden de abajo. Los `volumenes` de cada tipo son lo que choca; lo que sale al abrir va en `zonasApertura`.

**Goal:** cajoneras en el escritorio; canapé, cajones y cama nido en la cama; forma y material de las patas en los muebles que las tienen.

## Diagnóstico: qué permite hoy el modelo y qué no

- **Variantes** (`nucleo/catalogo/tipos.ts:7-14`): `clave`, `etiqueta`, `valores` (texto, número o booleano), `defecto` y `valoresPara(e)` opcional (los valores que admite este elemento; la mesita de dos senos lo usa). El panel (`editor/paneles/PanelPropiedades.tsx:230-234`) pinta un `<select>` por variante con `valoresVariante`; el texto de cada valor es el valor crudo con mayúscula (`editor/comunes/variantes.ts:7`): no hay etiqueta por valor, así que un valor «canape» saldría sin tilde. `valorVariante` (`tipos.ts:132`) cae al defecto si el valor guardado no está entre los válidos: los diseños antiguos siguen valiendo sin migración (`FORMATO_ACTUAL = 1`, sin versiones). `validar.ts:185-190` solo comprueba el tipo del valor, no las claves.
- **Voltear** (`nucleo/edicion/elementos.ts:58-70`): intercambia izquierda ↔ derecha en toda variante cuyos `valores` incluyan exactamente `'izquierda'` y `'derecha'` (`catalogo/elemento.ts:31-35`). Una variante nueva con esos dos valores (más otros, como `'no'` o `'ambas'`) se voltea sola.
- **Zonas de color** (`tipos.ts:24`): `material` **fijo** por zona (tela, madera, lacado, metal, vidrio, cerámica) y color por defecto; el usuario solo elige el color (`CampoColor`, `PanelPropiedades.tsx:235-238`). `piezasDeElemento` (`modelo3d/escena.ts:21-23`) toma `p.material ?? zona.material` y `p.color ?? e.colores[zona]`: una pieza puede fijar su material, pero no hay forma de que lo elija el usuario. Solo madera, tela, suelo, baldosa y pared tienen textura (`vista3d/texturas.ts:102`); metal y lacado van lisos.
- **Patas**: `patas4(e, lado, alto, zona, margen)` y `mesaConPatas` (`modelos.ts:14, 102`) hacen cajas; `tableroConPatas` (`aperturas.ts:20-28`) da los volúmenes (tablero + 4 patas de 5 × 5, lo de debajo no choca). Tipos con zona de patas propia: escritorio, mesa, mesa-alta, mesa-reuniones, escritorio-l (metal), sofá, sofá cama, rinconera (madera), mesa-auxiliar (`pie`, metal); sin zona propia: mesa-centro (tablero), cama (estructura), silla y taburete (asiento), sillón (tapizado).
- **Aperturas** (`aperturas.ts`): `cajones(e, recorrido, zDesde, zHasta)` da una sola zona `'el cajón'` a todo el ancho por el frente; `puertasAbatibles`, `puertaAbatibleAbajo`, `espacioDelante` (aviso, solo planta). El sofá cama abierto no usa apertura sino la variante `abierto`, que cambia los volúmenes. El mensaje «El cajón de la cómoda choca con…» sale de `ZonaApertura.nombre` + `def.nombre`/`genero` (`conflictos/mensajes.ts:12`).
- **Tests que acotan**: `integridad.test.ts` recorre el producto cartesiano de `valores` (no de `valoresPara`): volúmenes válidos, aperturas que no lanzan y sin conflicto consigo mismo en un salón vacío; `modelos3dIntegridad.test.ts` cruza eso con 27 medidas (cama hoy: 54 combinaciones; escritorio: 27); `tipos.test.ts` lista los 59 tipos (todo va en variantes, no en tipos nuevos).

**Límites que hay que tocar:** (1) etiqueta por valor de variante; (2) ocultar una variante cuando solo admite un valor (si no, «lado» saldría en la cama con patas); (3) material elegible por zona; (4) cajones y patas en un tramo de ancho, no a todo el ancho; (5) aperturas laterales.

## Petición a: escritorio con cajoneras

| Opción | Qué cambia | A favor | En contra |
|---|---|---|---|
| **A1. Variante `cajonera` con valores `no`, `izquierda`, `derecha`, `ambas`** (recomendada) | `escritorio.ts`; ayudas `cajoneraLateral` y `cajonesEn` | Voltear funciona solo (incluye izquierda y derecha); mismo patrón que la chaise del sofá; 4 combinaciones | — |
| A2. Dos variantes booleanas (cajonera izquierda, cajonera derecha) | Igual | Más explícito | Voltear no las entiende; dos controles para una decisión |
| A3. Tipo nuevo «escritorio con cajonera» | Definición nueva | Nada que tocar en el escritorio | Cambiar de tipo pierde variantes; lista de 59 tipos; duplica medidas |

**Medidas (habituales en catálogos de oficina; no comprobadas con un fabricante concreto):** cajonera de **40 cm** de ancho, del suelo a `alto − 3` (bajo el tablero), fondo `fondo − 2` con los frentes retranqueados como la cómoda (`yFrenteCuerpo`), **3 cajones** apilados con tirador (2 si `alto − 3 < 60`). Con `ancho < 100` y `ambas`, `valoresPara` la quita (quedarían menos de 20 cm de hueco para las piernas).

- **Volúmenes**: tablero + bloque(s) de cajonera (0 a `alto − 3`, en el tramo de 40 del lado) + patas de 5 × 5 solo en el lado o lados sin cajonera. `tableroConPatas` gana un parámetro de lados con pata, o nace `tableroConApoyos(e, { izquierda: 'pata' | 'cajonera', derecha })`.
- **Planta**: `huellaEntera` (igual).
- **3D**: `mesaConPatas` igual + `cajoneraLateral(e, lado, zona)` = cuerpo + `cajonesApiladosEn(x0, x1, …)` (generalización de `cajonesApilados` a un tramo de x; el actual pasa a llamarla con `−ancho/2, ancho/2`). Zona de color: el cuerpo de la cajonera con la del tablero (`tablero`) para no añadir zona; los tiradores con `patas` (metal).
- **Aperturas**: `cajonesEn(e, x0, x1, recorrido = fondo − 5, zDesde = 0, zHasta = alto − 3)` → una zona `'el cajón'` por cajonera, por el frente. `cajones()` actual pasa a llamarla.
- **Quién más se beneficia**: `escritorio-l` (misma ayuda en el ala; segundo paso, fuera de este plan) y `mesa-alta` no (no lleva cajonera).
- **Documento**: `variantes.cajonera` nuevo; los diseños sin ella → `no` (defecto).
- **Tests**: `escritorio.test.ts` nuevo: con `derecha`, volúmenes = tablero + cajonera + 2 patas a la izquierda; una zona `'el cajón'` en x ∈ [ancho/2 − 40, ancho/2]; 3 cajones de 3D con alto 75 y 2 con alto 70 si procede; `ambas` no admitida con ancho 80; voltear pasa `izquierda` ↔ `derecha` y deja `no`/`ambas`; `despacho.test.ts` (la cajonera suelta sigue cabiendo bajo el escritorio con `cajonera: no`). Integridad: 27 × 4 combinaciones.

## Petición b: cama con canapé, cajones o nido

| Opción | Qué cambia | A favor | En contra |
|---|---|---|---|
| **B1. Variante `base` (`patas`, `canape`, `cajones`, `nido`) + variante `lado` (`izquierda`, `derecha`, `ambos`) con `valoresPara`** (recomendada) | `cama.ts`; `DefinicionVariante.etiquetas`; ocultar variantes de un solo valor | Dos decisiones claras; voltear cambia el lado del nido y de los cajones; cabe en el modelo actual | «lado» exige la regla nueva de ocultar variantes con un valor; 12 combinaciones |
| B2. Una sola variante con 7 valores (`nido-izquierda`, `cajones-derecha`…) | Solo `cama.ts` | Un control | Voltear no reconoce los valores compuestos; lista larga |
| B3. Tipos nuevos (cama canapé, cama nido) | Tres definiciones | Nada condicional | Cambiar de tipo pierde variantes y colores; 62 tipos; triplica el mantenimiento de la cama |

**Medidas (habituales; no comprobadas con un fabricante):**
- **Canapé**: la base es un bloque cerrado del suelo a `zColchon` (= `alto − 22`), radio 1, zona `estructura`; sin patas ni somier visibles. Apertura: la tapa (colchón) se levanta desde la cabecera; a ~60° el pie sube hasta `0,85 · fondo` sobre el colchón. Zona `'la tapa del canapé'`: caja sobre la **mitad de los pies**, x entero, y de `y0 + fondo/2` a `fondo/2`, z de `alto` a `alto + 0,85 · fondo`. Es una caja que sobrestima el barrido (un estante sobre la cabecera no choca de verdad): se acepta, porque lo que suele estorbar es una viga, una litera o una ventana baja, y las tres caen dentro. Alternativa: no declarar apertura; descartada porque es justo lo que diferencia un canapé.
- **Cajones**: bajo la cama, por el lado largo. Por lado, dos cajones de `(fondo − 30) / 2` de largo y `zColchon − 5` de alto (frente con tirador en 3D). Apertura: una zona `'el cajón'` por lado, caja de x `±ancho/2` a `±(ancho/2 + 50)`, y de `y0 + 15` a `fondo/2 − 15`, z de 5 a `zColchon`. `lado` admite `izquierda`, `derecha` o `ambos`.
- **Nido**: segunda cama que sale por un lado. 3D cerrada: frente bajo del lado elegido (zona `estructura`) con un tirador. Apertura: zona `'la cama nido'`, caja de x `±ancho/2` a `±(ancho/2 + ancho − 10)`, y de `y0 + 5` a `fondo/2 − 5`, z de 5 a `zColchon`. `lado`: `izquierda` o `derecha`.
- **Alto**: las tres bases necesitan `zColchon ≥ 18` → `valoresPara` de `base` devuelve solo `patas` si `alto < 40`. `valorVariante` ya cae al defecto cuando el valor guardado no está entre los admitidos.
- **`lado`**: `valoresPara` devuelve `['derecha']` con `patas` o `canape` (y la variante no se enseña: regla nueva), `['izquierda', 'derecha']` con `nido`, las tres con `cajones`.

- **Volúmenes**: sin cambio (`cajaEntera` + cabecero): la base cerrada ocupa lo mismo que las patas a efectos de choque.
- **Documento**: `variantes.base` y `variantes.lado` nuevos; antiguos → `patas`/`derecha`.
- **Cambios genéricos que trae**: `DefinicionVariante.etiquetas?: Record<string, string>` (para «Canapé», «Cama nido») y `etiquetaValor` los usa; `PanelPropiedades` y la hoja (`hoja.ts:56`) no enseñan una variante cuando `valoresVariante` devuelve un solo valor.
- **Tests**: `cama.test.ts`: `canape` sin patas y con bloque hasta `zColchon` y una zona `'la tapa del canapé'` con los límites de arriba; `cajones` + `ambos` → 2 zonas `'el cajón'` fuera del ancho; `nido` + `izquierda` → zona en x negativa de ancho `ancho − 10`; con `alto: 30` solo se admite `patas`; voltear nido/cajones; la cama contra la pared izquierda con `nido` + `izquierda` da error «La cama nido de la cama choca con la pared». `variantes.test` (etiquetas) y `PanelPropiedades.test` (la variante de un valor no se enseña). Integridad: 27 × 12 combinaciones.

## Petición c: forma y material de las patas

| Opción | Qué cambia | A favor | En contra |
|---|---|---|---|
| **C1. Forma: variante `patas` (`cuadradas`, `redondas`) en los tipos con patas visibles; material: `ZonaColor.materiales?` + `Elemento.materiales?` elegible en el panel** (recomendada) | `tipos.ts`, `documento.ts`, `validar.ts`, `elemento.ts` (defectos), `escena.ts`, `PanelPropiedades`, `hoja.ts`, `textos` | El material por zona sirve después para tablero, cuerpo o tapizado; un solo control nuevo (select junto al color); los diseños antiguos no cambian (campo opcional) | Toca el documento y seis sitios del núcleo; hay que nombrar los materiales al usuario |
| C2. Material como variante por tipo (`materialPatas`), aplicado con `PiezaLocal.material` | Solo definiciones | Sin tocar documento ni panel | Una variante por tipo y por zona; no escala a otras zonas; el color por defecto no cambia con el material |
| C3. Forma como ayuda sin variante (`patas4` redondas donde pegue) | `modelos.ts` | Barato | No es personalización |

- **Forma**: `patas4(e, lado, alto, zona, margen, forma = 'cuadradas')` hace cilindros de radio `lado/2` con `redondas`; los **volúmenes siguen siendo cajas** (el cilindro cabe dentro; conservador). Tipos: mesa, escritorio, mesa-alta, mesa-reuniones (no ovalada), mesa-auxiliar, silla, taburete (7). Cama, sofás y sillón no: patas de 8 cm casi ocultas.
- **Material**: `ZonaColor.materiales?: MaterialDeZona[]` (si falta, solo `material`); `Elemento.materiales?: Record<string, MaterialDeZona>` (opcional, como `medidasExtra`); `piezasDeElemento` toma `e.materiales?.[zona] ?? zona.material`; `elementoNuevo` no lo rellena (defecto implícito); `editar` lo mezcla como `colores`; `cambiarTipo` conserva los de zonas con la misma clave; `validar.ts` admite solo los seis nombres. Panel: `CampoColor` gana un `<select>` de material cuando la zona tiene más de uno (textos `materiales.madera: 'Madera'`…). Hoja: «Patas: metal, #3a3a3a». Zonas que lo estrenan: las `patas`/`pie` de los 9 tipos con zona propia (madera, metal, lacado); el color elegido se mantiene al cambiar de material.
- **Tests**: `patas4` redondas → 4 cilindros de radio `lado/2` dentro de las cajas de `tableroConPatas`; `piezasDeElemento` con `materiales.patas = 'madera'` → material madera (y textura) en las patas; `validar` rechaza un material desconocido; `cambiarTipo` conserva el material de `patas` entre mesa y escritorio; `PanelPropiedades`: el select solo aparece en zonas con varios materiales. Integridad: ×2 combinaciones en 7 tipos.

## PR, en orden

1. **`feature/cama-bases` (plan 28a)** ✅ hecho (PR abajo): `etiquetas` en variantes, ocultar variantes de un valor, `base` y `lado` de la cama con canapé, cajones y nido, `zonaCajon`/aperturas laterales. Es lo que más cambia lo que ve el usuario y no depende de nada.
2. **`feature/escritorio-cajoneras` (28b)** ✅ hecho: `cajonesApiladosEn`, `cajonesEn`, `cajoneraLateral`, `tableroConApoyos`; variante `cajonera`. Reutiliza `zonaCajon` del 1 si llega después; si no, la crea.
3. **`feature/patas` (28c)** ✅ hecho (el escritorio, tras fusionar 28b): forma de las patas y material por zona (modelo C1). El más transversal: documento, validación, panel y hoja; conviene ir solo en su PR.

Cada PR: tests primero, integridad del catálogo, lint, build, e2e, revisión visual en 3D de los tipos tocados (captura en el PR), `CLAUDE.md` con lo no obvio (regla de ocultar variantes, material por zona, aperturas laterales), merge y publicación solo con el sí de Angel.

## Riesgos

- **La tapa del canapé como caja** avisa de más (estante sobre la cabecera). Si molesta, pasar a dos cajas escalonadas o a una zona `espacioLibre` (aviso en vez de error).
- **Cama contra la pared con nido o cajones a ese lado**: error esperado (es la razón de elegir lado) y Voltear lo arregla en un clic; conviene que el mensaje lo diga claro.
- **Material por zona en la caché de materiales 3D**: la clave ya lleva material y color; sin cambio. El tope de 256 materiales no se acerca.
- **Combinaciones de la integridad**: cama 324 y escritorio 108 evaluaciones × 27 medidas siguen siendo milisegundos.

## Fuera de esto (anotado, no incluido)

- El sofá cama abierto cambia los `volumenes` en vez de usar `zonasApertura`: inconsistente con cajones y nido; unificar algún día.
- `etiquetaValor` capitaliza el valor crudo: con `etiquetas` deja de hacer falta en los tipos que las lleven; los demás siguen igual.
- `escritorio-l` con cajonera en el ala, y `mesa-centro`/`cama` con zona de patas propia, cuando se vea que se usan.
