# Vista previa del enlace compartido

## Para qué

Al pegar el enlace de un diseño en WhatsApp, Telegram, Facebook, X o Slack, que salga una tarjeta con el nombre del diseño y una imagen de su vista 3D, en lugar de un enlace pelado. Invita a abrirlo.

## Decisiones de Angel

- El enlace sigue siendo el de la web: `https://decorazon.angelgf.com.es/compartido/<enlace>`.
- La tarjeta lleva una captura de la **vista 3D**.
- La imagen se **rehace al guardar** el diseño, si está compartido (como mucho una vez cada pocos minutos): va con «siempre la última versión».

## Cómo funciona

Los servicios de mensajería no ejecutan JavaScript: leen las etiquetas Open Graph (`og:title`, `og:image`…) del HTML que devuelve la dirección. La web es una SPA estática, así que esa dirección devuelve siempre el mismo `index.html` sin datos del diseño.

- **nginx** distingue por el `User-Agent` a los lectores de tarjetas (WhatsApp, facebookexternalhit, Twitterbot, TelegramBot, Slackbot, Discordbot, LinkedInBot, Pinterest, Applebot…) y solo a ellos les sirve, en `/compartido/<enlace>`, la tarjeta que genera la API. A las personas les sigue llegando la web de siempre.
- **La API** genera la tarjeta: un HTML mínimo con las etiquetas Open Graph y Twitter (`summary_large_image`), y un enlace a la página de la web por si alguien llega ahí (sin redirección automática: un navegador que nginx tomara por lector entraría en bucle).
  - Título: el nombre del diseño.
  - Descripción: «Baño compartido con Decorazon: plano, vista 3D y lista de muebles» (con el tipo de estancia).
  - Imagen: la vista previa guardada; si no la hay, el icono de la web (512×512).
  - `og:url`: la dirección de la web del enlace.
- **La imagen** la hace el navegador del dueño, con la misma escena 3D que la hoja para imprimir, a 1200×630 (el tamaño que piden las tarjetas grandes) en JPEG, y la sube a la API. El servidor no tiene que pintar nada.
  - Al crear el enlace (en el diálogo de compartir).
  - Al guardar el diseño en el editor, si está compartido y la última se subió hace más de 5 minutos.
  - Sin WebGL, no se hace: la tarjeta sale con el icono.

## API

- **Dato:** tabla nueva `vistas_previas` (`diseno_id` clave y clave foránea a `disenos` en cascada, `imagen` bytea, `fecha`). Una por diseño; se sustituye. Al borrar el diseño o la cuenta, desaparece con él.
- **`PUT /disenos/{id}/vista-previa`** (con sesión; diseño ajeno o inexistente: 404). Cuerpo: la imagen en `image/jpeg`, como mucho 300 KB, que empiece como un JPEG (`FF D8 FF`); si no, 400. Otro tipo de contenido: 415 (lo responde el enrutado). Responde 204.
- **`GET /compartidos/{enlace}/imagen`** (sin sesión, mismo límite por IP que la lectura): la imagen con `Cache-Control: public, max-age=300`. Sin enlace válido o sin imagen: 404.
- **`GET /compartidos/{enlace}/tarjeta`** (sin sesión, mismo límite): `text/html; charset=utf-8`, `Cache-Control: no-store`. El nombre va escapado. Con un enlace que no existe o ya no se comparte: 404 con una tarjeta genérica de Decorazon (sin datos de nadie).
- Las direcciones de la tarjeta salen de la configuración: la de la web, de `Correo:BaseDeLaWeb` (ya obligatoria y https en producción); la de la imagen, del propio host de la petición, por eso nginx la reenvía con `Host: decorazon-api.angelgf.com.es`.
- **Migración** nueva (`VistasPrevias`), aplicada por `srv subir`.

## Servidor (nginx)

- `srv.json` gana `"nginx": "deploy/nginx.conf"`: el sitio deja de salir de la plantilla de `srv` y sale de ese fichero, que es la plantilla de hoy más:
  - un `map $http_user_agent $decorazon_lector_de_tarjetas` con los lectores conocidos;
  - en el servidor de la web, `location ~ ^/compartido/(?<enlace>[A-Za-z0-9_-]{1,64})$`: a los lectores, un `rewrite` a una ubicación interna que hace `proxy_pass` a la API (`/compartidos/$enlace/tarjeta`, con `Host` de la API y la IP real); al resto, `try_files … /index.html`.
- El puerto de la API (hoy 54011) va escrito en el fichero: `srv` no lo sustituye en un nginx propio. Queda anotado en el fichero y en la memoria del proyecto que, si `srv` cambiara el puerto, hay que cambiarlo ahí.
- **Angel lanza `srv configurar --publicar`** una vez (pide sudo); antes, el ensayo enseña las diferencias con el sitio actual, que deben ser solo lo añadido. `srv` hace `nginx -t` antes de recargar y restaura si falla.

## Web

- `crearVistaPrevia(doc)`: monta fuera de la pantalla la captura 3D (perezosa, como la de la hoja), la recorta a 1200×630 y la devuelve en JPEG (`Blob`), o null sin WebGL.
- `subirVistaPrevia(id, blob)` en `servidor.ts`.
- Diálogo de compartir: tras «Crear enlace», en segundo plano, lee el diseño, hace la imagen y la sube. Un fallo no se enseña: la tarjeta saldrá con el icono.
- Editor de un diseño de la cuenta: tras un guardado correcto, si el diseño está compartido y la última imagen tiene más de 5 minutos, la rehace en segundo plano. El editor sabe si está compartido por el `enlace` que trae el diseño al abrirlo y que actualiza cada guardado.

## Lo que no

- Imagen generada en el servidor.
- Elegir la imagen o el texto de la tarjeta.
- Tarjetas para otras páginas de la web.

## A criterio de quien lo construya

- La lista exacta de `User-Agent`.
- El texto de la tarjeta genérica y los detalles del HTML.
- Cómo se encadena la captura en el editor sin estorbar a quien edita (cuándo se monta, que no compita con la vista 3D abierta).

## Decisiones tras la revisión

- **Cloudflare:** comprobado desde fuera con los `User-Agent` de WhatsApp, Facebook y Telegram: `/compartido/…` llega a nginx (`cf-cache-status: DYNAMIC`, sin retos). El HTML no se cachea. Tras publicar se comprueba con un enlace real pegado en WhatsApp.
- **Imagen al día:** `og:image` lleva `?v=<fecha de la imagen>`: al rehacerla, la dirección cambia y los servicios la vuelven a pedir. Lo que un servicio ya guardó de su lado no se puede borrar desde aquí; al dejar de compartir, la imagen y la tarjeta dan 404 al momento.
- **nginx:** `deploy/nginx.conf` parte del texto exacto que genera hoy la plantilla de `srv` (`sitio(config, { puerto })`); el ensayo de `srv configurar` debe enseñar solo lo añadido. Si enseña otra cosa, se para y se mira.
- **Puerto:** se fija en `srv.json` (`api.puerto: 54011`, el registrado). Un test de arquitectura comprueba que el `proxy_pass` del nginx propio usa ese puerto.
- **Errores y límite:** tarjeta e imagen tienen su propio cubo, 300 por IP y minuto. Si la API responde 429 o 5xx a la tarjeta, nginx sirve el `index.html` de siempre (`proxy_intercept_errors` + `error_page`). El 404 de un enlace retirado sí llega: es la tarjeta genérica.
