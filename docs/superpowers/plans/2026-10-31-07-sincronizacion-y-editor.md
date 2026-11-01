# Plan 7: sincronización sólida y arreglos del editor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que ningún cambio del usuario se pierda ni se duplique al sincronizar, y que el editor cumpla lo que el spec promete en giro, conflictos, cotas y uso táctil.

**Architecture:**
- **Sincronización (Tasks 1–5):** los arreglos van en `web/src/editor/persistencia/sincronizacion.ts`, `local.ts` y `cuenta/sesion.ts`, sin cambiar el modelo de un `Trabajo` por diseño.
- **Alta idempotente (Tasks 6–7):** el cliente genera el id del diseño y la API lo acepta. Reintentar un `POST /disenos` devuelve el diseño ya creado en vez de crear otro.
- **Mis diseños (Task 8):** arreglos de la página.
- **Editor (Tasks 9–12):** la geometría nueva (tirador, zona exterior, cotas en pared) va al núcleo puro (`web/src/nucleo`), y el lienzo solo la pinta.

**Tech Stack:** React 19, Zustand, Vitest + Testing Library (jsdom), .NET 10 + EF Core + xUnit, openapi-typescript.

**Spec:** `docs/superpowers/specs/2026-10-24-decorazon-design.md`, en concreto:
- §4.3 "Todas las medidas se ven como **cotas**";
- §4.5 "los elementos en conflicto y la zona que choca se pintan en rojo";
- §5 (sincronización y copia local);
- §7 (contrato OpenAPI).

**Pendientes que recoge:**
- `2026-10-30-05-pendientes.md`, "Web (rendimiento y robustez)": M7, M8, dos pestañas, `comprobar()` en vuelo, renombrado sin conexión, `beforeunload`, `POST` duplicado y Mis diseños.
- `2026-10-29-03-pendientes.md`, "Interfaz del editor": tirador de giro, `fueraDeEstancia`, arrastre táctil y cotas de puertas y ventanas.

## Global Constraints

- **Dependencias y textos:** sin dependencias nuevas, ni npm ni NuGet. Todos los textos visibles nuevos van en `web/src/textos.ts`.
- **Almacenamiento local:** todo acceso a `localStorage` sigue el patrón de `local.ts`, con `almacenamientoSeguro()` y try/catch. Sin almacenamiento, la app funciona igual que hoy.
- **Lo que no puede cambiar:**
  - los atributos `data-*` del lienzo, los nombres accesibles y las clases de las que dependen los tests y los e2e (lista en el PR #8);
  - el JSON de `decorazon.diseno.<id>`, que solo admite campos nuevos **opcionales**: una copia escrita por la versión anterior tiene que seguir leyéndose.
- **Contrato y API:**
  - el contrato OpenAPI se regenera con el build de la API (`web/src/api/openapi.json`) y se commitea con el cambio;
  - `dotnet build Decorazon.slnx -warnaserror` sin avisos.
- **Verde al cerrar cada tarea:**
  - web: `npm test`, `npm run lint` y `npm run build`;
  - API, si se ha tocado: `dotnet test Decorazon.slnx`;
  - `npm run e2e` al final del plan.
- **Puertos:**
  - 5321 es el Vite de Angel y no se toca;
  - las pruebas manuales van en 5322, y se cierra al acabar.

## Review Focus

1. Renombrado sin conexión, después reabrir con conexión y, ante un 412, elegir "sobrescribir": se conserva el nombre propio, no el remoto. → test en Task 3.
2. Cerrar la pestaña a mitad de un arrastre, con la copia aún sin escribir: `pagehide` la escribe y al volver está el último estado. → test en Task 1.
3. Reintentar "Guardar en mi cuenta" con 100 diseños en la cuenta cuando el primer intento sí se creó: devuelve el diseño, no un 409 por el límite. → test en Task 6.
4. Mueble en el rincón interior de una planta en L, con los cuatro sitios del tirador fuera de la planta: se queda delante, como hoy, sin fallar. → test en Task 9.
5. Arrastre táctil desde el catálogo soltado fuera del plano (sobre la hoja o la barra): no se añade nada ni se dispara el clic de añadir en el centro. → test en Task 12.

---

### Task 1: La copia local se agrupa (M7)

**Files:**
- Modify: `web/src/editor/persistencia/sincronizacion.ts`
- Test: `web/src/editor/persistencia/sincronizacion.test.ts`

**Interfaces:**
- **Produces:** `export const ESPERA_COPIA_MS = 500`. La opción `esperaCopiaMs?: number` de `conectarSincronizacion` usa esa constante por defecto.

Hoy `alEditar` llama a `copiar(t)` en cada cambio del documento, incluido cada fotograma de un arrastre.

- **Qué se agrupa:** `alEditar` pasa a programar la copia con `esperaCopiaMs`, siguiendo el modelo de `conectarPersistencia` en `local.ts`.
- **Cuándo se escribe la copia programada al momento:**
  - en `pagehide`;
  - en `visibilitychange` cuando pasa a `hidden`;
  - en `beforeunload`;
  - en `dejar()`;
  - al desconectar.
- **Lo que sigue escribiendo al momento:** los demás `copiar`, es decir, tras el PUT, `perder`, `abierto`, `resolver` y `renombrar`.

- [ ] **Step 1: Tests que fallan.**
  - `'veinte cambios seguidos escriben la copia una vez'`: con fake timers, 20 `cambiar` a 16 ms de distancia; se espía `st.setItem` sobre `claveCopia(id)`. Antes de `ESPERA_COPIA_MS` hay 0 escrituras; después, 1, con el último documento.
  - `'pagehide escribe la copia pendiente al momento'` (Review Focus 2): un `cambiar`, después `window.dispatchEvent(new Event('pagehide'))`. `leerCopiaLocal(st, id)` tiene el documento nuevo y `pendiente: true`, sin avanzar los timers.
  - `'salir del editor escribe la copia pendiente'`: `cambiar` y después `abrirDiseno` de otro diseño (lo que llama a `dejar`). La copia del primero tiene el documento nuevo.
- [ ] **Step 2:** Se ejecuta `npx vitest run src/editor/persistencia/sincronizacion.test.ts`. Expected: fallan los tres.
- [ ] **Step 3:** Se implementa tal como se describe arriba.
- [ ] **Step 4:** Se vuelve a ejecutar. Expected: pasan los tres nuevos y los que ya había ("copia inmediata" se adapta a la espera agrupada y se registra el ruling).
- [ ] **Step 5:** Commit `fix(web): la copia local se agrupa en vez de escribirse en cada fotograma`.

### Task 2: Lo editado mientras se comprueba se sube, y `beforeunload` cubre los guardados en marcha

**Files:**
- Modify: `web/src/editor/persistencia/sincronizacion.ts`
- Test: `web/src/editor/persistencia/sincronizacion.test.ts`

**Interfaces:**
- **Consumes:** `hayGuardadosEnMarcha()`, que ya existe en el mismo fichero.

**Cambios:**
- En `comprobar(t)`, al terminar (bien o en el catch), si `t !== actual && hayCambios(t)`, se llama a `void guardar(t)`. Es lo mismo que ya hace `enviar` en sus líneas 186-188.
- `alSalir` también previene la salida cuando `hayGuardadosEnMarcha()`.

- [ ] **Step 1: Tests que fallan.**
  - `'una edición durante comprobar() se sube aunque se salga del editor'`: con `guardado: 'sinConexion'` y `obtenerDiseno` en una promesa diferida, se dispara `online` y se hace un `cambiar`. Después se abre otro diseño, se resuelve la promesa y se avanzan los timers: `guardarDiseno` se llama con el documento editado.
  - `'beforeunload avisa si un diseño ya dejado sigue guardándose'`: un PUT diferido del diseño A, se abre B sin cambios y se dispara `beforeunload` (cancelable). Expected: `defaultPrevented === true`.
- [ ] **Step 2:** Se ejecuta. Expected: fallan los dos.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecuta el fichero entero. Expected: todo pasa.
- [ ] **Step 5:** Commit `fix(web): lo editado mientras se comprueba el diseño se sube y salir avisa de guardados en marcha`.

### Task 3: Un renombrado sin conexión sobrevive a reabrir el diseño

**Files:**
- Modify: `web/src/editor/persistencia/local.ts`, `web/src/editor/persistencia/sincronizacion.ts`
- Test: `web/src/editor/persistencia/sincronizacion.test.ts`, `web/src/editor/persistencia/local.test.ts`

**Interfaces:**
- **Produces:** `CopiaLocal` gana el campo opcional `nombrePendiente?: boolean`, que indica que el `nombre` es un renombrado aún no subido. `leerCopiaLocal` lo devuelve, y una copia sin el campo cuenta como `false`.
- **Cambios en la sincronización:**
  - `copiar(t)` escribe `nombrePendiente: t.nombrePendiente !== null`.
  - `elegirApertura(id, copia, remoto)` devuelve `Apertura.nombrePendiente = copia.nombre` cuando `copia.nombrePendiente`, tanto en el camino sin conexión como en el de con conexión.
  - `abierto` toma `t.nombrePendiente` de la apertura en lugar de ponerlo a `null`.

- [ ] **Step 1: Tests que fallan.**
  - `local.test.ts`: `'la copia conserva la marca de nombre pendiente y una copia antigua sin ella se lee como false'`.
  - `sincronizacion.test.ts`: `'renombrado sin conexión, reabrir sin conexión y después 412 con sobrescribir conserva el nombre propio'` (Review Focus 1). Se renombra a «Mi salón» sin red, se desconecta y se reabre con `elegirApertura(id, copia, null)`. Vuelve la red, el servidor responde 412 con el nombre «Otro» y se resuelve con `'sobrescribir'`. El último `guardarDiseno` se envía con `nombre: 'Mi salón'`.
- [ ] **Step 2:** Se ejecuta. Expected: fallan los dos.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecutan los dos ficheros. Expected: todo pasa.
- [ ] **Step 5:** Commit `fix(web): un renombrado sin conexión sobrevive a reabrir el diseño`.

### Task 4: Una pestaña no pisa la copia pendiente de otra

**Files:**
- Modify: `web/src/editor/persistencia/sincronizacion.ts`
- Test: `web/src/editor/persistencia/sincronizacion.test.ts`

**Regla:**
- Se escucha `storage` en `window`.
- Si llega un evento con `key === claveCopia(actual.id)`, cuyo `newValue` es una copia con `pendiente: false`, y esta pestaña tiene `hayCambios(actual)`, se vuelve a escribir su copia **al momento**. Lo que está pendiente prevalece sobre lo ya subido.
- Si la copia que llega es `pendiente: true`, no se reescribe. Así se evita un bucle entre dos pestañas, ambas con cambios. Las dos los conservan en memoria y `beforeunload` avisa en cada una.
- El listener se quita al desconectar.

- [ ] **Step 1: Tests que fallan.**
  - `'si otra pestaña escribe la copia ya subida, la que tiene cambios vuelve a escribir la suya'`. El almacén tiene un cambio y la copia ya está escrita; se escribe en `st` una copia `pendiente: false` y se despacha `new StorageEvent('storage', { key, newValue })`. Expected: `leerCopiaLocal` vuelve a tener `pendiente: true` y el documento de esta pestaña.
  - `'una copia pendiente de otra pestaña no provoca reescritura'`: `setItem` no se llama tras el evento.
- [ ] **Step 2:** Se ejecuta. Expected: falla el primero.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecuta el fichero entero. Expected: todo pasa.
- [ ] **Step 5:** Commit `fix(web): una pestaña no pisa la copia pendiente de otra`.

### Task 5: El nombre del usuario se carga al volver la red (M8)

**Files:**
- Modify: `web/src/cuenta/sesion.ts`, `web/src/main.tsx`
- Test: `web/src/cuenta/sesion.test.ts`

**Interfaces:**
- **Produces:** `export function conectarCargaDeUsuario(): () => void`.
  - Si `haySesion()`, llama a `cargarUsuario()` al momento.
  - En cada `online` de `window` lo vuelve a intentar mientras `haySesion() && usuario === null`.
  - Los errores se ignoran, como hoy.
  - Devuelve la función que quita el listener.
- **`main.tsx`:** sustituye `if (haySesion()) cargarUsuario().catch(() => {})` por `conectarCargaDeUsuario()`.

- [ ] **Step 1: Tests que fallan.**
  - `'sin red al arrancar, el nombre se carga cuando vuelve la conexión'`: el primer `fetch` rechaza con `TypeError` y el segundo devuelve `{ nombre: 'Ana', … }`. Tras `window.dispatchEvent(new Event('online'))`, `sesion.getState().usuario?.nombre === 'Ana'`.
  - `'con el usuario ya cargado, online no vuelve a pedirlo'`.
- [ ] **Step 2:** Se ejecuta `npx vitest run src/cuenta/sesion.test.ts`. Expected: fallan.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecuta. Expected: pasan.
- [ ] **Step 5:** Commit `fix(web): el nombre del usuario se carga al volver la conexión`.

### Task 6: API: alta de diseño idempotente con el id del cliente

**Files:**
- Modify:
  - `src/Decorazon.Contratos/Disenos/ContratosDeDisenos.cs` (`PeticionDeDiseno` gana `public Guid? Id { get; set; }`);
  - `src/Decorazon.Aplicacion/Disenos/PeticionDeDiseno.cs` (record con `Guid? Id`);
  - `src/Decorazon.Aplicacion/Disenos/GestionDeDisenos.cs`;
  - `src/Decorazon.Dominio/Disenos/Diseno.cs`;
  - `src/Decorazon.Infraestructura/Persistencia/RepositorioDeDisenosEf.cs`;
  - `src/Decorazon.Api/Endpoints/DisenosEndpoints.cs`;
  - `web/src/api/openapi.json` y `web/src/api/esquema.d.ts`, regenerados.
- Test:
  - `tests/Decorazon.Dominio.Tests/Disenos/DisenoTests.cs`;
  - `tests/Decorazon.Aplicacion.Tests/Disenos/GestionDeDisenosTests.cs`;
  - `tests/Decorazon.Api.Tests/DisenosTests.cs`;
  - `tests/Decorazon.Api.Tests/CarrerasTests.cs`.

**Interfaces:**
- **Produces:**
  - `Diseno.Crear(Guid id, Guid usuarioId, string nombre, TipoEstancia tipo, string contenido, DateTimeOffset ahora)` como sobrecarga. La actual sigue generando `Guid.NewGuid()`. Los tipos son los de la fábrica actual; si difieren, mandan los del código.
  - `EstadoDeDiseno` gana `YaCreado` (200), `IdentificadorEnUso` (409) e `IdentificadorNoValido` (400).
  - `IdentificadorRepetidoException`, en `Decorazon.Dominio/Puertos`: la lanza `RepositorioDeDisenosEf.GuardarCambiosAsync` ante una violación de clave primaria de PostgreSQL (`SqlState 23505` sobre la PK de `disenos`).
- **Comportamiento de `POST /disenos` con `id`:**
  - `Guid.Empty`: 400.
  - Ya existe y es del usuario (`ObtenerAsync(usuarioId, id)`): 200 con el mismo cuerpo, `ETag` y `Location` que el 201. **Se comprueba antes que el límite de 100.**
  - Existe pero es de otro usuario: 409 con mensaje, por ejemplo «Ese identificador de diseño ya está en uso».
  - No existe: se crea con ese id y responde 201.
  - Si dos altas simultáneas chocan por la PK, la segunda captura `IdentificadorRepetidoException`, relee y devuelve 200 si el diseño es suyo, o 409 si no.
- **Sin `id`:** todo sigue igual que hoy.

- [ ] **Step 1: Tests que fallan.**
  - Dominio: `CrearConId_UsaEseId`.
  - Aplicación (dobles):
    - `CrearConIdExistenteDelMismoUsuario_DevuelveYaCreadoSinAnadir`;
    - `CrearConIdDeOtroUsuario_DevuelveIdentificadorEnUso`;
    - `CrearConIdVacio_DevuelveIdentificadorNoValido`;
    - `ReintentoConCienDisenos_DevuelveYaCreadoYNoLimite` (Review Focus 3).
  - API (Postgres): `Post_ConElMismoId_DosVeces_DevuelveElMismoDisenoYUnaSolaFila`, que espera 201 la primera vez y 200 la segunda, con el mismo `id`, la misma `version` y el listado con un único diseño.
  - Carreras: `DosAltasSimultaneasConElMismoId_UnaFilaYAmbasCorrectas`.
- [ ] **Step 2:** Se ejecuta `dotnet test Decorazon.slnx`. Expected: fallan los nuevos.
- [ ] **Step 3:** Se implementa. Se ejecuta `dotnet build Decorazon.slnx -warnaserror`, que regenera `web/src/api/openapi.json`, y después, en `web/`, `npm run api:tipos` para regenerar `esquema.d.ts`.
- [ ] **Step 4:** Se ejecutan `dotnet test Decorazon.slnx` y, en `web/`, `npm test` y `npm run build`. Expected: todo pasa.
- [ ] **Step 5:** Commit `feat(api): alta de diseño idempotente con el id del cliente`.

### Task 7: «Guardar en mi cuenta» no duplica al reintentar

**Files:**
- Modify: `web/src/disenos/servidor.ts`, `web/src/cuenta/disenosLocales.ts`, `web/src/editor/persistencia/local.ts`
- Test: `web/src/cuenta/disenosLocales.test.ts`, `web/src/disenos/servidor.test.ts`

**Interfaces:**
- **Consumes:** el `id` opcional de `POST /disenos` de la Task 6 (200 = ya creado).
- **Produces:**
  - `crearDiseno(nombre: string, doc: DocumentoDiseno, id?: string): Promise<DisenoServidor>`, que manda `id` si se le pasa.
  - `export const CLAVE_ID_DE_SUBIDA = 'decorazon.idDeSubida'` en `local.ts`.
- **`subirDisenoAnonimo(doc)`:**
  - Usa el id guardado en `CLAVE_ID_DE_SUBIDA`, o genera uno con `crypto.randomUUID()` y lo guarda **antes** del POST.
  - Tras la respuesta, si el contenido devuelto no coincide con el diseño anónimo actual (se comparan `JSON.stringify(contenidoParaEnviar(...))`), escribe la copia local con `pendiente: true` igual que hoy. Así un reintento que devuelve el contenido antiguo acaba subiendo el actual.
- **`descartarDisenoAnonimo()`:** también borra `CLAVE_ID_DE_SUBIDA`.

- [ ] **Step 1: Tests que fallan.**
  - `'si se pierde la respuesta del alta, el reintento manda el mismo id y no crea otro'`. El primer `fetch` del POST rechaza con `TypeError` después de que el servidor simulado lo registre; el segundo responde 200 con el mismo diseño. Expected: los dos cuerpos llevan el mismo `id` y el resultado es `{ id }`.
  - `'con la cuota llena, reintentar no duplica'`. `setItem` de la copia lanza `QuotaExceededError` y el diseño anónimo se queda. Se repite `subirDisenoAnonimo` y se comprueba que se manda el mismo id.
  - `'tras subir, el id de subida se olvida'`.
  - `servidor.test.ts`: `'crearDiseno manda el id cuando se le pasa'`.
- [ ] **Step 2:** Se ejecuta. Expected: fallan.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecutan `npm test` y `npm run lint`. Expected: verde.
- [ ] **Step 5:** Commit `fix(web): guardar en mi cuenta no duplica el diseño al reintentar`.

### Task 8: Mis diseños: 404, fechas inválidas y tipos

**Files:**
- Modify: `web/src/disenos/paginas/MisDisenos.tsx`, `web/src/textos.ts`
- Test: `web/src/disenos/paginas/MisDisenos.test.tsx`

**Cambios:**
- `duplicar` con 404: aviso y la lista se vuelve a cargar.
- `borrar` con 404: cuenta como borrado. Quita la fila y la copia local (`borrarCopiaLocal`), sin aviso de error.
- `fechaRelativa`: con una fecha inválida devuelve `textos.disenos.sinFecha = 'Sin fecha'`.
- `porFechaDescendente`: deja al final las fechas inválidas.
- `tipoEnTexto`: usa `Object.hasOwn`.

- [ ] **Step 1: Tests que fallan.**
  - `'duplicar un diseño que ya no existe recarga la lista'`: se hace un segundo `GET /disenos`.
  - `'borrar un diseño que ya no existe lo quita de la lista y de las copias'`.
  - `'una fecha inválida se ve como "Sin fecha" y va al final'`.
  - `'un tipo "constructor" no se toma por un tipo de estancia'`.
- [ ] **Step 2:** Se ejecuta. Expected: fallan.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecuta. Expected: pasan.
- [ ] **Step 5:** Commit `fix(web): Mis diseños trata los 404 y las fechas inválidas`.

### Task 9: El tirador de giro se queda dentro de la estancia

**Files:**
- Create: `web/src/nucleo/edicion/tiradorDeGiro.ts` (más su export en `web/src/nucleo/index.ts` y la lista de `index.test.ts`)
- Modify: `web/src/editor/lienzo/capas/CapaTiradores.tsx` (`TiradorGiro`), `web/src/editor/lienzo/arrastres.ts` (`girarElemento`)
- Test: `web/src/nucleo/edicion/tiradorDeGiro.test.ts`, `web/src/editor/lienzo/Lienzo.test.tsx`

**Interfaces:**
- **Produces:** `tiradorDeGiro(planta: Punto[], e: Elemento, separacion: number): { centro: Punto; desfase: number }`.
  - **Candidatos, en este orden:**
    1. delante, en el local `{0, fondo/2 + s}`, con desfase 0;
    2. detrás, en `{0, -(fondo/2 + s)}`, con desfase 180;
    3. a la derecha, en `{ancho/2 + s, 0}`;
    4. a la izquierda, en `{-(ancho/2 + s), 0}`.
  - Se usan `rotar` según `e.rotacion` y la posición de `e`.
  - Se elige el primero cuyo `centro` cumpla `contienePunto(centro, planta)`. Si ninguno, delante.
  - **Desfase:** es el ángulo que hay que restar al de `giroHacia` para que, con el puntero sobre el tirador, el giro no cambie. Para los laterales se fija con un test, no a mano.
- **`girarElemento(…, desfase = 0)`:** la rotación nueva es `giroHacia(e.posicion, puntero) − desfase`, antes de redondear a 90°.
- **`TiradorGiro`:** usa `tiradorDeGiro(planta, e, SEPARACION_GIRO_CM)` para el brazo y el círculo, y pasa el desfase.

- [ ] **Step 1: Tests que fallan.**
  - En `tiradorDeGiro.test.ts`:
    - `'en el centro de la estancia queda delante'`: armario en (200,165) en una estancia de 400×330, con `centro` en (200,225). Es el valor que ya esperan `Lienzo.test.tsx:273` y `usarAtajos.test.tsx:226`.
    - `'con el frente contra la pared pasa detrás'`: armario en (200, 300), sin giro, en 400×330.
    - `'pegado a la pared y a una esquina pasa a un lateral'`.
    - `'en el rincón interior de una L con los cuatro fuera, se queda delante'` (Review Focus 4).
    - `'con el puntero sobre el tirador, el giro no cambia'`, para cada uno de los cuatro candidatos.
  - En `Lienzo.test.tsx`: `'el tirador de un mueble contra la pared se dibuja detrás y arrastrarlo no lo voltea'`.
- [ ] **Step 2:** Se ejecuta. Expected: fallan.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecutan `npm test`, `npm run lint` y `npm run build`. Expected: verde.
- [ ] **Step 5:** Commit `fix(web): el tirador de giro se queda dentro de la estancia`.

### Task 10: Fuera de la estancia se pinta solo lo que sale

**Files:**
- Modify:
  - `web/src/nucleo/conflictos/tipos.ts`, donde `Conflicto` gana `huecoDeZona?: Punto[]`, la parte de `zona` que no choca;
  - `web/src/nucleo/conflictos/detectar.ts`, en la rama de `fueraDeEstancia`;
  - `web/src/nucleo/geometria/convexo.ts`, solo el comentario de `interseccionConvexos`: el sujeto puede ser cualquier polígono simple y la ventana tiene que ser convexa;
  - `web/src/editor/lienzo/capas/CapaConflictos.tsx`;
  - `web/src/editor/lienzo/lienzo.css`.
- Test: `web/src/nucleo/conflictos/detectar.test.ts`, `web/src/nucleo/geometria/convexo.test.ts`, `web/src/editor/lienzo/Lienzo.test.tsx`

**Interfaces:**
- **En `fueraDeEstancia`:**
  - `zona` sigue siendo la huella del volumen que más sale.
  - `huecoDeZona = interseccionConvexos(planta, huella)`, con la huella convexa como ventana. Antes hay que verificar en `convexo.ts` el orden sujeto/ventana de sus argumentos.
  - Si el hueco sale vacío o con área menor de 1 cm², se omite y entonces se pinta la huella entera.
- **`CapaConflictos`:**
  - Con `huecoDeZona`, pinta `<path data-zona-conflicto="" fillRule="evenodd" d="M…Z M…Z">`.
  - Sin `huecoDeZona`, pinta el `<polygon>` como hoy.
- **CSS:** `.capa-conflictos :is(polygon, path)`.

- [ ] **Step 1: Tests que fallan.**
  - `convexo.test.ts`: `'interseccionConvexos recorta una L (no convexa) por un rectángulo'`, que comprueba el área esperada.
  - `detectar.test.ts`: en lugar del test actual `'armario girado que atraviesa la pared: la zona es su huella'` (l.31-39), `'… la zona es su huella y el hueco, la parte que queda dentro'`. Se comprueba que el área del hueco más el área que sale es igual al área de la huella.
  - `detectar.test.ts`: `'un mueble entero fuera no tiene hueco'`.
  - `Lienzo.test.tsx`: `'un mueble que sale de la estancia pinta un path evenodd'`.
- [ ] **Step 2:** Se ejecuta. Expected: fallan.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecutan `npm test` y `npm run e2e`. Este último usa `[data-zona-conflicto]` y tiene que seguir pasando. Expected: verde.
- [ ] **Step 5:** Commit `fix(web): fuera de la estancia se pinta en rojo solo la parte que sale`.

### Task 11: Cotas de la posición de puertas, ventanas y radiadores

**Files:**
- Modify:
  - `web/src/nucleo/edicion/cotas.ts`, más su export en `nucleo/index.ts` y la lista de `index.test.ts`;
  - `web/src/editor/lienzo/capas/CapaCotas.tsx`, con el componente nuevo `CotasEnPared`;
  - `web/src/editor/lienzo/Lienzo.tsx`;
  - `web/src/editor/lienzo/lienzo.css`.
- Test: `web/src/nucleo/edicion/cotas.test.ts`, `web/src/editor/lienzo/Lienzo.test.tsx`

**Interfaces:**
- **Produces:** `cotasEnPared(planta: Punto[], pared: number, posicion: number, ancho: number): Cota[]`.
  - Devuelve hasta dos cotas: del vértice `planta[pared]` al inicio del hueco (valor `posicion`), y del final del hueco al vértice siguiente (valor `longitudPared - posicion - ancho`).
  - Omite las de valor ≤ `TOLERANCIA_CM`.
  - Valores redondeados como en `cotasAParedes`.
- **`CotasEnPared`:**
  - Se dibuja en el paso 1 cuando la selección es una abertura, o una estructura de tipo radiador.
  - Las líneas van por dentro de la estancia, desplazadas `+n · 20 px / escala` (por fuera ya están la cota de la pared y el «+»).
  - Cada cota es un `<g data-cota-en-pared={i} className="capa-cotas__cota capa-cotas--elemento">`, con el texto `"N cm"` en `.lienzo__texto`, sin eventos de puntero.
  - Se ve también durante el arrastre, porque la selección ya existe.

- [ ] **Step 1: Tests que fallan.**
  - `cotas.test.ts`: `'puerta de 82 a 50 cm del inicio en una pared de 400 da 50 y 268'`, y `'una puerta pegada al inicio da una sola cota'`.
  - `Lienzo.test.tsx`: `'al seleccionar una puerta se ven sus dos cotas en la pared'`, con los textos «50 cm» y «268 cm»; y `'al arrastrarla se actualizan'`.
- [ ] **Step 2:** Se ejecuta. Expected: fallan.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecutan `npm test` y `npm run lint`. Expected: verde.
- [ ] **Step 5:** Commit `feat(web): cotas de la posición de puertas, ventanas y radiadores en su pared`.

### Task 12: Arrastrar muebles del catálogo con el dedo

**Files:**
- Modify:
  - `web/src/editor/paneles/PanelCatalogo.tsx`;
  - `web/src/editor/lienzo/arrastres.ts` (`EVENTO_SOLTAR_TIPO`), `web/src/editor/comunes/iconos.ts` (icono `mover`) y `web/src/editor/lienzo/PistasDelPlano.tsx` (pista táctil);
  - `web/src/editor/Editor.tsx`, que pasa `alEmpezarArrastre={() => setHoja(null)}` a `PanelCatalogo`;
  - `web/src/editor/lienzo/Lienzo.tsx`;
  - `web/src/editor/lienzo/usarPuntoDelPlano.ts`, donde `puntoDelPlano` acepta `{ clientX: number; clientY: number }`;
  - `web/src/editor/editor.css`;
  - `web/src/textos.ts`.
- Test: `web/src/editor/paneles/PanelCatalogo.test.tsx`

**Interfaces:**
- **Produces:**
  - `export const EVENTO_SOLTAR_TIPO = 'decorazon:soltar-tipo'`, en `arrastres.ts`. Es un `CustomEvent<{ tipo: string; clientX: number; clientY: number }>` que se despacha sobre el `.lienzo__svg`.
  - `PanelCatalogo` gana la prop opcional `alEmpezarArrastre?: () => void`.

**Diseño:** la lista tiene que poder desplazarse con el dedo, así que el arrastre empieza desde un asa y no desde la tarjeta.
- **El asa:** cada tarjeta lleva un asa `<span className="panel-catalogo__asa" aria-hidden="true">` con el icono `mover`, que se añade a `iconos.ts`.
  - Tiene `touch-action: none` y solo se ve con `@media (pointer: coarse)`.
  - En `pointerdown` sobre el asa se hace `stopPropagation`, se captura el puntero y se llama a `alEmpezarArrastre`, que cierra la hoja.
  - Mientras dura el arrastre, un fantasma `position: fixed` con el nombre del mueble sigue el puntero.
- **Al soltar:**
  - Si `document.elementFromPoint(x, y)?.closest('.lienzo__svg')` encuentra el lienzo, se le despacha `EVENTO_SOLTAR_TIPO`.
  - El `Lienzo` escucha ese evento en un `useEffect` y, en el paso 2, llama a `anadirTipo(tipo, puntoDelPlano(contexto, detalle))`.
  - Si se suelta fuera, no se hace nada.
  - En ningún caso se dispara el clic de la tarjeta.
- **Con ratón:** el `draggable` de HTML5 se queda igual.
- **Textos:** la pista del paso 2 en táctil dice «Arrastra un mueble por su asa ⠿ hasta el plano» (`textos.lienzo.pistas.paso2Tactil`). `PistasDelPlano` la elige con `matchMedia('(pointer: coarse)')`, siempre que exista.

- [ ] **Step 1: Tests que fallan.** Se renderiza `<><PanelCatalogo /><Lienzo /></>` como en `usarAtajos.test.tsx`, con `document.elementFromPoint` asignado a mano.
  - `'arrastrar con el dedo desde el asa y soltar en el plano añade el mueble ahí'`: `pointerDown` sobre el asa de Armario con `{ pointerType: 'touch', pointerId: 1, clientX: 50, clientY: 50 }`, `pointerMove` y después `pointerUp` en (120, 140), con `elementFromPoint` devolviendo el svg. Expected: un armario en (120, 140), porque en jsdom la vista es la identidad.
  - `'soltar fuera del plano no añade nada ni dispara el clic'` (Review Focus 5): con `elementFromPoint` devolviendo un nodo del panel, `documento.elementos` queda vacío.
  - `'empezar a arrastrar cierra la hoja'`: se llama a `alEmpezarArrastre`.
  - Se mantiene el test actual: pulsar la tarjeta la añade en el centro.
- [ ] **Step 2:** Se ejecuta. Expected: fallan.
- [ ] **Step 3:** Se implementa.
- [ ] **Step 4:** Se ejecutan `npm test`, `npm run lint`, `npm run build` y `npm run e2e`. Expected: verde.
- [ ] **Step 5:** Prueba manual en la vista previa (puerto 5322), con Chrome emulando el táctil si está disponible; si no, se anota que no se ha podido hacer. Después se cierra el puerto.
- [ ] **Step 6:** Commit `feat(web): arrastrar muebles del catálogo con el dedo`.

### Task 13: Cierre

- [ ] **Step 1:** Se marcan con `[x]` y «(Hecho en el plan 7.)» los puntos que resuelve este plan:
  - en `2026-10-30-05-pendientes.md`: M7, M8, dos pestañas, `comprobar()`, renombrado, `beforeunload`, `POST` duplicado y Mis diseños;
  - en `2026-10-29-03-pendientes.md`: tirador, `fueraDeEstancia`, cotas de puertas y ventanas, y arrastre táctil.
- [ ] **Step 2:** Se ejecutan `npm test`, `npm run lint`, `npm run build`, `npm run e2e`, `dotnet test Decorazon.slnx` y `dotnet build Decorazon.slnx -warnaserror`. Expected: verde.
- [ ] **Step 3:** Commit `docs: pendientes resueltos en el plan 7`, PR con el CI en verde y fusión con el sí de Angel. La publicación con `srv subir` va aparte, también con su sí.
