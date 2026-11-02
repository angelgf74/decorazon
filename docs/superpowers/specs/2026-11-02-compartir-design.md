# Compartir un diseño con un enlace

## Para qué

Enseñar un diseño a alguien que no tiene cuenta (la pareja, un carpintero, un amigo) sin que tenga que registrarse: le pasas un enlace, lo abre en el móvil o en el ordenador y ve el plano, la 3D y la lista de muebles. Si le gusta, puede hacer una copia y seguir diseñando a partir de ella sin tocar el original.

## Decisiones de Angel

- Quien abre el enlace ve el **plano con cotas, la 3D (que puede girar) y la lista de muebles**, en solo lectura, y tiene un botón **«Hacer una copia»** que le abre el diseño en el editor como suyo.
- El enlace enseña **siempre la última versión guardada**: lo que cambies y guardes se ve al recargar. Se puede **dejar de compartir** cuando quieras.

## Objetivos

- Compartir un diseño guardado en la cuenta con un enlace que no se puede adivinar.
- Copiar el enlace cuando haga falta, y dejar de compartir (el enlace deja de funcionar al momento).
- Una página pública de solo lectura que funcione sin sesión, en el móvil y en el ordenador.
- Hacer una copia: con sesión, a «Mis diseños»; sin sesión, como diseño del navegador (el «anónimo»).

## No objetivos

- Compartir para editar entre varios, comentarios o permisos por persona.
- Compartir un diseño que solo está en el navegador (sin cuenta): primero hay que guardarlo en la cuenta, como ya pide la app para tenerlo en otros dispositivos.
- Fotos del momento (versiones fijas) o varios enlaces por diseño.
- Vista previa en redes (Open Graph con imagen).

## Lo que no puede pasar (anti-objetivos)

- Que el enlace deje ver otros diseños, el correo o cualquier dato de la cuenta del dueño.
- Que alguien sin el enlace pueda llegar al diseño, o que un enlace retirado siga funcionando.
- Que «Hacer una copia» sin sesión borre sin avisar el diseño que esa persona tuviera en su navegador.
- Que el token del enlace acabe en la analítica externa.

## Cómo funciona

### Dueño

- En **Mis diseños**, cada fila gana el botón **«Compartir»** (también sin conexión no se ofrece: hace falta la API). Abre un diálogo:
  - Si el diseño no está compartido: explica qué verá quien tenga el enlace y ofrece **«Crear enlace»**.
  - Si ya lo está: muestra el enlace en un campo de solo lectura con **«Copiar enlace»** (portapapeles; si no hay, se selecciona el texto) y **«Dejar de compartir»** (con confirmación: el enlace dejará de funcionar).
- La fila de un diseño compartido lleva una marca «Compartido».
- Volver a compartir tras dejar de compartir crea un enlace nuevo; el anterior no vuelve a funcionar.

### Quien recibe el enlace

- Ruta pública **`/compartido/<token>`** en la web.
- Cabecera con el nombre del diseño, el tipo y las medidas de la estancia y «Actualizado …» (fecha de la última modificación).
- **Plano** con cotas, muebles con nombre, aberturas y estructura (las mismas capas que la hoja para imprimir), ajustado al ancho; sin edición. En el móvil se acerca con el zoom normal de la página.
- **Vista 3D** que se puede girar y acercar (carga perezosa, como en el editor; sin WebGL, el mismo aviso que el editor).
- **Lista de muebles** (la de la hoja para imprimir).
- **«Hacer una copia»**:
  - Con sesión: crea un diseño nuevo en su cuenta con el nombre «<nombre> (copia)» y lo abre en el editor. Si ha llegado al límite de 100 diseños, se le dice.
  - Sin sesión: lo carga como diseño del navegador y abre `/disenar`. Si ya tenía uno con contenido, antes pregunta si quiere sustituirlo.
- Enlace que no existe o ya no se comparte: página «Este enlace ya no funciona» con un enlace al inicio. No se distingue entre «nunca existió» y «se dejó de compartir».

## API

- **Dato:** columna nueva `enlace_compartido` (texto, opcional, índice único) en `disenos`. Guarda el token tal cual (no su hash), para poder copiar el enlace cuando se quiera. Un diseño tiene a lo sumo un enlace.
- **Token:** el del generador de tokens que ya existe: 256 bits aleatorios en base64url (43 caracteres).
- **Dominio:** `Diseno.Compartir(token)` (si ya tiene enlace, lo deja como está) y `Diseno.DejarDeCompartir()`. **No cambian la versión ni la fecha de modificación** del diseño: compartir no debe provocar conflictos de versión en un editor abierto, y «Actualizado …» habla del contenido. Duplicar un diseño no copia su enlace.
- **Endpoints con sesión** (diseño ajeno o inexistente: 404, como el resto):
  - `PUT /disenos/{id}/enlace` → 200 `{ enlace: "<token>" }`. Idempotente: si ya estaba compartido, devuelve el mismo token.
  - `DELETE /disenos/{id}/enlace` → 204 (también si no estaba compartido).
  - `RespuestaDeResumenDeDiseno` y `RespuestaDeDiseno` ganan `enlace` (token o null), para la marca y el diálogo.
- **Endpoint público** (sin `RequireAuthorization`), con un límite de peticiones por IP propio (`lectura-compartida`, 120 por minuto):
  - `GET /compartidos/{token}` → 200 `{ nombre, tipoEstancia, contenido, fechaDeModificacion }`, sin id, sin usuario y sin el propio token. `Cache-Control: no-store`. Token desconocido o con formato raro: 404 con el mensaje de siempre.
- **Borrado de cuenta:** los enlaces van en la misma fila que el diseño, así que desaparecen con él; no hace falta tocar el borrado.
- **Migración** nueva (`EnlaceCompartido`), aplicada por `srv subir`.

## Web

- `servidor.ts`: `compartirDiseno(id)`, `dejarDeCompartir(id)`, `obtenerCompartido(token)` (valida el contenido con `validarDocumento`, como el resto).
- Página `VistaCompartida` en `disenos/paginas/`, sin el almacén del editor:
  - Plano: componente nuevo de solo lectura con las capas de la hoja (se extrae de `HojaImpresion` lo que compartan, sin cambiar lo que imprime).
  - 3D: componente de solo lectura que pinta `Escena3D` con el documento por props y `sinResaltes`, cargado con `lazy`, sin seleccionar nada al pulsar.
  - Lista: la tabla de la hoja, extraída a un componente que usan los dos.
- **Analítica:** no se mide la carga de `/compartido/…` (el token va en la ruta).
- Textos nuevos en `textos.ts` (sección `compartir`).

## Lo que queda a criterio de quien lo construya

- Diseño visual del diálogo y de la página, siguiendo el estilo de la hoja y de Mis diseños (móvil primero, AA).
- Si el plano de la página admite arrastrar para moverse o se queda fijo ajustado al ancho (por defecto, fijo).
- Cómo se reparte el código entre componentes, siempre que la hoja para imprimir siga igual.
