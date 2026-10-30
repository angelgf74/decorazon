# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

**Decorazon**: editor web de diseños. Cada usuario crea, guarda y edita sus diseños (hasta 100 por usuario, 1 MB cada uno). Especificación en `docs/superpowers/specs/2026-10-24-decorazon-design.md`; planes y pendientes en `docs/superpowers/plans/`.

## Estructura

```
web/                     editor en TypeScript: web/src/editor es la interfaz (React) y web/src/nucleo/edicion son las operaciones puras; el núcleo (geometría y reglas) vive en web/src/nucleo
src/Decorazon.Dominio    núcleo de la API: entidades, invariantes, puertos. Sin dependencias.
src/Decorazon.Aplicacion casos de uso. → Dominio
src/Decorazon.Infraestructura  EF Core + PostgreSQL, adaptadores. → Dominio
src/Decorazon.Contratos  DTOs públicos. → nadie
src/Decorazon.Api        endpoints mínimos y composición. → Aplicacion, Contratos, Infraestructura
tests/                   un proyecto de tests por capa; Arquitectura.Tests vigila las flechas
```

**Regla de dependencias:** las flechas de arriba son las únicas permitidas; los tests de `Decorazon.Arquitectura.Tests` las hacen cumplir (ensamblados y `.csproj`). Si fallan, se corrige la dependencia, no el test.

## Comandos

```bash
# PostgreSQL local (puerto 5435 del host)
docker compose up -d

# Configuración local (una vez)
cp src/Decorazon.Api/appsettings.Example.json src/Decorazon.Api/appsettings.Development.json

# API en http://localhost:5320 (migra sola en Development)
dotnet run --project src/Decorazon.Api

# Web en http://localhost:5321
cd web && npm run dev -- --port 5321

dotnet build Decorazon.slnx -warnaserror
dotnet test Decorazon.slnx                                  # necesita Docker (Testcontainers)
dotnet test Decorazon.slnx --filter "Categoria!=Integracion" # sin Docker
cd web && npm test                                          # tests del núcleo TS
cd web && npm run e2e                                      # recorrido de extremo a extremo con Playwright (compila y sirve en el 5322)
                                                            # incluye e2e/vista3d.spec.ts: el 3D con SwiftShader (sin GPU), canvas con contenido y sin errores de consola
cd web && npm run e2e:cuentas                              # cuentas y diseños con la API real (5320) y PostgreSQL: necesita docker compose up -d
                                                            # base decorazon_e2e, clave JWT aleatoria y correos en web/test-results/correos
cd web && npm run api:tipos                                # regenera src/api/esquema.d.ts desde src/api/openapi.json
```

`npm run e2e:cuentas` arranca su propia API y su preview: los puertos 5320 y 5322 tienen que estar libres.

## Web ↔ API

- El cliente (`openapi-fetch`) y los tipos (`web/src/api/esquema.d.ts`) salen de `web/src/api/openapi.json`, que escribe el build de la API. Los dos van en git y el CI comprueba que están al día: tras cambiar un contrato, `dotnet build` y `npm run api:tipos`.
- `web/package.json` lleva un `overrides` para que `openapi-typescript` use el TypeScript 6 del proyecto (su peer pide ^5). Se quita cuando `openapi-typescript` soporte TS 6.
- `PUT /disenos/{id}` reemplaza el diseño entero: siempre con `nombre`, `tipoEstancia` y `contenido`, más `If-Match`.
- Claves de `localStorage`:
  - `decorazon.sesion`: token y caducidad;
  - `decorazon.disenoAnonimo`: el diseño sin cuenta;
  - `decorazon.diseno.<id>`: copia local de cada diseño del servidor, con su versión y si tiene cambios sin subir;
  - `decorazon.registroEnviado`: el diseño que viajó con el registro; al entrar no se pregunta si guardarlo solo si la cuenta tiene un diseño con ese mismo contenido (se comprueba en el servidor; ante la duda, se pregunta).
- `cerrarSesion()` (salida voluntaria o borrado de la cuenta) borra las copias `decorazon.diseno.*`, el diseño anónimo y `decorazon.registroEnviado`, y el editor anónimo empieza vacío; "Cerrar sesión" con cambios sin subir pide confirmación antes. `cerrarSesion('caducada')` conserva las copias para subir lo pendiente al volver, y `cerrarSesion({ conservarLocales: true })` (tras cambiar la contraseña, mismo usuario) también. Si otra pestaña cierra la sesión o entra con otra cuenta (evento `storage` sobre `decorazon.sesion`), esta pestaña la olvida, vuelve al anónimo y va al inicio sin borrar nada del almacenamiento.

Los tests de integración llevan `[Trait("Categoria","Integracion")]`; de ahí el filtro.

## Secretos y configuración

- `appsettings.Development.json` está ignorado por git; `appsettings.Example.json` es la plantilla.
- Los secretos de producción van por variables de entorno, con `srv secreto` (skill `servidor`): `ConnectionStrings__Decorazon`, `Jwt__ClaveDeFirma` y `Correo__ClaveDeApi`.
- Los valores de producción que no son secretos viven en `appsettings.json`: el origen CORS y el correo (`Correo:UsarBrevo: true`, remitente y `Correo:BaseDeLaWeb` https).
- El correo depende de `Correo:UsarBrevo`. Con `false` (desarrollo y tests) no se envía: el enlace va al log con `[CORREO SIMULADO]`. Fuera de Development y Testing la API no arranca sin Brevo (salvo `Correo:Simulado: true`) ni con una `Correo:BaseDeLaWeb` que no sea https.

## Reglas globales

- Máximo 100 diseños por usuario y 1 MB por diseño.
- Concurrencia con `ETag` / `If-Match`.
- Diseño ajeno o inexistente: `404`.
- La identidad sale solo del JWT, nunca del cuerpo.

## Lecciones que no son obvias

- `jsonb` rechaza `\u0000` y los escapes de sustituto suelto, así que `ContenidoDeDiseno.Validar` los rechaza.
- Los objetos de valor de nombre y correo rechazan caracteres de control: PostgreSQL no admite NUL en `text`.
- `jsonb` reformatea el JSON guardado: al rehidratar se usa `ContenidoDeDiseno.Reconstruir` y nunca se revalida.
- `IRepositorioDeDisenos.Anadir` solo hace seguimiento; `IRepositorioDeUsuarios.AnadirAsync` guarda el `DbContext` compartido.
- Cambiar la contraseña invalida el token de quien la cambia.
- El contenido rechaza números con exponente o de más de 32 caracteres: jsonb los guarda como `numeric` exacto y `1e200000` reventaba al guardar.
- El diseño anónimo vive en `localStorage` bajo `decorazon.disenoAnonimo`, y todo número se redondea a 2 decimales al guardar para que `JSON.stringify` nunca emita exponentes.
- Los adaptadores traducen la concurrencia de EF y los errores 23505/23503 de PostgreSQL a resultados del puerto (`false`); la aplicación nunca ve tipos de EF ni de Npgsql. La fecha de consumo de las solicitudes es token de concurrencia: un enlace solo se usa una vez aunque lleguen dos peticiones a la vez.

## Núcleo TS

Coordenadas con x a la derecha e y hacia abajo, y tolerancia de 0,1 cm. Detalle en `docs/superpowers/plans/2026-10-24-01-nucleo-editor.md`.

Paso del plano a la escena 3D (función única `aEscena`, en `nucleo/modelo3d`): cm a metros, y el eje y del plano pasa a ser el z de la escena (`x_escena = x/100`, `y_escena = z/100` hacia arriba, `z_escena = y/100`). El giro de `θ` grados en el plano es `giroY = −θ·π/180` en la escena.

Lo que se pinta en 3D sale de `modelo3d` (`piezasDeElemento`, parametrizado por las variantes) y queda dentro de los `volumenes` del tipo, que son también los que usan los conflictos: lo que se ve es lo que choca. `modelos3dIntegridad.test.ts` lo comprueba para cada tipo. En 3D solo se selecciona, edita y borra; mover y girar es solo en 2D.

## Despliegue

Con `srv` (skill `servidor`). Pendiente: plan 6. nginx necesitará `tamanoMaximo: "2m"` en `srv.json`: un diseño puede pesar 1 MB y el cuerpo JSON algo más.
