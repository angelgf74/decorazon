# Decorazon: diseño

_Fecha: 2026-10-24. Las decisiones de Angel aparecen como tales. Las que tomó Claude están marcadas **(decisión de Claude)** para que Angel pueda revisarlas._

## 1. Qué es y por qué

Decorazon es un diseñador de interiores web para quien va a amueblar una estancia de su casa: un dormitorio, un salón o una cocina. Lo usa gente sin conocimientos técnicos, así que tiene que ser **fácil e intuitivo** y dar **resultados que reflejen la realidad**.

"Reflejar la realidad" significa dos cosas, por este orden:

1. **Medidas fieles.** Lo que importa es poder fiarse de que un mueble cabe y de que sus puertas y cajones abren. Los dos fallos que la app tiene que evitar, en palabras de Angel: _"armarios/muebles que no caben en el hueco disponible, puertas/cajones que no se pueden abrir porque chocan con otros elementos"_.
2. **Un 3D con sensación de calidad.** No hace falta fotorrealismo, pero no puede parecer un juguete: materiales creíbles, luz suave y sombras.

## 2. Objetivos, no-objetivos y anti-objetivos

**Objetivos**
- Modelar la estancia real: planta, altura, puertas, ventanas, columnas, vigas y radiadores.
- Amueblarla con un catálogo genérico de medidas ajustables y colores elegibles.
- Detectar y explicar conflictos: no cabe, se solapa, no abre.
- Ver el resultado en 3D con buen acabado.
- Uso sin cuenta. Para guardar en el servidor hace falta registrarse.

**No-objetivos (v1)**
- Catálogos de tiendas (IKEA y otras). Llegarán en una fase posterior, y el modelo de datos ya los prevé (§6.3).
- Techos inclinados (buhardillas) y paredes curvas.
- Fotorrealismo, trazado de rayos o renders "de catálogo".
- Varias estancias o una vivienda completa en un mismo diseño.
- Compartir diseños entre usuarios o editarlos a la vez entre varios.
- App Android nativa.

**Anti-objetivos** (aunque técnicamente funcione, sería un fracaso)
- Que una medida mienta: un mueble que en la app cabe y en la realidad no.
- Que haya que leer un manual para colocar un sofá.
- Un 3D bonito pero lento, que vaya a tirones en un portátil normal.
- Que el usuario anónimo pierda su trabajo al registrarse.

## 3. Stack y despliegue

Decidido por Angel tras analizar las alternativas:

- **Front:** PWA con **React + TypeScript + Vite**. El 3D con **react-three-fiber** (Three.js) y **drei**. Se descartó Blazor porque el editor 2D/3D acabaría escrito en JavaScript de todos modos, a través de interop, y Blazor añade varios MB a la primera carga.
- **Back:** API REST en **C# .NET 10** con **arquitectura hexagonal** y **PostgreSQL**.
- **Despliegue:** en agfserver tras el túnel de cloudflared, con `srv` (skill `servidor`).
  - Web: `decorazon.angelgf.com.es`
  - API: `decorazon-api.angelgf.com.es`
- **Correo:** Brevo, como en otros proyectos de Angel.
- **Repositorio:** propio, en `C:\Desarrollo\Proyectos\decorazon` (la carpeta `icono/` ya tiene el icono).

**Referencia para el backend:** `jornal` (`C:\Desarrollo\Proyectos\jornal`) y `recetas` ya resuelven las mismas piezas: hexagonal, cuentas en dos pasos, JWT revocable, Brevo detrás de un puerto, EF Core con PostgreSQL y tests de arquitectura. Se reutiliza ese patrón y lo que se porte se porta con sus tests. Ver `jornal/spec/constitution/tech-stack.md` y `jornal/CLAUDE.md`.

**Despliegue con `srv`:** `srv.json` con `web.estatica` (la salida de `vite build`, generada con un paso propio que la deja en `$SRV_PAQUETE/web`, con `spa: true`), `api.dotnet`, `migraciones` y `basedatos`. **Dependencia:** `srv` tiene pendiente su prueba completa en el servidor (`srv-prueba`, ver `srv/docs/plan-migracion-apps.md`). Decorazon no se publica hasta que esa prueba salga bien. Si el comodín de Cloudflare ya está configurado, los subdominios no requieren tocar el panel; si no, se añaden a mano.

## 4. Experiencia de usuario

### 4.1 Pantallas
- **Inicio:** qué es Decorazon y el botón "Empezar a diseñar" (sin cuenta). Para usuarios registrados, acceso a "Mis diseños".
- **Mis diseños** (solo registrados): lista con nombre, tipo de estancia y fecha de modificación, y las acciones crear, abrir, renombrar, duplicar **(decisión de Claude)** y borrar (con confirmación).
- **Editor**, con dos pasos visibles en la barra superior: **1 Estancia** y **2 Amueblar**. Se puede volver al paso 1 en cualquier momento sin perder los muebles.
- **Cuenta:** registro, confirmación, inicio de sesión, contraseña olvidada, cambio de contraseña, cerrar sesión, borrar la cuenta y sus diseños **(decisión de Claude; RGPD)**.
- **Privacidad:** página estática **(decisión de Claude)**.

### 4.2 Distribución del editor (elegida por Angel: opción A)
- Catálogo a la izquierda, lienzo en el centro y panel de propiedades a la derecha.
- Una sola vista a la vez, con un conmutador **2D / 3D**. El 2D sirve para colocar y el 3D para ver.
- En móvil, el catálogo y las propiedades pasan a hojas que suben desde abajo.
- Boceto: `.superpowers/brainstorm/*/content/editor-layout.html` (local, fuera del repositorio).

**(Decisión de Claude)** Escritorio y tableta son la experiencia principal. En móvil todo funciona, pero no se optimiza la edición fina con el dedo más allá de lo razonable.

**(Decisión de Claude)** En la vista 3D también se puede seleccionar un elemento (con clic), editar sus propiedades en el panel y borrarlo. Moverlo y girarlo se hace en 2D.

### 4.3 Paso 1: la estancia
- Se elige el tipo de estancia (dormitorio, salón o cocina). Solo sirve para ordenar el catálogo y para los valores por defecto.
- Se empieza con un rectángulo: **ancho × largo × alto** en cm.
- Para plantas en L o con entrantes, se mueven vértices y se parten paredes, lo que da cualquier polígono simple. El techo es plano y de altura única. (Angel: _"casi siempre rectangulares, pero permitir diseñar estancias raras"_.)
- Grosor de pared configurable, por defecto 10 cm **(decisión de Claude)**. Las medidas de la estancia son **interiores**: lo que el usuario mide con la cinta.
- Elementos de la estancia:
  - **Puerta:** pared, posición, ancho, alto, hoja abatible (sentido y lado de giro) o corredera. Su barrido cuenta para los conflictos.
  - **Ventana:** pared, posición, ancho, alto, altura desde el suelo y apertura hacia dentro (barrido) o no.
  - **Columna:** rectangular, apoyada en pared o exenta, de suelo a techo.
  - **Viga:** de pared a pared o en un tramo, con ancho y **canto** (cuánto baja desde el techo).
  - **Radiador:** pared, posición, ancho, alto, fondo y altura desde el suelo.
- Colores de paredes y suelo (paleta y selector) **(decisión de Claude)**.
- Todas las medidas se ven como **cotas** y se pueden editar escribiendo el número, no solo arrastrando.

### 4.4 Paso 2: amueblar
- Se arrastra un elemento del catálogo al plano. Llega con sus medidas por defecto.
- **Imán:** se pega a paredes y a otros muebles, y gira en pasos de 90° (con giro libre opcional).
- **Propiedades:** ancho, fondo y alto, variantes propias del tipo (§6.2) y colores por zona (por ejemplo, cuerpo y frentes de un armario, o tapizado y patas de un sofá).
- Duplicar, borrar, deshacer y rehacer **(decisión de Claude)**.
- Las cotas de la distancia a las paredes cercanas aparecen al mover un elemento **(decisión de Claude)**.

### 4.5 Fidelidad: conflictos
El núcleo del valor. Se comprueba en **tres dimensiones**, no solo en planta:

1. **No cabe o se solapa:** un elemento que atraviesa una pared, una columna u otro mueble; un mueble más alto que el techo o que el hueco bajo una viga; un mueble alto delante de una ventana o un radiador **(estas últimas por extensión, decisión de Claude)**.
2. **No abre:** cada mueble lleva sus **zonas de apertura**: el barrido de las puertas abatibles y el recorrido de los cajones (su fondo); las correderas no tienen. Las puertas y ventanas de la estancia también tienen la suya. Si una zona de apertura se cruza con otro elemento, es conflicto.
3. **Paso estrecho** (aviso suave): menos de 60 cm libres entre elementos o entre un elemento y una pared **(decisión de Claude, umbral configurable en código)**.

Presentación:
- En 2D, los elementos en conflicto y la zona que choca se pintan en rojo. Los barridos se dibujan siempre, en trazo discontinuo.
- Mensaje concreto con la cifra: _"La puerta del armario choca con la cama: faltan 12 cm"_.
- Lista de avisos pendientes en el editor. Al pulsar uno se selecciona el elemento.
- En 3D, los elementos en conflicto se resaltan.
- **Los conflictos avisan pero no bloquean** **(decisión de Claude)**: el usuario puede estar probando, y se puede guardar con conflictos.

Precisión **(decisión de Claude)**: las medidas que introduce el usuario son **enteros en centímetros** y el giro libre va en **grados enteros**. Con giros y paredes oblicuas las esquinas dejan de caer en enteros, así que la geometría se calcula en coma flotante con una tolerancia única de 1 mm. Tocarse (separación ≤ 1 mm) no es conflicto; solaparse más de 1 mm sí. Ante la duda, gana el conflicto, para que "cabe" nunca mienta. Las cifras de los mensajes se redondean al centímetro hacia arriba ("faltan 12 cm").

### 4.6 Calidad del 3D
- Luz ambiental suave más luz direccional con **sombras suaves**, y un entorno de iluminación de drei.
- Materiales PBR sencillos por tipo de zona: tela, madera o lacado, metal, vidrio, cerámica. El usuario elige el color y el tipo de material lo fija la zona del mueble **(decisión de Claude)**.
- Las ventanas dejan pasar luz (visual, no física) y se ven como huecos con marco y cristal.
- La cámara orbita con límites para no atravesar el suelo. Hay un botón para cortar o ocultar las paredes que tapan la vista desde la cámara.
- Rendimiento: fluido (≈60 fps) en un portátil medio con una estancia de unos 40 elementos.

## 5. Cuentas y guardado

### 5.1 Uso anónimo
- Se puede diseñar sin cuenta. El diseño en curso se guarda en el navegador (IndexedDB o `localStorage`) para no perderlo al recargar, pero **no se guarda en el servidor**.
- **(Decisión de Claude)** Un solo diseño anónimo en curso. "Nuevo diseño" sin cuenta avisa de que reemplaza al actual.

### 5.2 Registro (definido por Angel)
1. Al pulsar **Guardar** sin cuenta se ofrece registrarse y se pide el **email**.
2. El sistema envía por Brevo un correo con un **enlace de confirmación** (un solo uso, caduca en 24 h).
3. Desde el enlace se completa el registro con **nombre y contraseña**.
4. **Al terminar, el diseño anónimo pasa a la cuenta sin perder nada, también si el enlace se abre en otro dispositivo** (decidido por Angel). Para ello:
   - El diseño viaja con la petición de registro (`POST /cuentas/registro`) y se guarda temporalmente en la solicitud de registro (columna `jsonb`, máximo 1 MB). Caduca con el enlace (24 h) y se borra al caducar o al completarse.
   - Al completar el registro, desde el dispositivo que sea, se crea la cuenta y ese diseño queda como su primer diseño, con un nombre por defecto que se puede cambiar.
   - Anti-abuso **(decisión de Claude)**: como mucho 3 solicitudes por email y 10 por IP cada hora. Una solicitud nueva para el mismo email reemplaza a la anterior (y su diseño). Si el email ya tiene cuenta, el diseño no se guarda.
   - Si el usuario siguió editando en el dispositivo original mientras tanto **(decisión de Claude)**: en la cuenta queda la copia enviada con la solicitud. Cuando ese dispositivo inicia sesión y su diseño local difiere, se aplica la pregunta de §5.2 bis y, si acepta, se guarda como un diseño nuevo. Nunca se sobrescribe nada en silencio.

Reglas (heredadas de jornal):
- Contraseñas con PBKDF2 y sal, mínimo 12 caracteres.
- Tokens de correo de 256 bits, guardados como SHA-256, de un solo uso y con caducidad.
- Las respuestas no revelan si un email ya tiene cuenta.
- Tablas separadas para solicitudes de registro y de contraseña.
- **JWT revocable** por versión de credenciales.
- La identidad sale del JWT, nunca del cuerpo de la petición.
- Un diseño ajeno responde `404`.
- Si el email ya tiene cuenta, el correo que llega es de "ya tienes cuenta, inicia sesión" en lugar del de registro **(decisión de Claude)**.

### 5.2 bis Diseño anónimo y sesión **(decisión de Claude)**
- **Usuario con cuenta que inicia sesión** en un navegador con un diseño anónimo no vacío: al entrar se le pregunta "¿Guardar este diseño en tu cuenta?" (Sí lo sube como diseño nuevo; No lo descarta). Si ya tiene el máximo de diseños, se le avisa y el diseño se queda en local.
- **Al cerrar sesión** se borran del navegador las copias locales de sus diseños, y el editor anónimo empieza vacío.

### 5.3 Contraseña olvidada
Enlace por correo de 1 h, un solo uso. Al cambiarla se cierran todas las sesiones **(decisión de Claude, como jornal)**.

### 5.4 Diseños de usuarios registrados
- CRUD: crear, listar (los suyos), abrir, actualizar (nombre y contenido), duplicar y borrar.
- Un diseño tiene **nombre** y **contenido** (el diseño en sí). Además, tipo de estancia, fechas y una versión para concurrencia.
- **Autoguardado** con espera tras el último cambio (unos 2 s), más un indicador de "Guardado" / "Guardando…" / "Sin conexión" **(decisión de Claude)**.
- **Concurrencia:** se usa la versión (`If-Match` / ETag). Si el diseño cambió en otra pestaña o dispositivo, se avisa y se ofrece recargar o sobrescribir **(decisión de Claude)**.
- Sin conexión, la PWA abre y edita lo último cargado, y sincroniza al volver la red con la misma regla de concurrencia **(decisión de Claude)**.
- Límites **(decisión de Claude)**: 100 diseños por usuario y 1 MB por contenido, que encaja con el `tamanoMaximo` por defecto de nginx en `srv`.

## 6. Modelo de datos

### 6.1 El documento de diseño
El contenido del diseño es **un documento JSON versionado** (`formato: 1`) que el editor carga y guarda entero. En PostgreSQL va en una columna `jsonb` de la tabla `disenos` **(decisión de Claude)**. Así el formato evoluciona sin migrar tablas. La API valida el esquema y el tamaño, pero no interpreta la geometría.

Contenido, a grandes rasgos:
- `estancia`: tipo, altura, grosor de pared, polígono de la planta (vértices en cm), colores de paredes y suelo.
- `aberturas` y `estructura`: puertas, ventanas, columnas, vigas y radiadores, con su pared (índice del tramo), posición y medidas.
- `elementos`: muebles y decoración. Cada uno lleva `tipo` (id del catálogo), posición (x, y en cm), rotación, medidas (ancho, fondo, alto), variantes, colores por zona y `origen` (§6.3).

Unidades: **cm enteros**. Rotación en grados. Origen de coordenadas en un vértice de la planta.

El editor tiene una **única fuente de verdad** (un store, por ejemplo Zustand) de la que salen el 2D (SVG) y el 3D (react-three-fiber). La detección de conflictos es **lógica pura en TypeScript**, sin depender de la vista, y lleva tests.

### 6.2 Catálogo genérico v1
El catálogo vive **en el front** como definiciones de tipos paramétricos **(decisión de Claude)**: no hace falta pedírselo a la API en v1. Cada tipo define:
- medidas por defecto y rango permitido (mínimo y máximo);
- variantes (por ejemplo: puertas abatibles o correderas, número de módulos, cajones sí o no);
- zonas de color con su tipo de material;
- su **generador de geometría 3D** (paramétrico, a partir de las medidas: no se deforma al estirar);
- su **huella** en 2D, su **volumen** y sus **zonas de apertura** para los conflictos;
- a qué estancias pertenece (para ordenar el catálogo).

Muebles paramétricos generados por código, en lugar de modelos 3D descargados **(propuesta de Claude, aceptada)**.

Lista mínima **(decisión de Claude; el constructor puede añadir)**:
- **Dormitorio:** cama (individual o doble, con o sin cabecero), mesita, armario (abatible o corredero, 1–4 módulos), cómoda, escritorio, silla, estantería.
- **Salón:** sofá (2–3 plazas, con o sin chaise longue), sillón, mesa de centro, mueble de TV, mesa de comedor, silla, estantería, aparador.
- **Cocina:** módulo bajo (puertas o cajones), módulo alto, columna (horno o frigorífico integrado), encimera, frigorífico, lavavajillas, placa, fregadero, mesa, taburete. Alturas y fondos estándar por defecto (bajos 85 cm con encimera, fondo 60; altos fondo 35).
- **Decoración (todas):** alfombra, lámpara de pie, planta, cuadro (en pared) y cortina (en ventana).

Los elementos "de pared" (cuadro, módulo alto, cortina) llevan altura desde el suelo.

### 6.3 Preparado para tiendas (fase posterior)
Cada elemento lleva `origen`: `{ "tipo": "generico" }` en v1. Más adelante, `{ "tipo": "tienda", "proveedor": "ikea", "referencia": "...", "url": "..." }`, con medidas fijas. IKEA **no tiene API pública**: la vía será la carga manual de productos o un acuerdo, nunca extraer datos de su web. No se construye nada de esto en v1; solo se reserva el campo.

## 7. Backend

- Estructura hexagonal como jornal: `Decorazon.Dominio` (entidades `Usuario`, `Diseno`, invariantes y puertos), `Decorazon.Aplicacion` (casos de uso), `Decorazon.Infraestructura` (EF Core + PostgreSQL, Brevo, JWT), `Decorazon.Api` (endpoints mínimos y composición) y `Decorazon.Contratos` (DTOs). Las dependencias apuntan hacia dentro y lo vigilan tests de arquitectura.
- Nombres en español, tablas en `snake_case`, Ids `Guid` del dominio.
- Correo detrás de `IEnviadorDeCorreo`: adaptador de consola en desarrollo y tests (`[CORREO SIMULADO]` en el log) y Brevo en producción.
- Endpoints (orientativos): `POST /cuentas/registro`, `POST /cuentas/registro/confirmar`, `POST /sesiones`, `POST /cuentas/contrasena/olvido`, `POST /cuentas/contrasena/restablecer`, `DELETE /cuentas/yo`, `GET|POST /disenos`, `GET|PUT|DELETE /disenos/{id}`, `POST /disenos/{id}/duplicar`, `GET /salud`.
- CORS solo para `https://decorazon.angelgf.com.es` (y `localhost` en desarrollo).
- OpenAPI publicado. El cliente TypeScript del front se genera desde él **(decisión de Claude)**.
- Secretos (cadena de conexión, clave JWT, clave de Brevo) fuera del repositorio: `appsettings.Development.json` ignorado en local y `srv secreto` en el servidor.
- Si se usa ASP.NET Data Protection, las claves van a un dato persistente de `srv` (`datos`).

## 8. Calidad y pruebas

- **Back:** xUnit; unitarios de dominio y de integración contra PostgreSQL real con Testcontainers (marcados para poder excluirlos sin Docker), más tests de arquitectura. Igual que jornal.
- **Front:** Vitest para la lógica pura: geometría, conflictos, generadores de huella y apertura, migración del formato del documento. Pruebas de extremo a extremo con Playwright para los recorridos principales (diseñar sin cuenta, registrarse, conservar el diseño, reabrirlo) **(decisión de Claude)**.
- Casos de conflicto obligatorios en los tests: armario bajo una viga, puerta de armario contra cama, cajón contra pared, puerta de la estancia contra un mueble, mueble que atraviesa una columna, tocarse sin solaparse.
- CI en GitHub Actions: compila y prueba, no despliega.

## 9. Otros

- **Idioma:** solo español en v1, con los textos centralizados para poder traducirlos después **(decisión de Claude)**.
- **Analítica:** el tracker propio de Web Analytics, como en angeldice, con un site ID nuevo **(decisión de Claude)**.
- **PWA:** `vite-plugin-pwa`, instalable, con el icono de `icono/`. Las respuestas web llevan `Cache-Control: no-transform` (lección de jornal: Cloudflare reescribe el HTML).
- `.superpowers/` va en `.gitignore`.

## 10. Lo que queda al constructor

- El orden de construcción y el troceo en fases. Se sugiere: (1) backend de cuentas y diseños; (2) editor paso 1 en 2D; (3) catálogo y paso 2 en 2D con conflictos; (4) 3D; (5) guardado, sincronización y PWA; (6) despliegue.
- Las bibliotecas concretas de estado, UI y formularios, y el diseño visual de la interfaz (sobrio y cálido, coherente con el icono).
- El algoritmo de colisiones: en v1 bastan cajas orientadas y polígonos en planta más alturas, sin física.
- Los detalles exactos del esquema JSON y de los endpoints, respetando lo anterior.
- Los puertos locales, que no deben chocar con los de otros proyectos (jornal usa 5310/5311/5434).
