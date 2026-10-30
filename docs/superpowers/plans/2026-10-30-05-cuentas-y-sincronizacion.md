# Plan 5: cuentas, Mis diseños, sincronización y PWA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unir la web con la API ya construida. Con este plan se puede:
- registrarse por correo y conservar el diseño anónimo, también si el enlace se abre en otro dispositivo;
- iniciar sesión, recuperar la contraseña y gestionar la cuenta;
- usar "Mis diseños", con autoguardado, concurrencia y trabajo sin conexión;
- instalar Decorazon como PWA.

**Architecture:** La API (C#) solo se retoca para que su OpenAPI sirva para generar el cliente y para cerrar los pendientes del plan 2. El contrato se genera en tiempo de compilación en `web/src/api/openapi.json`, y de él salen los tipos TypeScript (`openapi-typescript`) y un cliente tipado (`openapi-fetch`). En el front:
- un almacén de sesión (Zustand) guarda el JWT;
- páginas nuevas para las cuentas y "Mis diseños";
- el editor gana un **origen**: el diseño anónimo en `localStorage`, como hasta ahora, o un diseño del servidor con autoguardado, `If-Match` y copia local por id para seguir sin conexión.

**Tech Stack:** .NET 10 (Microsoft.AspNetCore.OpenApi y Microsoft.Extensions.ApiDescription.Server), React 19, `openapi-typescript`, `openapi-fetch`, `vite-plugin-pwa` y Playwright (con la API real y PostgreSQL para el recorrido de cuentas).

**Spec:** `docs/superpowers/specs/2026-10-24-decorazon-design.md` (§4.1, §5, §7 "El cliente TypeScript del front se genera desde él", §8 E2E y §9 PWA/analítica). Pendientes que recoge: `docs/superpowers/plans/2026-10-25-02-pendientes.md` ("Para el plan 5" y dos arreglos pequeños de la API).

## Global Constraints

- **Rutas de los enlaces de correo** (ya fijadas en la API):
  - `{BaseDeLaWeb}/registro/confirmar?token=…`
  - `{BaseDeLaWeb}/contrasena/restablecer?token=…`
- **Contraseñas:** mínimo 12 caracteres y máximo 128. Nombre: máximo 100 (`PeticionDeConfirmarRegistro`). Las contraseñas viajan solo en el cuerpo de un POST o DELETE, nunca en la URL.
- **Límites:** 100 diseños por usuario y 1 MB por contenido (§5.4).
- **Contenido:** se envía como **objeto** JSON y con todos los números redondeados a 2 decimales (`redondearNumeros`). La API rechaza exponentes y números de más de 32 caracteres.
- **Concurrencia:** `PUT /disenos/{id}` exige `If-Match: "<version>"`.
  - Sin la cabecera, la API responde 428.
  - Con otra versión, 412 con `{ mensaje, version }` y `ETag`.
  - Un diseño ajeno o inexistente da 404.
- **Autoguardado:** **2 s** tras el último cambio. El indicador muestra "Guardado", "Guardando…" o "Sin conexión" (§5.4).
- **Concurrencia en la web:** si el diseño cambió en otro sitio, se avisa y se ofrece **recargar o sobrescribir** (§5.4). Nunca se sobrescribe nada en silencio (§5.2).
- **Uso anónimo:** un solo diseño anónimo. "Nuevo diseño" sin cuenta avisa de que lo reemplaza (ya hecho en el plan 3).
- **Al iniciar sesión con un diseño anónimo no vacío** se pregunta "¿Guardar este diseño en tu cuenta?". Sí lo sube como diseño nuevo, No lo descarta, y si la cuenta está en el máximo se avisa y el diseño se queda en local (§5.2 bis).
- **Al cerrar sesión** se borran del navegador las copias locales de sus diseños, y el editor anónimo empieza vacío (§5.2 bis).
- **Tras cambiar la contraseña** (204), el token de la sesión deja de valer: la web vuelve a pedir el inicio de sesión (pendiente del plan 2).
- **Puertos en local:** API `http://localhost:5320` y web `5321`; `vite preview` del E2E en `5322`. La URL de la API se lee de `import.meta.env.VITE_API_URL`, que por defecto es `http://localhost:5320`. En `.env.production` va `https://decorazon-api.angelgf.com.es`.
- Textos en `web/src/textos.ts`, solo en español. Nombres en español y sin `any`.
- Ningún secreto en el repositorio (CLAUDE.md).

## Review Focus

1. **Sesión caducada o revocada** (JWT vencido, contraseña cambiada en otro dispositivo, cuenta borrada): la primera respuesta 401 cierra la sesión local y lleva a "Entrar" con un aviso. El diseño abierto conserva su copia local y no se pierde. → test en Task 4.
2. **Sin red a mitad de un autoguardado:** el indicador pasa a "Sin conexión" y la copia local se conserva. Al volver la red (`online`) se reintenta con la misma regla de `If-Match`. Si mientras tanto alguien lo cambió en otro sitio, sale el aviso de recargar o sobrescribir. → test en Task 7.
3. **Enlace de confirmación o de restablecer caducado, usado o manipulado:** se muestra el mensaje de la API y un camino para pedir otro enlace, sin pantalla rota. → test en Task 5.
4. **Iniciar sesión con un diseño anónimo cuando la cuenta ya tiene 100 diseños:** se avisa y el diseño se queda en local, sin perderse. → test en Task 8.
5. **El mismo diseño abierto en dos pestañas:** la segunda en guardar recibe el aviso de recargar o sobrescribir, no pisa en silencio. → test en Task 7 (unitario con dos versiones) y en el E2E de Task 11.

---

## Estructura de ficheros

```
src/Decorazon.Api/Endpoints/*.cs        TypedResults/Produces, operationId, cabeceras
src/Decorazon.Api/OpenApi/*.cs          transformadores (Bearer, contenido objeto, If-Match/ETag)
src/Decorazon.Contratos/RespuestaDeMensaje.cs  (renombre de RespuestaDeError)
src/Decorazon.Infraestructura/Correo/EnviadorDeCorreoACarpeta.cs
web/src/api/openapi.json                generado por el build de la API (en git)
web/src/api/esquema.d.ts                generado por openapi-typescript (en git)
web/src/api/cliente.ts                  openapi-fetch + Bearer + errores
web/src/cuenta/sesion.ts                almacén de sesión
web/src/cuenta/paginas/{Entrar,Registro,ConfirmarRegistro,OlvidoContrasena,RestablecerContrasena,MiCuenta}.tsx
web/src/disenos/paginas/MisDisenos.tsx
web/src/disenos/servidor.ts             operaciones de diseños sobre el cliente
web/src/editor/estado/origen.ts         origen del diseño (anónimo o servidor)
web/src/editor/persistencia/sincronizacion.ts  autoguardado, If-Match, copia local, sin conexión
web/src/editor/paneles/ConflictoDeVersion.tsx
web/src/paginas/Privacidad.tsx
web/src/analitica.ts
web/e2e/cuentas.spec.ts, web/playwright.cuentas.config.ts
```

---

### Task 1: API: OpenAPI útil para generar el cliente

**Files:**
- Modify: `src/Decorazon.Api/Endpoints/*.cs`, `src/Decorazon.Api/Program.cs`, `src/Decorazon.Api/Decorazon.Api.csproj`, `src/Decorazon.Contratos/RespuestaDeError.cs` (pasa a `RespuestaDeMensaje.cs`)
- Create: `src/Decorazon.Api/OpenApi/TransformadoresDeOpenApi.cs`, `web/src/api/openapi.json` (generado)
- Test: `tests/Decorazon.Api.Tests/OpenApiTests.cs` y los tests que usen `RespuestaDeError`

**Interfaces:**
- **Respuestas tipadas.** Cada endpoint declara sus respuestas (`TypedResults` o `.Produces<T>(código)`) con estos códigos:
  - `/cuentas/registro`: 200 y 400, 429 y 503;
  - `/cuentas/registro/confirmar`: 200 y 400;
  - `/sesiones`: 200 y 401;
  - `/cuentas/yo`: GET 200 y 401; DELETE 204, 400 y 401;
  - `/cuentas/contrasena/olvido`: 200, 400 y 429;
  - `/cuentas/contrasena/restablecer`: 200 y 400;
  - `/cuentas/contrasena`: 204, 400 y 401;
  - `GET /disenos`: 200;
  - `POST /disenos`: 201 (con `Location` y `ETag`), 400 y 409;
  - `GET /disenos/{id}`: 200 y 404;
  - `PUT /disenos/{id}`: 200, 400, 404, 412 (`RespuestaDeVersionDistinta`) y 428;
  - `POST /disenos/{id}/duplicar`: 201, 404 y 409;
  - `DELETE /disenos/{id}`: 204 y 404;
  - `/salud`: 200 y 503.
- **`operationId`** con `.WithName(...)`, en camelCase español: `solicitarRegistro`, `confirmarRegistro`, `iniciarSesion`, `obtenerMiCuenta`, `borrarMiCuenta`, `solicitarOlvidoDeContrasena`, `restablecerContrasena`, `cambiarContrasena`, `listarDisenos`, `crearDiseno`, `obtenerDiseno`, `actualizarDiseno`, `duplicarDiseno`, `borrarDiseno` y `consultarSalud`.
- **`RespuestaDeMensaje(string Mensaje)`** sustituye a `RespuestaDeError` en todas las respuestas, de error y de éxito. El JSON no cambia: sigue siendo `{ "mensaje": "…" }`.
- **Validación:** `builder.Services.AddValidation()` hace que las DataAnnotations de los contratos se apliquen. Los 400 del framework (JSON mal formado, cuerpo ausente o validación) responden con cuerpo `RespuestaDeMensaje`, usando el primer mensaje de validación o "La petición no es válida.".
- **Transformadores de OpenAPI:**
  - esquema de seguridad `Bearer` (http, bearer, JWT), aplicado a `/cuentas/yo`, `/cuentas/contrasena` y `/disenos*`;
  - `contenido` de `PeticionDeDiseno` y `RespuestaDeDiseno` descrito como `type: object`;
  - parámetro de cabecera `If-Match` (string, obligatorio) en `PUT /disenos/{id}`;
  - cabecera de respuesta `ETag` en `GET`, `PUT` y `POST /disenos*`.
- **Documento en tiempo de compilación:** `Microsoft.Extensions.ApiDescription.Server` con `<OpenApiDocumentsDirectory>../../web/src/api</OpenApiDocumentsDirectory>` y `<OpenApiGenerateDocumentsOptions>--file-name openapi</OpenApiGenerateDocumentsOptions>`. Así `dotnet build` escribe `web/src/api/openapi.json`, que va en git.
  - Si la generación necesita configuración (Jwt o cadena de conexión) en el proceso de build, se arregla para que no la exija. Un valor ficticio solo sirve para el documento, nunca para el arranque real.

- [ ] **Step 1: Tests que fallan** (`OpenApiTests.cs`, con `WebApplicationFactory` y `GET /openapi/v1.json`):
  - existe `components.securitySchemes.Bearer`;
  - `paths["/disenos/{id}"].put.operationId == "actualizarDiseno"`;
  - `PUT` lista las respuestas `412` y `428` y el parámetro `If-Match` en `header`;
  - `components.schemas.PeticionDeDiseno.properties.contenido.type == "object"`;
  - `POST /cuentas/registro` con `{ "correo": "" }` → 400 con cuerpo `{ "mensaje": … }`;
  - `POST /sesiones` con el cuerpo `"{"` → 400 con `mensaje`.
- [ ] **Step 2:** `dotnet test Decorazon.slnx --filter "FullyQualifiedName~OpenApi"` → FAIL.
- [ ] **Step 3:** Implementar, renombrar `RespuestaDeError` en todo el código y los tests, y configurar la generación del documento.
- [ ] **Step 4:** `dotnet build Decorazon.slnx -warnaserror` (genera `web/src/api/openapi.json`) y `dotnet test Decorazon.slnx` → todo PASS.
- [ ] **Step 5:** Commit `feat(api): OpenAPI tipado con operationId, Bearer, If-Match y documento generado en el build`.

---

### Task 2: API: arreglos pendientes y correo a carpeta para el E2E

**Files:**
- Modify: `src/Decorazon.Api/Endpoints/ContrasenasEndpoints.cs`, `src/Decorazon.Infraestructura/Correo/{EnviadorDeCorreoBrevo,OpcionesDeCorreo}.cs`, la composición del correo (donde se elige el enviador), `src/Decorazon.Api/appsettings.Example.json`
- Create: `src/Decorazon.Infraestructura/Correo/EnviadorDeCorreoACarpeta.cs`
- Test: los proyectos de tests correspondientes

**Interfaces:**
- **"Contraseña olvidada" con Brevo caído:** se registra el fallo en el log y se responde `200 Aceptada`, igual que para una cuenta inexistente, sin el 503. Hoy esa diferencia filtra que la cuenta existe.
- **`EnviadorDeCorreoBrevo`:** `ReadAsStringAsync` del cuerpo de error pasa dentro del `try`. Un corte de red ahí da el mismo resultado de "servicio no disponible" que el resto.
- **`Correo:CarpetaDeSimulados`** (string, opcional): si `UsarBrevo` es `false` y la opción tiene valor, `EnviadorDeCorreoACarpeta` escribe cada correo en `<carpeta>/<yyyyMMddHHmmssfff>-<guid>.txt`, con las líneas `Para: …`, `Asunto: …` y una línea en blanco seguida del cuerpo. Además lo registra en el log como el de consola. La carpeta se crea si no existe.
  - Fuera de Development y Testing la opción se rechaza al arrancar, igual que el correo simulado.
- **`appsettings.Example.json`:** `Cors:Origenes` incluye `http://localhost:5322` (el preview del E2E). Se añade `"CarpetaDeSimulados": ""` con un comentario.

- [ ] **Step 1: Tests que fallan:**
  - olvido con un enviador que lanza → 200 con el mensaje de aceptada;
  - Brevo con un `HttpMessageHandler` que lanza al leer el cuerpo de error → el mismo resultado que un 5xx;
  - `EnviadorDeCorreoACarpeta` escribe un fichero con `Para:`, `Asunto:` y el enlace en el cuerpo;
  - `CarpetaDeSimulados` en el entorno `Production` → la validación de opciones falla.
- [ ] **Step 2:** `dotnet test` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `dotnet build -warnaserror` y `dotnet test` → PASS.
- [ ] **Step 5:** Commit `fix(api): olvido sin filtrar cuentas con Brevo caído, error de red en Brevo y correo a carpeta para pruebas`.

---

### Task 3: Cliente TypeScript generado

**Files:**
- Modify: `web/package.json` (dependencia `openapi-fetch`; de desarrollo, `openapi-typescript`; script `"api:tipos": "openapi-typescript src/api/openapi.json -o src/api/esquema.d.ts"`), `.github/workflows/verificar.yml`
- Create: `web/src/api/esquema.d.ts` (generado), `web/src/api/cliente.ts` (+ test), `web/.env.production`

**Interfaces:**
- **Ficheros:** `cliente.ts` exporta `api` (`createClient<paths>` con `baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5320'`) y lo que sigue.
- **`class ErrorDeApi extends Error { estado: number; mensaje: string; version?: number }`:**
  - `mensaje` sale del cuerpo `{ mensaje }`;
  - si no hay cuerpo, un texto por estado de `textos.api` (0 sin red: "No hay conexión", 401 "Tu sesión ha caducado", 404 "No existe o no es tuyo", 409 "Has llegado al límite de 100 diseños", 429 "Demasiados intentos; espera un poco", y 5xx "El servicio no está disponible; inténtalo más tarde").
- **`fijarFuenteDeToken(f: () => string | null): void` y `alNoAutorizado(f: () => void): void`:** un middleware de `openapi-fetch` añade `Authorization: Bearer <token>` si hay token y llama a `alNoAutorizado` ante un 401 en una petición que llevaba token.
- **`exigir<T>(r: { data?: T; error?: unknown; response: Response }): T`:** devuelve `data` o lanza `ErrorDeApi`. Un error de red (`TypeError` de fetch) se convierte en `ErrorDeApi` con `estado` 0.
- **`.env.production`:** `VITE_API_URL=https://decorazon-api.angelgf.com.es`.
- **CI** (job `web`): tras `npm ci`, `npm run api:tipos && git diff --exit-code src/api/esquema.d.ts`. En el job `api`, tras el build, `git diff --exit-code web/src/api/openapi.json`. Así el contrato y los tipos siempre van al día.

- [ ] **Step 1: Tests que fallan** (`cliente.test.ts`, con `fetch` simulado con `vi.fn`):
  - con un token fijado, la petición lleva `Authorization: Bearer t`;
  - sin token, no la lleva;
  - un 401 con token llama a `alNoAutorizado`;
  - un 401 sin token, no;
  - `exigir` ante un 412 `{ mensaje: 'x', version: 7 }` lanza un `ErrorDeApi` con `estado` 412 y `version` 7;
  - un `fetch` que lanza `TypeError` → `ErrorDeApi` con `estado` 0 y "No hay conexión".
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Instalar, generar `esquema.d.ts` e implementar.
- [ ] **Step 4:** `npm test`, `npm run build` y `npm run lint` → PASS.
- [ ] **Step 5:** Commit `feat(web): cliente tipado generado desde el OpenAPI de la API`.

---

### Task 4: Sesión: entrar, olvido y restablecer

**Files:**
- Create: `web/src/cuenta/sesion.ts` (+ test), `web/src/cuenta/paginas/{Entrar,OlvidoContrasena,RestablecerContrasena}.tsx` (+ tests), `web/src/cuenta/cuenta.css`
- Modify: `web/src/App.tsx` (rutas), `web/src/main.tsx`, `web/src/editor/paneles/BarraSuperior.tsx`, `web/src/paginas/Inicio.tsx`, `textos.ts`

**Interfaces:**
- **`sesion.ts`:** almacén Zustand `sesion` con `{ token: string | null; caducidad: string | null; usuario: { nombre: string; correo: string } | null }`, persistido en `localStorage` bajo `decorazon.sesion` (solo el token y la caducidad, con try/catch como en `local.ts`).
  - **Acciones:**
    - `iniciarSesion(correo, contrasena): Promise<void>`: llama a `POST /sesiones` y después a `GET /cuentas/yo`;
    - `cargarUsuario(): Promise<void>`;
    - `cerrarSesion(motivo?: 'caducada'): void`: borra el token y el usuario; lo que se borra del navegador lo amplía Task 8;
    - `haySesion(): boolean`: hay token y `caducidad` es mayor que ahora.
  - **Arranque** (`main.tsx`): `fijarFuenteDeToken(() => haySesion() ? token : null)` y `alNoAutorizado(() => cerrarSesion('caducada'))`. Si hay sesión, `cargarUsuario()`.
- **Rutas:** `/entrar`, `/contrasena/olvido` y `/contrasena/restablecer`. Esta última lee `token` de la query y lo quita de la URL nada más leerlo, con `history.replaceState`.
- **`Entrar`:**
  - correo y contraseña; con error, el `mensaje` de la API;
  - si viene `?motivo=caducada`, el aviso "Tu sesión ha caducado. Vuelve a entrar.";
  - al entrar, va a la ruta guardada en `?volver=` (solo rutas internas que empiecen por `/` y no por `//`) o a `/disenos`;
  - enlaces "¿Has olvidado la contraseña?" y "Crear cuenta" (`/registro`).
- **`OlvidoContrasena`:** correo y el `mensaje` de la API, siempre el mismo, exista o no la cuenta.
- **`RestablecerContrasena`:**
  - contraseña y repetición; deben coincidir y tener 12–128 caracteres, comprobado antes de enviar;
  - con éxito, va a `/entrar` con el mensaje de la API;
  - con 400, muestra el mensaje y un enlace "Pedir otro enlace" (`/contrasena/olvido`), según Review Focus 3.
- **Barra superior:** sin sesión, "Entrar"; con sesión, "Mis diseños" y el nombre del usuario, que enlaza a `/cuenta` (Task 9).
- **Inicio:** con sesión, botón "Mis diseños".
- **Caducidad (Review Focus 1):** `cerrarSesion('caducada')` navega a `/entrar?motivo=caducada&volver=<ruta actual>`, con un `navigate` registrado desde un componente de la app.

- [ ] **Step 1: Tests que fallan.**
  - `sesion.test.ts`, con fetch simulado:
    - `iniciarSesion` guarda el token y el usuario y persiste en `decorazon.sesion`;
    - `haySesion` es falso con una caducidad pasada;
    - `cerrarSesion` borra la clave;
    - un 401 en cualquier llamada con token deja `token null`.
  - `Entrar.test.tsx`:
    - credenciales malas muestran "Correo o contraseña incorrectos" (el `mensaje` simulado de la API);
    - con `?volver=/disenos/abc` navega allí al entrar;
    - `?volver=//evil.com` se ignora.
  - `RestablecerContrasena.test.tsx`:
    - contraseñas distintas no envían;
    - un 400 de la API muestra el mensaje y "Pedir otro enlace";
    - el token desaparece de la URL tras montar.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test`, `npm run build` y `npm run lint` → PASS.
- [ ] **Step 5:** Commit `feat(web): sesión con JWT, entrar, contraseña olvidada y restablecer`.

---

### Task 5: Registro con el diseño anónimo

**Files:**
- Create: `web/src/cuenta/paginas/{Registro,ConfirmarRegistro}.tsx` (+ tests)
- Modify: `web/src/App.tsx`, `web/src/editor/paneles/BarraSuperior.tsx` (+ test), `web/src/editor/persistencia/local.ts`, `textos.ts`

**Interfaces:**
- **`Registro`** (`/registro`):
  - un campo de correo;
  - si hay un diseño anónimo no vacío (`documento !== null` y `elementos + aberturas + estructura > 0`), muestra "Tu diseño actual se guardará en tu cuenta" y lo envía como `diseno: { nombre: textos.registro.nombrePorDefecto ("Mi primer diseño"), tipoEstancia, contenido: redondearNumeros(doc) }`;
  - con 200, muestra el `mensaje` de la API ("revisa tu correo") y guarda en `localStorage` `decorazon.registroEnviado` = `serializarDocumento(doc)`, que Task 8 usa;
  - con 429, 503 o 400, muestra el mensaje.
- **`ConfirmarRegistro`** (`/registro/confirmar?token=`):
  - quita el token de la URL al montarse, como en restablecer;
  - pide nombre (1–100) y contraseña dos veces (12–128);
  - con 200, va a `/entrar` con el mensaje "Cuenta creada. Ya puedes iniciar sesión." y, si había diseño, con "Tu diseño te espera en Mis diseños";
  - con 400 (enlace caducado o usado), el mensaje y el enlace "Volver a registrarte" (Review Focus 3).
- **Barra superior:** sin sesión y en el editor anónimo aparece "Guardar", que lleva a `/registro` (§5.2 punto 1). Con sesión y editor anónimo, "Guardar en mi cuenta" (Task 8).
- **Nota:** el registro desde otro dispositivo ya lo resuelve la API: el diseño viaja con la solicitud y queda como primer diseño al confirmar. El front solo envía y explica.

- [ ] **Step 1: Tests que fallan.**
  - `Registro.test.tsx`:
    - con un diseño anónimo que tiene un elemento, el cuerpo enviado lleva `diseno.contenido` con los números redondeados (un `posicion.x = 1e-17` sale `0`) y `diseno.nombre` "Mi primer diseño";
    - sin diseño, no lleva `diseno`;
    - con 200 se guarda `decorazon.registroEnviado`.
  - `ConfirmarRegistro.test.tsx`:
    - nombre vacío no envía;
    - un 400 muestra el mensaje y "Volver a registrarte";
    - un 200 navega a `/entrar`.
  - `BarraSuperior.test.tsx`: sin sesión, "Guardar" navega a `/registro`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test`, `npm run build` y `npm run lint` → PASS.
- [ ] **Step 5:** Commit `feat(web): registro que conserva el diseño anónimo y confirmación desde el enlace`.

---

### Task 6: Mis diseños

**Files:**
- Create: `web/src/disenos/servidor.ts` (+ test), `web/src/disenos/paginas/MisDisenos.tsx` (+ test), `web/src/disenos/disenos.css`
- Modify: `web/src/App.tsx`, `textos.ts`

**Interfaces:**
- **`servidor.ts`:**
  - `listarDisenos(): Promise<ResumenDiseno[]>`;
  - `obtenerDiseno(id): Promise<{ diseno: DisenoServidor; version: number }>`;
  - `crearDiseno(nombre, doc): Promise<DisenoServidor>`;
  - `guardarDiseno(id, version, cambios: { nombre?: string; doc?: DocumentoDiseno }): Promise<DisenoServidor>`, con `If-Match: "<version>"`;
  - `duplicarDiseno(id): Promise<DisenoServidor>`;
  - `borrarDiseno(id): Promise<void>`.
  - Los tipos `ResumenDiseno` y `DisenoServidor` salen de `esquema.d.ts`, y `DisenoServidor.contenido` se valida con `validarDocumento`.
  - Todo `contenido` enviado pasa por `redondearNumeros`, y `tipoEstancia` sale de `doc.estancia.tipo`.
- **`MisDisenos`** (`/disenos`, protegida: sin sesión va a `/entrar?volver=/disenos`):
  - lista ordenada por `fechaDeModificacion` descendente, con nombre, tipo de estancia en texto ("Dormitorio", "Salón", "Cocina") y fecha relativa ("hace 5 min") o fecha corta;
  - **"Nuevo diseño"** abre `NuevaEstancia` en un diálogo, crea el diseño en el servidor con el nombre "Diseño sin título" y abre `/disenos/<id>`;
  - por fila, **"Abrir"** (`/disenos/<id>`), **"Renombrar"** (campo en línea; `guardarDiseno` con `nombre`; un 412 recarga la lista y avisa), **"Duplicar"** y **"Borrar"** (con `Confirmar`: "¿Borrar «<nombre>»? No se puede deshacer.");
  - con 0 diseños: "Aún no tienes diseños" y el botón de crear;
  - un 409 al crear o duplicar muestra "Has llegado al límite de 100 diseños".

- [ ] **Step 1: Tests que fallan.**
  - `servidor.test.ts`:
    - `guardarDiseno` envía `If-Match: "3"`;
    - `crearDiseno` envía el contenido redondeado y `tipoEstancia` del documento;
    - un contenido inválido del servidor lanza un error.
  - `MisDisenos.test.tsx`:
    - lista 2 diseños en orden;
    - "Borrar" con confirmación llama a `DELETE` y quita la fila;
    - "Duplicar" con 409 muestra el aviso del límite;
    - sin sesión, navega a `/entrar?volver=/disenos`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test`, `npm run build` y `npm run lint` → PASS.
- [ ] **Step 5:** Commit `feat(web): Mis diseños con crear, abrir, renombrar, duplicar y borrar`.

---

### Task 7: Editor con diseño del servidor: autoguardado, concurrencia y sin conexión

**Files:**
- Create: `web/src/editor/estado/origen.ts`, `web/src/editor/persistencia/sincronizacion.ts` (+ test), `web/src/editor/paneles/ConflictoDeVersion.tsx` (+ test), `web/src/disenos/paginas/EditorDeDiseno.tsx`
- Modify: `web/src/editor/estado/almacen.ts` (+ test), `web/src/editor/persistencia/local.ts`, `web/src/editor/paneles/BarraSuperior.tsx`, `web/src/main.tsx`, `web/src/App.tsx`, `textos.ts`

**Interfaces:**
- **`origen.ts`:** `type Origen = { tipo: 'anonimo' } | { tipo: 'servidor'; id: string; version: number; nombre: string }`.
  - `EstadoEditor` gana `origen: Origen` (por defecto anónimo) y amplía `guardado` a `'guardado' | 'pendiente' | 'error' | 'sinConexion' | 'conflicto'`.
  - `abrirDelServidor(id, version, nombre, doc)` carga el documento con origen servidor, sin historial.
  - `volverAAnonimo()` restaura el diseño anónimo desde `localStorage`.
- **Persistencia anónima** (`conectarPersistencia` del plan 3): solo actúa con origen anónimo. Con origen servidor no toca `decorazon.disenoAnonimo`.
- **`sincronizacion.ts`:** `conectarSincronizacion(a: StoreApi<EstadoEditor>, opciones = { esperaMs: 2000, st: almacenamientoSeguro() }): () => void`.
  - **Al cambiar el documento con origen servidor:**
    - escribe al momento la copia local `decorazon.diseno.<id>` = `{ version, documento, pendiente: true }`;
    - marca `pendiente` y, 2 s después del último cambio, llama a `guardarDiseno(id, version, { doc })`.
  - **Resultado del guardado:**
    - con éxito: `version` nueva, copia local `pendiente: false` y `guardado`;
    - con `ErrorDeApi` 0: `sinConexion`; reintenta en el evento `online` y cada 30 s mientras dure;
    - con 412: `conflicto`, y guarda en el almacén la `versionRemota` del cuerpo;
    - con 401: lo resuelve la sesión (Review Focus 1), y la copia local se conserva;
    - con otros errores: `error`.
  - **`resolverConflicto(eleccion: 'recargar' | 'sobrescribir')`:**
    - recargar hace `obtenerDiseno` y `abrirDelServidor`, y se pierden los cambios locales tras avisar en el diálogo;
    - sobrescribir hace `guardarDiseno(id, versionRemota, { doc })`.
  - **Renombrar desde el editor:** el nombre en la barra es editable y usa `guardarDiseno(..., { nombre })`, con la misma regla de versión.
- **`EditorDeDiseno`** (`/disenos/:id`, protegida). Al montar:
  - si hay copia local `pendiente` con la misma `version` que el servidor, o el servidor no responde (sin conexión), abre la copia local y marca `pendiente` (o `sinConexion`);
  - si el servidor tiene una versión mayor que la de una copia `pendiente`, abre la local y marca `conflicto`;
  - si no, abre la del servidor.
  - Al desmontar, `volverAAnonimo()`.
- **Indicador de la barra:** "Guardado" / "Guardando…" / "Sin conexión" / "Cambiado en otro sitio" / "No se pudo guardar".
- **`ConflictoDeVersion`:** diálogo con "Este diseño se ha guardado desde otro sitio después de que lo abrieras." y los botones "Recargar la versión guardada" y "Sobrescribir con la mía".
- **`/disenar`** sigue siendo el editor anónimo.

- [ ] **Step 1: Tests que fallan.**
  - `sincronizacion.test.ts`, con temporizadores falsos y `servidor` simulado:
    - 3 cambios en 1 s → un solo `guardarDiseno` a los 2 s del último, con `If-Match` de la versión, y la versión sube tras el éxito;
    - la copia local se escribe al instante y queda `pendiente: false` tras guardar;
    - un fallo de red → `sinConexion`; al disparar `online`, reintenta y pasa a `guardado` (Review Focus 2);
    - 412 con `version: 9` → `conflicto`; `resolverConflicto('sobrescribir')` envía `If-Match: "9"`; `resolverConflicto('recargar')` carga el documento remoto;
    - dos almacenes con la misma versión 4: el primero guarda (versión 5) y el segundo recibe 412 → `conflicto` (Review Focus 5);
    - con origen anónimo, no llama al servidor.
  - `ConflictoDeVersion.test.tsx`: los dos botones llaman a `resolverConflicto` con su elección.
  - `almacen.test.ts`: `abrirDelServidor` deja historial vacío y `origen.tipo 'servidor'`; `volverAAnonimo` recupera el diseño anónimo guardado.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test`, `npm run build` y `npm run lint` → PASS.
- [ ] **Step 5:** Commit `feat(web): diseños del servidor con autoguardado, If-Match, conflicto y trabajo sin conexión`.

---

### Task 8: Diseño anónimo al entrar y al salir (§5.2 bis)

**Files:**
- Modify: `web/src/cuenta/sesion.ts` (+ test), `web/src/cuenta/paginas/Entrar.tsx` (+ test), `web/src/editor/paneles/BarraSuperior.tsx` (+ test), `web/src/editor/persistencia/local.ts`, `textos.ts`

**Interfaces:**
- **Tras entrar con éxito:**
  - si hay un diseño anónimo no vacío cuya `serializarDocumento` coincide con `decorazon.registroEnviado`, se descarta sin preguntar, porque ya está en la cuenta desde el registro, y se borra esa clave;
  - si hay otro diseño anónimo no vacío, `Confirmar` pregunta "¿Guardar este diseño en tu cuenta?" con "Sí, guardarlo" / "No, descartarlo":
    - Sí → `crearDiseno("Diseño sin título", doc)`, descartar el anónimo e ir a `/disenos/<id>`;
    - un 409 → aviso "Has llegado al límite de 100 diseños. Tu diseño sigue en este navegador." y el diseño anónimo se queda (Review Focus 4);
    - No → descartar el anónimo.
- **`cerrarSesion`:** además borra todas las claves `decorazon.diseno.*` y el diseño anónimo (`guardarDisenoLocal(st, null)` y `descartar` en el almacén), y navega a `/`.
- **Barra superior, con sesión y editor anónimo:** "Guardar en mi cuenta" → `crearDiseno` y navega a `/disenos/<id>`, con el mismo aviso del límite.

- [ ] **Step 1: Tests que fallan.**
  - Entrar con un diseño anónimo que tiene un elemento → aparece la pregunta; "Sí" llama a `crearDiseno` y navega a `/disenos/<id>`.
  - Con 409 → aviso y el diseño anónimo sigue en `localStorage`.
  - "No" → anónimo descartado.
  - Con `registroEnviado` igual al diseño → no pregunta y lo descarta.
  - `cerrarSesion` → no queda ninguna clave `decorazon.diseno.*` ni `decorazon.disenoAnonimo`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test`, `npm run build` y `npm run lint` → PASS.
- [ ] **Step 5:** Commit `feat(web): el diseño anónimo pasa a la cuenta al entrar y se limpia al salir`.

---

### Task 9: Mi cuenta y privacidad

**Files:**
- Create: `web/src/cuenta/paginas/MiCuenta.tsx` (+ test), `web/src/paginas/Privacidad.tsx`
- Modify: `web/src/App.tsx`, `web/src/paginas/Inicio.tsx` (pie con el enlace a Privacidad), `textos.ts`

**Interfaces:**
- **`MiCuenta`** (`/cuenta`, protegida):
  - nombre y correo de `usuario`;
  - **"Cambiar contraseña"** (actual, nueva y repetición, 12–128) → `POST /cuentas/contrasena`. Con 204, `cerrarSesion()` sin borrar los diseños locales, porque el usuario es el mismo, y navega a `/entrar` con "Contraseña cambiada. Vuelve a entrar con la nueva." (pendiente del plan 2). Para eso, `cerrarSesion` admite `{ conservarLocales: true }`;
  - **"Cerrar sesión"** → `cerrarSesion()`;
  - **"Borrar mi cuenta"**: `Confirmar` con el texto "Se borrarán tu cuenta y todos tus diseños. No se puede deshacer." y un campo de contraseña. Llama a `DELETE /cuentas/yo` con `{ contrasena }`; con 204, `cerrarSesion()` y navega a `/` con "Tu cuenta se ha borrado."
- **`Privacidad`** (`/privacidad`): página estática con estos textos:
  - qué se guarda: correo, nombre, contraseña cifrada y diseños;
  - para qué: solo para guardar tus diseños;
  - correo por Brevo solo para los enlaces;
  - el diseño anónimo vive solo en tu navegador;
  - borrar la cuenta lo borra todo;
  - contacto: el correo de contacto se lee de `textos.privacidad.contacto`, que queda vacío y oculto hasta que Angel decida cuál publicar (plan 6). No se escribe ningún correo personal en el código.

- [ ] **Step 1: Tests que fallan** (`MiCuenta.test.tsx`):
  - cambiar la contraseña con 204 deja la sesión cerrada, conserva `decorazon.diseno.*` y navega a `/entrar`;
  - un 400 muestra el mensaje;
  - borrar la cuenta pide confirmación y contraseña, envía `DELETE` con la contraseña en el cuerpo (nunca en la URL) y con 204 cierra la sesión y borra las copias locales.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test`, `npm run build` y `npm run lint` → PASS.
- [ ] **Step 5:** Commit `feat(web): Mi cuenta (contraseña, cerrar sesión, borrar cuenta) y página de privacidad`.

---

### Task 10: PWA y analítica

**Files:**
- Modify: `web/package.json` (dependencia de desarrollo `vite-plugin-pwa`), `web/vite.config.ts`, `web/index.html`, `web/src/main.tsx`
- Create: `web/public/iconos/` (`icono-192.png`, `icono-512.png` y `icono-maskable-512.png`, a partir de `icono/decorazon-512.png` y `icono/decorazon.svg`), `web/src/analitica.ts` (+ test)

**Interfaces:**
- **`VitePWA`:** `registerType: 'autoUpdate'`.
  - **Manifiesto:** `name` "Decorazon", `short_name` "Decorazon", `lang` "es", `start_url` "/", `display` "standalone", `theme_color` `#B9473A`, `background_color` `#FFF8F0`, y los tres iconos (el `maskable` con `purpose: 'maskable'`).
  - **Workbox:** precarga del shell, incluido el fragmento de la vista 3D, con `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024`, y `navigateFallback: '/index.html'`.
  - **Sin caché de respuestas de la API.** Los datos sin conexión salen de las copias locales de Task 7: ni `runtimeCaching` para la API ni `navigateFallbackDenylist`, porque la API está en otro origen.
- **`index.html`:** `<meta name="theme-color" content="#B9473A">` y `<link rel="apple-touch-icon" href="/iconos/icono-192.png">`.
- **`analitica.ts`:** `iniciarAnalitica(sitio = import.meta.env.VITE_ANALITICA_SITIO): void`. Si hay `sitio`, inserta `<script async src="https://angelgf.com.es/webanalyticsapi/tracker.js" data-site-id="<sitio>">` una sola vez; sin `sitio`, no hace nada. El ID del sitio nuevo lo crea Angel y se fija en el plan 6. Se llama desde `main.tsx`.

- [ ] **Step 1: Tests que fallan:**
  - `analitica.test.ts`: sin sitio no añade el script; con `'abc'` añade un único script con `data-site-id="abc"` aunque se llame dos veces;
  - comprobación de build: tras `npm run build` existen `dist/manifest.webmanifest` y `dist/sw.js`, y el manifiesto tiene `theme_color` `#B9473A`. Va en un test de Node que lee `dist/` y se salta si `dist` no existe (`describe.skipIf`), o como paso del CI.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar y generar los iconos (con `sharp` como dependencia de desarrollo, o con un script de Node; los PNG van en git).
- [ ] **Step 4:** `npm test`, `npm run build` (ver el manifiesto y `sw.js` en `dist/`), `npm run lint` y `npm run e2e` → PASS.
- [ ] **Step 5:** Commit `feat(web): PWA instalable con precarga del shell y analítica opcional`.

---

### Task 11: E2E de cuentas, CI y documentación

**Files:**
- Create: `web/playwright.cuentas.config.ts`, `web/e2e/cuentas/cuentas.spec.ts`, `web/e2e/cuentas/correo.ts`
- Modify: `web/package.json` (script `"e2e:cuentas": "playwright test -c playwright.cuentas.config.ts"`), `web/playwright.config.ts` (`testIgnore: 'cuentas/**'`), `.github/workflows/verificar.yml`, `CLAUDE.md`, `docs/superpowers/plans/2026-10-25-02-pendientes.md`

**Interfaces:**
- **`playwright.cuentas.config.ts`:**
  - dos `webServer`:
    1. API: `dotnet run --project ../src/Decorazon.Api --urls http://localhost:5320`, con `ASPNETCORE_ENVIRONMENT=Development`, `ConnectionStrings__Decorazon` de la base `decorazon_e2e` en el 5435, `Jwt__ClaveDeFirma` aleatoria de 48 caracteres generada en la propia config (nunca un secreto real), `Correo__UsarBrevo=false`, `Correo__CarpetaDeSimulados=<web/test-results/correos>`, `Correo__BaseDeLaWeb=http://localhost:5322` y `Cors__Origenes__0=http://localhost:5322`; espera a `http://localhost:5320/salud`;
    2. web: `npm run build && npx vite preview --port 5322 --strictPort` con `VITE_API_URL=http://localhost:5320`.
  - La API migra sola en Development.
  - Antes de empezar se vacía la carpeta de correos.
- **`correo.ts`:** `enlaceDelUltimoCorreo(para: string, contiene: string): Promise<string>`. Espera, con sondeo de hasta 10 s, el último fichero de la carpeta dirigido a `para` y devuelve la URL que contiene `contiene`.
- **`cuentas.spec.ts`** (§8: diseñar sin cuenta, registrarse, conservar el diseño, reabrirlo), con un correo único por ejecución (`e2e-<timestamp>@ejemplo.test`):
  1. Diseñar sin cuenta (estancia y un armario) → "Guardar" → registro con el correo → leer el enlace de confirmación → abrirlo, poner nombre y contraseña y confirmar → entrar → la pregunta del diseño anónimo **no** aparece (estaba en el registro) → en `/disenos` está "Mi primer diseño" → abrirlo → hay 1 `[data-elemento]`.
  2. Mover el armario → el indicador pasa por "Guardando…" y acaba en "Guardado" → recargar → la posición movida se conserva.
  3. Dos pestañas (`context.newPage()`) con el mismo diseño: cambiar en la primera y esperar a "Guardado"; cambiar en la segunda → sale "Este diseño se ha guardado desde otro sitio" → "Recargar la versión guardada" → se ve el cambio de la primera (Review Focus 5).
  4. Contraseña olvidada → enlace → nueva contraseña → entrar con ella.
  5. Mi cuenta → "Borrar mi cuenta" con la contraseña → vuelve a `/` y entrar con esas credenciales falla.
- **CI:** job nuevo `e2e-cuentas` con `services: postgres:17` (puerto 5435:5432, usuario, contraseña y base de prueba en texto, solo para CI), setup-dotnet 10 y Node 24, `npx playwright install --with-deps chromium` y `npm run e2e:cuentas`.
- **`CLAUDE.md`:**
  - comandos (`npm run api:tipos`, `npm run e2e:cuentas`, que necesita `docker compose up -d`);
  - el cliente y los tipos se generan desde `web/src/api/openapi.json`, que escribe el build de la API (en git, y CI comprueba que van al día);
  - las claves de `localStorage` (`decorazon.sesion`, `decorazon.disenoAnonimo`, `decorazon.diseno.<id>` y `decorazon.registroEnviado`);
  - la regla de `cerrarSesion`.
- **`2026-10-25-02-pendientes.md`:** marcar como hechos los puntos "Para el plan 5" y los dos arreglos de la API de Task 2.

- [ ] **Step 1:** Escribir `cuentas.spec.ts` y `correo.ts`.
- [ ] **Step 2:** Con `docker compose up -d`, `npm run e2e:cuentas` → registrar lo que falle y por qué.
- [ ] **Step 3:** Corregir lo que el E2E destape, con un test unitario si es lógica, y actualizar el CI y la documentación.
- [ ] **Step 4:** `npm test`, `npm run build`, `npm run lint`, `npm run e2e`, `npm run e2e:cuentas`, `dotnet build Decorazon.slnx -warnaserror` y `dotnet test Decorazon.slnx` → todo PASS.
- [ ] **Step 5:** Commit `test(e2e): recorrido completo de cuentas y diseños con la API real, y CI`.
