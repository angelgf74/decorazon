# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

**Decorazon**: editor web de diseños. Cada usuario crea, guarda y edita sus diseños (hasta 100 por usuario, 1 MB cada uno). Especificación en `docs/superpowers/specs/2026-10-24-decorazon-design.md`; planes y pendientes en `docs/superpowers/plans/`.

## Estructura

```
web/                     editor en TypeScript; el núcleo (geometría y reglas) vive en web/src/nucleo
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
```

Los tests de integración llevan `[Trait("Categoria","Integracion")]`; de ahí el filtro.

## Secretos y configuración

- `appsettings.Development.json` está ignorado por git; `appsettings.Example.json` es la plantilla.
- Los secretos de producción van por variables de entorno, con `srv secreto` (skill `servidor`).
- El origen CORS de producción vive en `appsettings.json`.
- En desarrollo y tests no se envía correo: el enlace va al log con `[CORREO SIMULADO]`.

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

## Núcleo TS

Coordenadas con y hacia abajo y tolerancia de 0,1 cm. Detalle en `docs/superpowers/plans/2026-10-24-01-nucleo-editor.md`.

## Despliegue

Con `srv` (skill `servidor`). Pendiente: plan 6.
