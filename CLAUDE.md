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
  - `decorazon.sesion`: token, caducidad y correo del usuario;
  - `decorazon.disenoAnonimo`: el diseño sin cuenta;
  - `decorazon.diseno.<id>`: copia local de cada diseño del servidor, con su versión y si tiene cambios sin subir;
  - `decorazon.catalogo.favoritos` y `decorazon.catalogo.recientes`: ids de tipos del catálogo (favoritos; últimos 6 añadidos);
  - `decorazon.registroEnviado`: el diseño que viajó con el registro; al entrar no se pregunta si guardarlo solo si la cuenta tiene un diseño con ese mismo contenido (se comprueba en el servidor; ante la duda, se pregunta).
- `cerrarSesion()` (salida voluntaria o borrado de la cuenta) borra las copias `decorazon.diseno.*`, el diseño anónimo y `decorazon.registroEnviado`, y el editor anónimo empieza vacío; "Cerrar sesión" con cambios sin subir pide confirmación antes. `cerrarSesion('caducada')` conserva las copias para subir lo pendiente al volver, y `cerrarSesion({ conservarLocales: true })` (tras cambiar la contraseña, mismo usuario) también. Si otra pestaña cierra la sesión o entra con otra cuenta (evento `storage` sobre `decorazon.sesion`), esta pestaña la olvida, vuelve al anónimo y va al inicio sin borrar nada del almacenamiento; si entra con la misma cuenta, adopta el token nuevo y sigue donde estaba. `iniciarSesion()` no toca `decorazon.sesion` hasta tener la sesión nueva.

Los tests de integración llevan `[Trait("Categoria","Integracion")]`; de ahí el filtro.

## Secretos y configuración

- `appsettings.Development.json` está ignorado por git; `appsettings.Example.json` es la plantilla.
- Los secretos de producción van por variables de entorno, con `srv secreto` (skill `servidor`): `ConnectionStrings__Decorazon`, `Jwt__ClaveDeFirma` y `Correo__ClaveDeApi`.
- Los valores de producción que no son secretos viven en `appsettings.json`: el origen CORS y el correo (`Correo:UsarBrevo: true`, remitente y `Correo:BaseDeLaWeb` https).
- El correo depende de `Correo:UsarBrevo`. Con `false` (desarrollo y tests) no se envía: el enlace va al log con `[CORREO SIMULADO]`. Fuera de Development y Testing la API no arranca sin Brevo (salvo `Correo:Simulado: true`) ni con una `Correo:BaseDeLaWeb` que no sea https.
- Las sugerencias (`POST /sugerencias`) se entregan al buzón del proyecto GestorSugerencias (`Sugerencias:UrlBase`, sin clave; `appsettings.json` lo trae activo). En Development y Testing `Program` fuerza `Sugerencias:UsarServicioReal=false` pase lo que pase en la configuración: van al log con `[SUGERENCIA SIMULADA]`. Fuera, la API no arranca sin el buzón (salvo `Sugerencias:Simulado: true`) ni con una `UrlBase` que no sea https.

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
- Sugerencias: `POST /sugerencias` no pide sesión. Con un token válido se responde al correo de la cuenta y el `correo` del cuerpo se ignora; sin token, ese correo es obligatorio. Un `Authorization` que no valida da 401, no "sin sesión": así la web cierra la sesión en vez de pedir un correo. Decorazon no guarda la sugerencia: si el buzón falla, 502 y la web conserva lo escrito. El buzón admite correos de 200 caracteres (una cuenta, 254): más largos, 400 antes de mandarlos. El tipo viaja al buzón por nombre (`NuevaFuncionalidad`…), no por número: el buzón no valida el rango de su enumerado y un número cambiaría de sentido si lo reordenan. Límite propio: 5 por hora, por cuenta o por IP.
- La barra del editor tiene tres zonas (diseño y guardado, pasos, deshacer/menú/cuenta). "Nuevo diseño", "Imprimir" y "Sugerencias" están en el menú "Más acciones" (`MenuMas` en `BarraSuperior.tsx`): solo existen en el DOM con el menú abierto, y al elegir una opción el foco vuelve al botón del menú **antes** de ejecutarla (la hoja para imprimir guarda `document.activeElement` para devolverle el foco al cerrarse). En móvil el botón de sugerencias va en las pestañas de abajo (`PestanasDeHojas`), al alcance del pulgar, y la opción del menú se oculta por CSS. 2D/3D no va en la barra sino sobre el plano (`SelectorDeVista` en `Editor.tsx`, dentro de `.editor__lienzo`, porque el `Lienzo` se desmonta en 3D); zoom y Encuadrar abajo a la derecha (`.lienzo__controles`, y la barra de la vista 3D en el mismo sitio); las pistas son una píldora abajo a la izquierda que en móvil enseña solo las dos primeras. El panel derecho solo existe en escritorio cuando hay una selección del paso (`seleccionDelPaso` en `almacen.ts`; clases `editor__cuerpo--sin-panel` y `editor__derecha--oculta`); los avisos de conflicto son un chip arriba a la izquierda del plano (`AvisosDelPlano`, en 2D y 3D) que despliega la lista, y los atajos de teclado van en un `<details>` al pie del panel. Las flechas mueven lo seleccionado 1 cm (10 con Mayúsculas) **sin imán** (`desplazarElemento` en `nucleo/edicion/elementos.ts`; `moverElemento` siempre imanta y desharía el ajuste fino) y las pulsaciones seguidas son un solo paso de deshacer (grupo `teclado:…`, cerrado al soltar la tecla); se ignoran con `e.defaultPrevented`, porque el menú ya usa ↑↓. El chip de avisos no lleva `role="status"` (en reposo el único `status` del editor es el guardado de la barra, y así lo cuentan los tests de `EditorDeDiseno`): el lector de pantalla recibe el número de avisos por una región `aria-live` oculta que va siempre en el mismo sitio del árbol, con 600 ms de retardo para que un arrastre solo anuncie el final y sin repetir el mismo número. El catálogo es una rejilla de dos columnas con chips de grupo (un chip pulsado deja solo ese grupo; el buscador filtra dentro de lo que se enseña), y el panel de Estancia termina con el botón "Amueblar" que pasa al paso 2. Cada tarjeta lleva la miniatura del tipo (`MiniaturaDeTipo`, cacheada por tipo), dibujada con la misma `Pieza` (`lienzo/capas/Pieza.tsx`) que pinta el plano: lo que se ve en la tarjeta es lo que se verá en el plano. Delante van «Favoritos» (estrella, un botón hermano de la tarjeta dentro del `<li>`: un botón dentro de otro no es válido) y «Usados hace poco» (los apunta `anadirTipo`), solo si tienen algo; viven en `localStorage` (`decorazon.catalogo.favoritos` y `decorazon.catalogo.recientes`) por `paneles/catalogoLocal.ts`, que guarda en memoria lo que `localStorage` rechaza y avisa a React con `useSyncExternalStore`.
- xUnit serializa los datos de `InlineData`: un sustituto suelto llega al test como U+FFFD. Esas cadenas se arman dentro del test.
- jsdom trata un `<footer>` dentro de `<main>` como `contentinfo` y Chromium no: en los e2e, el pie del inicio se busca por su clase.
- «Descargar plano» (`editor/hoja/exportarPlano.tsx`) pinta el svg de `PlanoDelDiseno` con `renderToStaticMarkup` y le incrusta `ESTILOS_DEL_PLANO`, una copia a mano de las reglas de `lienzo.css` que el plano necesita con los colores de `base.css` resueltos (una imagen svg no ve las hojas de estilo): **al cambiar `lienzo.css` hay que revisarlo**. Sin canvas (jsdom) devuelve el svg. «Descargar imagen 3D» y la hoja para imprimir capturan con `CapturaFueraDePantalla` (1200 × 800, 8 s de tope). «Descargar diseño» produce `<nombre>.decorazon.json` con `serializarDocumento` (el mismo JSON que viaja al servidor); «Abrir un fichero» (inicio) e «Importar» (Mis diseños) lo leen con `importarDiseno` (`editor/persistencia/fichero.ts`: tope de 2 MB, `JSON.parse` y `validarDocumento`). `HojaImpresion` acepta `doc` y `nombre` por props (la vista compartida) y sin ellos lee el editor.
- `Elemento` lleva dos campos opcionales: `bloqueado?: true` (solo se guarda si es verdadero; `bloquearElemento` lo quita al liberar) y `nombre?: string` (hasta `LIMITE_NOMBRE_ELEMENTO` = 60, sin espacios a los lados; `renombrarElemento` lo quita si queda vacío). Un bloqueado se selecciona y se edita, pero `moverElemento` y `desplazarElemento` devuelven el mismo documento (así arrastre, tirador, flechas y R no apuntan un paso de deshacer vacío: `cambiar` ignora el mismo documento), `editarElemento` ignora su `rotacion` y ni `editar` ni `cambiarTipo` lo imantan (el imán también lo movería al cambiar medidas o producto), `pulsarElemento` no abre el arrastre y `CapaElementos` deja pasar el toque (`data-bloqueado`: arrastrar desde él hace pan y el toque sin mover no suelta la selección), el `Lienzo` no monta el `TiradorGiro` y `CapaElementos` dibuja un candado (`data-candado`, a tamaño fijo con `scale(1/escala)`, también en el plano exportado: `ESTILOS_DEL_PLANO`). `duplicarElemento` copia el nombre y la copia nace libre. `nombreDeElemento` prefiere el nombre propio al producto y al tipo: plano, panel, hoja y vista compartida lo heredan; `filasDeMuebles` añade `tipo` para escribirlo debajo. «Voltear» (`voltearElemento`) cambia izquierda ↔ derecha en toda variante que admita los dos valores (`sePuedeVoltear`); en una puerta cambia la bisagra.
- La cinta métrica es estado local del `Lienzo` (`midiendo`, `medida`): midiendo, ninguna capa lleva `alPulsar` ni hay tiradores (el toque cae al fondo) y un toque sin arrastre fija un punto en cm enteros; entre el primero y el segundo la cota sigue al puntero si no hay botón pulsado. Escape (oyente propio en `window`), el botón o cambiar de paso la quitan; no se guarda. `CotasElemento` pasa a `cotasAParedes` las huellas de los vecinos no pisables (`obstaculos`): la cota va a lo primero que corte el rayo.
- La vista previa (JPEG de 1200 × 630 que hace el navegador del dueño con `GeneradorDeVistaPrevia`) se rehace al guardar **cualquier** diseño de la cuenta (`RefrescoDeVistaPrevia`, como mucho una cada 5 minutos por diseño, `frecuencia.ts`), no solo los compartidos: es la miniatura de Mis diseños. `GET /disenos/{id}/vista-previa` la sirve al dueño (`private, no-store`: la dirección no cambia al rehacer la imagen y la web pide por id, así que una caché HTTP devolvería la vieja; ajeno o sin imagen, 404) y el resumen del listado trae `fechaDeVistaPrevia` (null sin imagen; el repositorio EF la proyecta con una subconsulta, sin leer la imagen). `MiniaturaDeDiseno` la pide con `parseAs: 'blob'` y guarda el object URL por `id:fecha` en `paginas/miniaturas.ts` para que buscar u ordenar no la vuelva a pedir (un fallo no se guarda). La espera de 5 minutos es «en cabeza»: el primer guardado hace la imagen al momento y los siguientes esperan; si se sale del editor con uno esperando, `RefrescoDeVistaPrevia` lo encola (`colaDeVistasPrevias.ts`) y `AnfitrionDeVistasPrevias`, montado en `App` fuera de las rutas, hace esa última imagen con lo último guardado. La marca de la espera es `decorazon.vistaPrevia.<id>` en `localStorage` (una fecha; no se borra). «Buscar» y «Ordenar por» de Mis diseños van en el cliente (`ordenarYFiltrar`; sin tildes ni mayúsculas con `normalize('NFD')`).
- «Nueva estancia» crea un rectángulo o una L: `documentoNuevo(tipo, ancho, largo, alto, forma?)` con `plantaDeForma` (`nucleo/modelo/crear.ts`; el entrante se recorta a `[50, medida − 50]` y las cuatro esquinas giran en el mismo sentido que el rectángulo). `almacen.crear` y `alCrear` de `NuevaEstancia` llevan la forma como quinto parámetro.
- Analítica: `iniciarAnalitica` (`analitica.ts`) carga el tracker de WebAnalytics con `?site=` y `evento(nombre, datos?)` cuenta lo que se usa llamando a `window.webanalytics.evento` (lo define el tracker): hasta 20 eventos se encolan mientras el script carga y salen en su `load`; si el script falla (adblocker) o no hay sitio, no se hace nada. Eventos: `estancia-creada` (`tipo`, `forma`) en `almacen.crear`, `mueble-anadido` (`tipo`) en `anadirTipo`, `vista-3d` en `cambiarVista` (solo al entrar), `hoja-impresa` (botón de `HojaImpresion`), `enlace-creado` (`DialogoCompartir`) y `ejemplo-abierto` (`ejemplo`: nombre, en `Inicio`). **Nunca** datos personales ni ids de diseño; la política de privacidad (`textos.privacidad.anonimo`) lo dice. Nombres en minúsculas con guiones (la API de WebAnalytics rechaza otra cosa). Los tests que montan algo que emite eventos hacen `vi.mock` de `analitica`.
- Carga: las cifras de Lighthouse y el tope están en el índice de mejoras (plan 12, «Medidas de la fase 8»); `web/pruebas-build/presupuesto.test.ts` vigila el tamaño del arranque (JS y CSS que enlaza `index.html`) y del fragmento 3D, y que `index.html` no enlace `Escena3D`. `public/robots.txt` existe a propósito: sin él nginx devuelve `index.html` por el fallback de la SPA. La imagen del primer ejemplo del inicio va `eager` + `fetchpriority="high"` (es el LCP en móvil); un `preload` en `index.html` empeoró el LCP simulado y no se deja.
- Teclado en el plano (M-28): con `alPulsar`, `CapaElementos` añade una capa de **asas de foco** (`.capa-elementos__foco`: un `<polygon role="button" tabIndex={0}>` con la caja de cada pieza, sin relleno ni puntero, `aria-label` con nombre, medidas y «bloqueado/a» según el género del tipo, y `aria-current` en la seleccionada), ordenada por posición con las alfombras primero. Recibir el foco selecciona (así Supr, R y las flechas actúan sobre lo que se ve con el foco); Intro y Espacio también; a mitad de un arrastre, nada. **El orden de pintado de las piezas no cambia con la posición** (alfombras debajo, luego inserción): reordenar el DOM durante un arrastre hace que el navegador suelte la captura del puntero y el arrastre se corte (`e2e/arrastre.spec.ts`), y además cambiaría el apilado. El `<svg>` del plano es `role="group"` y los nombres van `aria-hidden`. Sin `alPulsar` (paso 1, midiendo, plano exportado, vista compartida) no hay asas.
- Instalar como app (M-25): `instalacion.ts` guarda el `beforeinstallprompt` (anulado) y `appinstalled`; `conectarInstalacion()` va en `main.tsx` antes de `createRoot` porque el evento puede llegar antes de montar. `useEstadoDeInstalacion()` da `no` (ya en standalone o sin aviso), `aviso` o `ios` (iPhone, o iPad que se presenta como Mac con pantalla táctil); «Instalar Decorazon» en `MenuMas` llama a `instalar()` (consume el aviso: Chrome solo deja enseñarlo una vez) o abre la nota de iOS (`Confirmar` con `soloAceptar`).
- Modo oscuro (M-29): solo `prefers-color-scheme: dark` sobre los tokens de `base.css`, sin selector. Los colores fijos de las hojas son tokens: `--sobre-tinta` (texto sobre fondo tinta), `--primario` + `--sobre-terracota` (botones primarios; de noche la terracota del texto se aclara y la del fondo no), `--bien`, `--peligro-suave`, `--sombra` (`rgb(var(--sombra) / 0.1)`). **El plano no cambia**: `.lienzo` lleva fondo crema fijo y `.lienzo__svg`, `.panel-catalogo__miniatura`, `.hoja-impresion__pagina`, `.compartido__plano` y `.plano-ampliado__plano` redefinen los tokens claros (`lienzo.css`): todo lo que pinta el plano es papel claro también de noche; la 3D tampoco cambia. Texto sobre `--peligro` va con `--sobre-peligro`. `contraste.test.ts` comprueba los pares WCAG de los dos esquemas (texto 4,5:1, bordes 3:1) sobre `base.css?raw`; `e2e/oscuro.spec.ts` (`colorScheme: dark`) comprueba fondo oscuro, plano claro y consola limpia, y deja capturas en `test-results/`.
- Los tres ejemplos del inicio viven en `web/src/ejemplos/index.ts` como documentos construidos con `documentoNuevo` y `elementoNuevo` (no JSON): `ejemplos.test.ts` comprueba que validan, no tienen conflictos y tienen imagen. Las imágenes (`web/public/ejemplos/*.png`) se regeneran abriendo una copia del ejemplo y pulsando «Descargar imagen 3D». «Abrir una copia» sigue el flujo de la vista compartida (`sustituiriaDisenoAnonimo` → `Confirmar` → `empezarAnonimoCon`). La guía del primer uso (`editor/GuiaInicial.tsx`) solo sale al crear una estancia anónima con el editor ya montado (suscripción al almacén en `Editor.tsx`) y deja la marca `decorazon.guia = 'vista'` (`editor/marcaDeGuia.ts`); los e2e la llevan puesta de antemano con `storageState` (`e2e/estado-sin-guia.json`, en las dos configuraciones de Playwright) y solo `ejemplos.spec.ts` la quita para probarla.
- En react-three-fiber, si una prop deja de pasarse a un objeto cuyo constructor lleva argumentos (`OrbitControls(object, domElement)`), `diffProps` la pone a **0**, no a su valor por defecto: `rotateSpeed` 0 (no gira), `enableZoom` 0 (el pellizco muere porque los manejadores táctiles comparan por veracidad). Las props que cambian según el modo se pasan siempre, con ternario.
- El build de los e2e es de producción y leería `VITE_ANALITICA_SITIO` de `.env.production`; el tracker falla por CORS desde `localhost` y `vista3d.spec.ts` exige consola limpia. `playwright.config.ts` arranca el `webServer` con esa variable vacía.

## Núcleo TS

Coordenadas con x a la derecha e y hacia abajo, y tolerancia de 0,1 cm. Detalle en `docs/superpowers/plans/2026-10-24-01-nucleo-editor.md`.

Paso del plano a la escena 3D (función única `aEscena`, en `nucleo/modelo3d`): cm a metros, y el eje y del plano pasa a ser el z de la escena (`x_escena = x/100`, `y_escena = z/100` hacia arriba, `z_escena = y/100`). El giro de `θ` grados en el plano es `giroY = −θ·π/180` en la escena.

«Desde dentro» (barra de `Vista3D`) pone la cámara con `camaraDesdeDentro` (1,6 m de altura, 0,6 m dentro desde el centro de la primera puerta, o de la pared 0 sin puerta) y `Escena3D` cambia los `OrbitControls` a distancia fija de un centímetro sin zoom ni desplazamiento (orbitar alrededor de un punto a un centímetro, delante, es girar la cabeza sin andar; con un metro la cámara andaba hasta dos y atravesaba paredes; el sentido por defecto es el natural y un `rotateSpeed` negativo lo invierte); las paredes no se ocultan mientras tanto. Es **un solo** `<OrbitControls>` con todas las props explícitas en los dos modos: React reutiliza la instancia al cambiar de modo y r3f pone a 0 las props que desaparecen de un objeto cuyo constructor lleva argumentos, lo que dejaba la órbita de fuera sin girar. `Captura3D` y `Vista3DSoloVer` no lo usan.

Lo que se pinta en 3D sale de `modelo3d` (`piezasDeElemento`, parametrizado por las variantes) y queda dentro de los `volumenes` del tipo, que son también los que usan los conflictos: lo que se ve es lo que choca. `modelos3dIntegridad.test.ts` lo comprueba para cada tipo. En 3D solo se selecciona, edita y borra; mover y girar es solo en 2D.

## Despliegue

Con `srv` (skill `servidor`), desde la raíz del repo: `srv.json` publica la web estática (`deploy/construir-web.mjs` la compila a partir del commit) en `decorazon.angelgf.com.es` y la API en `decorazon-api.angelgf.com.es` (salud `/salud`, `tamanoMaximo: "2m"` porque un diseño puede pesar 1 MB), con la base `decorazon`.

- Publicar: `srv subir` (ensayo) y `srv subir --publicar`; volver atrás: `srv volver`; logs: `srv logs api`; estado: `srv estado`.
- Las migraciones las aplica `srv subir` con el bundle de EF; fuera de Development la API no migra sola.
- Secretos (los pone Angel con `srv secreto <NOMBRE>`; ver solo nombres con `srv secreto --nombres`): `ConnectionStrings__Decorazon`, `Jwt__ClaveDeFirma` y `Correo__ClaveDeApi`. El resto de la configuración de producción está en `appsettings.json`.
- La web de producción llama a la API de `web/.env.production` (`VITE_API_URL`) y carga la analítica si hay `VITE_ANALITICA_SITIO`.
- nginx (plantilla de srv) sirve la web con `Cache-Control: no-cache, no-transform`: el service worker y el manifiesto se revalidan siempre.
- Tras un despliegue, una pestaña con la versión anterior recarga una vez si no encuentra un fragmento (`web/src/recargaPorVersion.ts`).
