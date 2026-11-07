# Plan 19: Mis diseños y plantillas (fase 7 de las mejoras)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** encontrar un diseño entre veinte sin abrirlos (miniatura, buscador y orden en Mis diseños, M-19) y empezar una estancia en L sin partir paredes ni mover esquinas a mano (M-04).

**Índice:** [plan 12](2026-11-06-12-mejoras-hoja-de-ruta.md); mejoras en [`docs/mejoras.md`](../../mejoras.md). **Spec:** `docs/superpowers/specs/2026-10-24-decorazon-design.md` (§3 cuentas y diseños, §4.1 estancia).

**Architecture:**
- **API (M-19).** La tabla `vistas_previas` ya guarda una imagen JPEG por diseño (la sube el navegador del dueño con `PUT /disenos/{id}/vista-previa`); hoy solo se sirve por el enlace público. Se añade `GET /disenos/{id}/vista-previa` (sesión, dueño; un diseño ajeno o sin imagen es `404`, `Cache-Control: private, max-age=300`, `nosniff`) y el resumen del listado lleva `fechaDeVistaPrevia: DateTimeOffset?` (null sin imagen; la web la pone en la dirección para no reutilizar una imagen vieja). Dominio: `ResumenDeDiseno` gana `FechaDeVistaPrevia`; puerto `IRepositorioDeDisenos.ObtenerVistaPreviaDelDuenoAsync(usuarioId, id)`; caso de uso `CompartirDisenos.ObtenerVistaPreviaDelDuenoAsync`; el repositorio EF proyecta la fecha con una subconsulta sobre `VistasPrevias` (sin cargar la imagen). Contrato `RespuestaDeResumenDeDiseno` con el campo nuevo (posicional, al final). `dotnet build` regenera `openapi.json` y `npm run api:tipos` los tipos.
- **Web, la imagen de todos (M-19).** `RefrescoDeVistaPrevia` deja de depender de si el diseño se comparte: cada guardado rehace la imagen (como mucho una vez cada 5 minutos, `frecuencia.ts`) para cualquier diseño de la cuenta; desaparece la pregunta al servidor y la prop `compartido` (y con ella el campo `compartido` de la carga en `EditorDeDiseno`). `DialogoCompartir` sigue haciendo la suya antes de crear el enlace.
- **Web, Mis diseños (M-19).** `disenos/servidor.ts`: `obtenerVistaPrevia(id): Promise<Blob>` (`api.GET` con `parseAs: 'blob'`). `disenos/paginas/MiniaturaDeDiseno.tsx`: con `fecha` pide la imagen, la enseña como `<img alt="">` desde un object URL (caché de módulo por `id:fecha`, para que buscar u ordenar no la vuelva a pedir; sin `fecha` o si falla, un hueco con el icono `disenos`). `MisDisenos.tsx`: campo «Buscar» (filtra por nombre sin distinguir mayúsculas ni tildes: `normalize('NFD')` sin diacríticos) y `<select>` «Ordenar por» con `fecha` (la de siempre, descendente), `nombre` (`localeCompare` en `es`) y `tipo` (por el texto del tipo y, dentro, por fecha); todo en el cliente, sin guardar la elección. La fila gana la miniatura a la izquierda (`.disenos__miniatura`, 96 × 64, fondo crema). Sin conexión (copias locales) no hay miniatura.
- **Plantillas (M-04).** `nucleo/modelo/crear.ts`: `FormaDePlanta = { forma: 'rectangulo' } | { forma: 'ele'; entranteAncho: number; entranteLargo: number; esquina: Esquina }` con `Esquina = 'arriba-izquierda' | 'arriba-derecha' | 'abajo-izquierda' | 'abajo-derecha'`; `plantaDeForma(ancho, largo, forma): Punto[]` (rectángulo de 4 vértices o L de 6, en sentido horario con x a la derecha e y hacia abajo, con el entrante recortado a `[50, medida − 50]`) y `documentoNuevo(tipo, ancho, largo, alto, forma = { forma: 'rectangulo' })`. El «rectángulo con hueco en una esquina» del índice es la misma L con un entrante pequeño: una sola forma con sus dos medidas y la esquina cubre los dos casos. `NuevaEstancia.tsx`: grupo «Forma» (Rectángulo / En L); con L, «Entrante ancho», «Entrante largo» (por defecto un tercio de cada medida) y «Esquina del entrante»; un `<svg>` pequeño dibuja la planta resultante. `alCrear(tipo, ancho, largo, alto, forma)`; `almacen.crear` acepta `forma`. En el panel de Estancia la nota `noRectangular` ya existe.

**Tech Stack:** .NET 10 minimal API + EF Core/PostgreSQL (tests con Testcontainers), React 19, openapi-fetch, Vitest, Playwright.

## Global Constraints

- Regla de dependencias de `CLAUDE.md` (Dominio sin dependencias; `Decorazon.Arquitectura.Tests` la vigila). Diseño ajeno o inexistente: `404`. La identidad sale del JWT.
- Tras cambiar el contrato: `dotnet build Decorazon.slnx -warnaserror` y `cd web && npm run api:tipos`; `openapi.json` y `esquema.d.ts` van en git y el CI comprueba que están al día.
- `dotnet test Decorazon.slnx` necesita Docker (Testcontainers); `--filter "Categoria!=Integracion"` sin él. Aquí hay Docker: se pasa todo.
- Textos en `web/src/textos.ts`. Sin dependencias nuevas.
- Verde al cerrar: `dotnet build -warnaserror`, `dotnet test`, `npm test`, `npm run lint`, `npm run build`, `npm run e2e`, `npm run e2e:cuentas`.

## Review Focus

- Un diseño con imagen que se borra: la fila de `vistas_previas` cae por la clave foránea y el listado deja de dar fecha; `GET /disenos/{id}/vista-previa` da 404 sin fugas.
- Otro usuario con el id de un diseño ajeno pide la imagen: 404, no 403 ni la imagen.
- Un nombre con tilde («Salón») se encuentra buscando «salon» y al revés; una búsqueda vacía no filtra.
- La L con el entrante más grande que la estancia: `plantaDeForma` lo recorta y la planta sigue siendo simple y válida (`validarDocumento`).
- Guardar un diseño nuevo sin WebGL (jsdom, un móvil viejo): no sube nada, no falla y el listado enseña el hueco.

## Tasks

### Task 1: API (rojo → verde)

- [ ] `tests/Decorazon.Aplicacion.Tests` (dobles de `DoblesDeDisenos.cs`): `ObtenerVistaPreviaDelDuenoAsync` devuelve la imagen al dueño, null a otro usuario y null sin imagen; `ListarAsync` da `FechaDeVistaPrevia` solo en los que la tienen.
- [ ] `tests/Decorazon.Api.Tests/VistaPreviaTests.cs`: `GET /disenos/{id}/vista-previa` con sesión del dueño da 200 `image/jpeg` con los bytes subidos, `Cache-Control` `private` y `nosniff`; otro usuario 404; sin imagen 404; sin sesión 401. `GET /disenos` lleva `fechaDeVistaPrevia` tras subir la imagen y null antes. `OpenApiTests`: la ruta nueva pide bearer.
- [ ] Código: `ResumenDeDiseno` (dominio), `IRepositorioDeDisenos`, `RepositorioDeDisenosEf` (proyección y consulta del dueño), `CompartirDisenos`, `CompartirEndpoints` (`GET` con `WithName("leerVistaPreviaDelDueno")`, `Produces(200, "image/jpeg")`, 404), `ContratosDeDisenos` y `DisenosEndpoints.ListarAsync`, dobles.
- [ ] `dotnet build Decorazon.slnx -warnaserror`, `dotnet test Decorazon.slnx`, `cd web && npm run api:tipos`; `openapi.json` y `esquema.d.ts` cambiados. Commit `feat(api): vista previa del dueño y su fecha en el listado`.

### Task 2: la imagen de todos los diseños y la miniatura en Mis diseños

- [ ] `vistaPrevia.test.tsx`: el test «un diseño que no se comparte no rehace nada» pasa a «un diseño que no se comparte también rehace y sube la imagen al guardar»; desaparece el caso «abierto sin conexión… lo pregunta». `EditorDeDiseno.test.tsx`: no pide `GET /disenos/{id}` al guardar para saber si se comparte.
- [ ] `servidor.test.ts`: `obtenerVistaPrevia` pide `GET /disenos/{id}/vista-previa` y devuelve un `Blob`.
- [ ] `MiniaturaDeDiseno.test.tsx`: con `fecha` pide la imagen una vez (dos montajes con el mismo `id:fecha`, una petición) y pinta `<img>`; sin `fecha`, el hueco sin petición; si la petición falla, el hueco.
- [ ] `MisDisenos.test.tsx`: cada fila con `fechaDeVistaPrevia` lleva `img.disenos__miniatura`, y sin ella el hueco; «Buscar» con «salon» deja solo «Salón de casa» y vacío los deja todos; «Ordenar por» nombre ordena «Antiguo» antes que «Reciente» y por tipo agrupa.
- [ ] Código: `RefrescoDeVistaPrevia.tsx` y `EditorDeDiseno.tsx` (sin `compartido`), `servidor.ts`, `MiniaturaDeDiseno.tsx`, `MisDisenos.tsx`, `disenos.css`, textos (`disenos.buscar`, `disenos.ordenar`, `disenos.orden.{fecha,nombre,tipo}`, `disenos.sinMiniatura`).
- [ ] Commit `feat(web): miniatura, buscador y orden en Mis diseños; vista previa de todos los diseños`.

### Task 3: plantillas de planta

- [ ] `crear.test.ts`: `plantaDeForma(400, 330, { forma: 'ele', entranteAncho: 150, entranteLargo: 100, esquina: 'abajo-derecha' })` da 6 vértices horarios `[(0,0),(400,0),(400,230),(250,230),(250,330),(0,330)]`; cada esquina recorta la suya; un entrante de 390 en 400 se recorta a 350; `documentoNuevo(..., ele)` valida y `esSimple`; sin forma, el rectángulo de siempre.
- [ ] `NuevaEstancia.test.tsx`: elegir «En L» enseña los campos del entrante y crea una planta de 6 vértices; el dibujo (`svg`) cambia de 4 a 6 puntos; «Rectángulo» vuelve a 4. `almacen.test` (donde esté `crear`): `crear` con forma.
- [ ] `MisDisenos.test.tsx`: crear desde el diálogo con L manda al servidor una planta de 6 vértices.
- [ ] Código: `crear.ts` (y export en `nucleo/index.ts`), `almacen.ts` (`crear(tipo, ancho, largo, alto, forma?)`), `NuevaEstancia.tsx`, `MisDisenos.tsx` (`DialogoNuevo`), `editor.css` o `nueva-estancia` CSS para el dibujo, textos (`nuevaEstancia.forma`, `formas.{rectangulo,ele}`, `entranteAncho`, `entranteLargo`, `esquina`, `esquinas.*`).
- [ ] Commit `feat(web): estancia en L desde «Nueva estancia»`.

### Task 4: cierre

- [ ] `e2e/cuentas/cuentas.spec.ts`: tras guardar en el editor y volver a Mis diseños, la fila lleva `img.disenos__miniatura` (con `expect.poll`, 20 s: la imagen se sube en segundo plano); `anonimo.spec.ts` o `ejemplos.spec.ts`: crear una estancia en L y ver 6 cotas.
- [ ] `dotnet build`, `dotnet test`, `npm test`, `lint`, `build`, `e2e`, `e2e:cuentas`; capturas de Mis diseños con miniaturas (1440 y 390) y de «Nueva estancia» en L.
- [ ] `CLAUDE.md`: el endpoint nuevo, la fecha en el resumen, la vista previa de todos los diseños y las plantillas, en una frase cada uno.
- [ ] `mejoras.md`: M-19 y M-04 → `realizada` con fecha y PR. Este plan con todo marcado.
