# Redes de afiliación y APIs de datos de producto para muebles (España, noviembre 2026)

Nota previa sobre el método: casi todo lo que sigue procede de documentación oficial (portales de desarrolladores, centros de ayuda, directorios de anunciantes). Donde la única fuente es un tercero (blog, plugin, conector) se indica expresamente. Varias páginas oficiales (CJ, Rakuten, Partnerize, Skimlinks, Kelkoo) se renderizan por JavaScript o exigen sesión, así que parte de su contenido no se pudo leer; esas lagunas están en "Gaps".

## ¿Qué canales entregan las dimensiones (ancho × fondo × alto) como campos estructurados?

### Takeaway
Solo tres canales tienen campos de dimensiones del producto definidos en su esquema: Amazon Creators API (`itemInfo.productInfo.itemDimensions` con height/length/width/weight), los feeds "Enhanced" de Awin en formato Google (`product_length`, `product_width`, `product_height` en cm o in) y, de forma mucho más débil, Impact.com (solo dimensiones de envío `ShippingLength/Width/Height`, no del producto). El resto (Tradedoubler, TradeTracker, CJ, Partnerize, Datafeedr, Kelkoo) o no define dimensiones o las relega a pares nombre/valor libres que dependen de cada anunciante.

### Cited Findings

**Amazon Creators API (sustituye a PA-API 5)**
- PA-API 5 está desaprobada: "Product Advertising API is deprecated. Please migrate to Creators API"; las llamadas devuelven HTTP 403 `AccessDeniedException`. La página no da fecha de apagado — [Amazon, PA-API 5 Deprecation Notice](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation). Las antiguas URLs de documentación de PA-API 5 (item-info.html, read-la.html, api-rates.html) redirigen todas a esa página de desaprobación (comprobado el 3-11-2026).
- Fechas de desaprobación de PA-API citadas en resultados de búsqueda: "PA-API will be deprecated on April 30th, 2026" según la doc antigua de PA-API — [webservices.amazon.ca](https://webservices.amazon.ca/paapi5/documentation/quick-start/operations-and-resources.html); otra fuente cita 15 de mayo de 2026 — [resumen de búsqueda sobre Creators API](https://affiliate-program.amazon.com/help/operating/policies). Las fuentes no coinciden; lo seguro es que a noviembre de 2026 PA-API 5 ya no responde.
- El recurso `itemInfo.productInfo` de Creators API contiene `color`, `isAdultProduct`, `itemDimensions`, `releaseDate`, `size`, `unitCount`. `itemDimensions` se describe como "Height, Length, Weight, and Width of the item" y contiene `height`, `length`, `weight`, `width`, cada uno con `displayValue`, `label`, `locale`, `unit`; los ejemplos muestran "inches" y "pounds" — [Amazon Creators API, ItemInfo](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/resources/item-info).
- Otros subrecursos de ItemInfo: `byLineInfo` (brand, manufacturer), `classifications`, `externalIds` (eans, upcs), `features`, `manufactureInfo` (model), `technicalInfo`, `title` — [misma fuente](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/resources/item-info).
- España está soportada: la Locale Reference lista 22 locales incluida "Spain: https://www.amazon.es" — [Amazon Creators API, Locale Reference](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference).
- GetItems admite hasta 10 ASIN por petición — [Amazon, Best Programming Practices](https://partnernet.amazon.de/creatorsapi/docs/en-us/concepts/best-programming-practices).

**Awin (feeds Enhanced / formato Google y feeds Legacy)**
- Las columnas de los feeds Enhanced para publishers incluyen `product_length`, `product_width`, `product_height` (valores de 1 a 3.000, en cm o in), `product_weight` (g, kg, lb, oz), `shipping_length/width/height`, `shipping_weight`, `size`, `material`, `color`, `pattern`, `product_type`, `product_detail` (array de sección/atributo/valor), `gtin`, `mpn`, `brand`, `additional_image_link`, `virtual_model_link` (modelo 3D/AR si el anunciante lo aporta) — [Awin, Enhanced Feeds Publisher Column Descriptions](https://help.awin.com/developers/docs/enhanced-feeds-publisher-faq.md).
- El endpoint de descarga JSONL para publishers documenta los mismos campos: `product_length`, `product_width`, `product_height` "optional. Format is a number plus unit, with cm or in supported. Values range from 1 to 3,000" — [Awin, Get Enhanced Feed (publisher)](https://help.awin.com/apidocs/retail-publisher-productapidocumentation-1.md).
- En el formato Legacy (CSV estándar) hay una columna única `dimensions`: "Product dimensions usually given as length x width x height" (texto libre; "for fashion, use size"), además de `custom1`–`custom9` ("additional field used as needed"), `specifications`, `product_type`, `model_number`, `colour` — [Awin, Hosting feeds and column descriptions](https://help.awin.com/developers/docs/hosting-feeds.md).
- En Create-a-Feed el selector de feeds distingue "Enhanced" (feeds de anunciante en formato Google) y "Legacy" (formato estándar Awin) — [Awin, Downloading feeds using Create-a-Feed](https://help.awin.com/developers/docs/downloading-feeds-using-create-a-feed).
- Las columnas Enhanced son opcionales: que existan en el esquema no significa que un anunciante concreto las rellene; la descarga por lista de feeds "include only mapped columns" — [Awin, Product Feed List Download](https://help.awin.com/developers/docs/product-feed-list-download.md).

**Impact.com**
- El modelo `Item` de la Partner API v14 incluye `ShippingWeight`, `ShippingWeightUnit`, `ShippingLength`, `ShippingWidth`, `ShippingHeight`, `ShippingLengthUnit`, además de `Size`, `SizeUnit`, `Weight`, `WeightUnit`, `Colors`, `Material`, `Pattern`, `Gtin`, `Mpn`, `AdditionalImageUrls`, `CurrentPrice`, `StockAvailability` y campos personalizados `Text1–3`, `Numeric1–3`, `Money1–3`. No existen `ProductHeight/Width/Length`: "Physical dimensions are only available as shipping dimensions" — [Impact Partner API v14, Catalogs models](https://integrations.impact.com/partner-api-reference/partner-v14/reference/catalogs/models).

**Tradedoubler (Products API)**
- Campos de producto: name, description, price, priceHistory, brand, availability, condition, identificadores (EAN, SKU, UPC, ISBN, MPN), shippingCost, URLs, `size` y `weight` como cadenas, y un array `fields` de pares nombre/valor para atributos adicionales. "No general width, height, depth, or length fields are documented for products. The `width` and `height` fields apply only to `productImage`, in pixels" — [Tradedoubler, Products API for publishers](https://dev.tradedoubler.com/products/publisher/).

**TradeTracker (SOAP)**
- El tipo `FeedProduct` del WSDL tiene: identifier, name, productCategoryName, description, price, productURL, imageURL y `additional` (array de `FeedProductAdditionalElement` con `name` y `value`). "Not present as dedicated fields: EAN, SKU, brand, size, color, weight, dimensions" — [TradeTracker WSDL afiliados](https://ws.tradetracker.com/soap/affiliate?wsdl).

**CJ Affiliate (GraphQL)**
- No se pudo leer la documentación oficial (developers.cj.com devuelve solo el título sin JavaScript). Un wrapper de terceros sobre el endpoint GraphQL de CJ muestra en `shoppingProducts` campos como `title`, `link`, `imageLink`, `productType`, `brand`, `advertiserId`, `gtin`, `mpn`, `condition`, `availability`, y "does not mention additionalImageLink, size, material, color, shipping, customLabel, or any dimension fields" — [Apify, CJ Affiliate API actor (tercero)](https://apify.com/viralanalyzer/cj-affiliate-products).

**Partnerize**
- La Partners API (v1.4.99) tiene una sección "Feeds (v1)" con una única operación "getList all Available Feeds"; el ejemplo de respuesta muestra nombres de fichero CSV y tamaños. No hay esquema de campos de producto en la documentación pública leída — [Partnerize Partners API](https://api-docs.partnerize.com/partner/).

**Datafeedr (agregador)**
- Campos mostrados: nombre, marca, precio, comerciante, red, imágenes; "Dimensions, weight, and other physical attributes are not mentioned" — [Datafeedr](https://datafeedr.com/).

**Kelkoo Group**
- La API de publishers tiene "Shopping API Feeds" (Offers, Merchants, Categories por HTTPS) y "Shopping API Search"; existe una página "Offers feeds - Fields" ([URL](https://docs.kelkoogroup.com/for-publishers/shopping-api-feeds/feeds-offers/offers-feeds-fields.md)) que no se pudo leer (404 en la ruta probada) — [Kelkoo docs, For publishers](https://docs.kelkoogroup.com/for-publishers); [índice llms.txt](https://docs.kelkoogroup.com/llms.txt).

### Inferences
- Para planificación de habitaciones, los únicos esquemas que garantizan tres medidas separadas y con unidad son Creators API (`itemDimensions`) y los feeds Enhanced de Awin (`product_length/width/height`). En ambos casos el valor depende de que el vendedor lo haya informado: en Amazon las unidades de ejemplo son pulgadas/libras (habrá que convertir y normalizar), y en Awin el campo es opcional y se publica solo si el anunciante lo ha mapeado.
- Las columnas Legacy de Awin (`dimensions` como "L x W x H" en texto libre), los `fields` de Tradedoubler y los `additional` de TradeTracker exigirían un parser por anunciante, sin garantía de orden ni unidades.
- Las dimensiones de envío de Impact (caja/paquete) no sirven para muebles montados; en muebles desmontados la caja no coincide con el producto.
- Google Merchant Center sería la fuente ideal (los anunciantes ya envían `product_length/width/height` a Google), pero no es accesible a terceros (véase la siguiente sección); Awin Enhanced es precisamente la copia de ese feed Google que el anunciante entrega a la red.

### Gaps
- No se pudo verificar el esquema oficial de productos de CJ (GraphQL `shoppingProducts`) ni si incluye dimensiones; la doc oficial requiere JavaScript/sesión.
- No se pudo leer la lista de campos de ofertas de Kelkoo ni de la Product Search API de Rakuten (ambas páginas devolvieron 404 en las rutas probadas).
- No hay documentación pública de campos de los feeds de Partnerize.
- No se midió qué porcentaje de anunciantes de muebles en Awin rellena realmente `product_length/width/height`; solo se sabe que el campo es opcional.

## ¿Qué canales puede usar de forma realista un proyecto de una sola persona sin historial de ventas?

### Takeaway
Las redes europeas (Awin, Tradedoubler, TradeTracker, Impact) permiten darse de alta como publisher con una web, sin ventas previas ni cuota (Awin cobra un depósito reembolsable de ~1 EUR), y dan acceso a los feeds de los anunciantes que te acepten (en Awin incluso sin estar aceptado, con "soft membership"). Amazon es el caso opuesto: Creators API exige ventas cualificadas y revoca el acceso tras 30 días sin ventas, lo que lo hace inviable como fuente principal para un proyecto sin tráfico. Datafeedr es de pago (desde 49 $/mes) y además exige estar aprobado por cada comerciante.

### Cited Findings

**Amazon Associates / Creators API**
- El programa Associates "is free to join"; para usar la API hay que ser Associate y después "register for the Creators API to get your API credentials" — [Amazon Creators API, Onboarding](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/onboarding).
- Regla de los 180 días (página oficial de ayuda): "Your application can be withdrawn if there were not enough qualifying sales for 180 days after your application was submitted"; una solicitud rechazada no se reinstaura; una vez hay tres ventas cualificadas Amazon evalúa la solicitud en uno o dos días — [Amazon Associates, Account Dormancy](https://affiliate-program.amazon.com/help/node/topic/G7MJTPEP9NC3YKMG). (La cifra exacta "tres" aparece en la versión complementaria de la misma página citada en resultados de búsqueda; no se pudo leer el texto íntegro.)
- Límites iniciales de Creators API: 1 TPS y 8.640 peticiones/día durante los primeros 30 días; después crecen "one TPD for every five cents or one TPS (up to a maximum of ten TPS) for every $4320 of shipped item revenue" en ventana de 30 días. Pérdida de acceso: la cuenta "will lose access to Creators API if it has not generated qualified referring sales" durante 30 días consecutivos; se restaura a los dos días de que vuelvan a enviarse pedidos referidos — [Amazon Creators API, API Rates and Limits](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/api-rates).
- Un proveedor de plugins (AAWP) atribuye a Amazon un umbral de "at least 10 qualified sales within the last 30 days" para obtener acceso — [AAWP docs (tercero)](https://getaawp.com/docs/article/amazon-creators-api/). No se encontró este número en la documentación oficial leída.
- "Applications that don't direct sales to Amazon, or that fail other Terms and Conditions, will be blocked from Creators API access" — [Amazon, Best Programming Practices](https://partnernet.amazon.de/creatorsapi/docs/en-us/concepts/best-programming-practices).

**Awin**
- Depósito de alta: "1 EUR/GBP/USD deposit, or equivalent, required in order to proceed with the application", que se abona a la cuenta del publisher y se devuelve al alcanzar el primer umbral de pago — [Awin Success Center, Why do I have to pay the sign up fee](https://success.awin.com/articles/en_US/Knowledge/Why-do-I-have-to-pay-the-sign-up-fee) (la página exige sesión; el texto procede del resumen de búsqueda sobre esa URL). Un tercero habla de 5 $ — [Referly (tercero)](https://www.referly.so/affiliate-programs/shareasale) — no confirmado.
- ShareASale ha sido absorbida: "the ShareASale platform will officially close on October 6, 2025"; los nuevos publishers se dan de alta directamente en Awin — [Awin Success Center, ShareASale to Awin upgrade FAQ](https://success.awin.com/articles/en_US/Knowledge/ShareASale-to-Awin-platform-upgrade-FAQ); [Awin news](https://www.awin.com/us/news-and-events/awin-news/shareasale-to-awin-upgrade).
- Cada programa de marca "tendrá sus propios criterios de aceptación"; "no hay un número mínimo de seguidores" — [Awin España, afiliados/creators](https://www.awin.com/es/afiliados).
- Acceso a feeds sin estar aceptado: "You can download an Advertiser's Data Feed without being joined"; con anunciantes de "auto-join" y feed válido se aplica "soft membership" y las ventas se acreditan — [Awin, FAQs for publishers](https://help.awin.com/developers/docs/faqs-for-publishers.md).
- Lista de feeds por API key: `https://productdata.awin.com/datafeed/list/apikey/{clave}` devuelve CSV con Advertiser ID/Name, Primary Region, Membership Status ("Not Joined" posible), Feed ID/Name, Language, Vertical, Last Imported y URL de descarga (CSV gzip, coma); se puede scriptar y descargar solo cuando "Last Imported" cambie — [Awin, Product Feed List Download](https://help.awin.com/developers/docs/product-feed-list-download.md).
- Endpoint JSONL: `GET https://api.awin.com/publishers/{PUBLISHER_ID}/awinfeeds/download/{ADVERTISER_ID}-retail-{LOCALE}.jsonl`, Bearer token, máximo 5 peticiones/minuto, sin descargas concurrentes del mismo feed; "If an Awin feed exists and permission is granted to download" — [Awin, Get Enhanced Feed](https://help.awin.com/apidocs/retail-publisher-productapidocumentation-1.md).
- Create-a-Feed: se elige idioma, feed, columnas, compresión; salida CSV UTF-8 (opción "CSV for Excel" con BOM) — [Awin, Create-a-Feed](https://help.awin.com/developers/docs/downloading-feeds-using-create-a-feed).

**Tradedoubler**
- Requiere "a publisher account and token"; token SHA-1 de 40 caracteres en "Account > Manage tokens" (sistema PRODUCTS). Búsqueda limitada a 1.000 productos; el servicio "Unlimited" devuelve el feed completo (puede contener millones de productos) para "publishers who store and process data themselves"; límite de 3 descargas por versión de fichero cada 24 h (HTTP 429), con 5 días de gracia la primera vez; formatos JSON (defecto), XML, CSV — [Tradedoubler, Products API for publishers](https://dev.tradedoubler.com/products/publisher/).
- Alta según blogs de terceros: basta "tener al menos una página web, verificarla"; aprobación por programa en 3–5 días; pago mínimo 50 € (30 € en febrero) — [wasabitheme (tercero)](https://wasabitheme.com/es/blog/tradedoubler-afiliados/), [orbitalthemes (tercero)](https://orbitalthemes.net/tradedoubler/). La página oficial de publishers (tradedoubler.com/es/publishers/) devolvió 404.

**CJ Affiliate**
- Alta gratuita; fuentes de terceros: mayor de 18 años, web activa, URL de dominio; aprobación de red "generally straightforward for an active site with real content", pero cada anunciante puede exigir mínimos de tráfico — [resumen de búsqueda con fuentes de terceros](https://app.unilink.us/blog/cj-affiliate-guide-2026).
- Acceso a productos vía GraphQL requiere Personal Access Token y Company ID; `products`/`shoppingProducts` "return only advertisers you have joined"; `shoppingProductFeeds` lista feeds sin estar unido; resultados limitados a 1.000 por petición — [Apify, CJ Affiliate API actor (tercero)](https://apify.com/viralanalyzer/cj-affiliate-products).

**Impact.com**
- Solicitud al marketplace revisada en "about two business days"; se envía automáticamente al completar el checklist; un tercero indica que no se publican mínimos de tráfico o ventas — [Impact Help, Sign up as a partner](https://help.impact.com/partner/what-would-you-like-to-learn-about/getting-started/sign-up-as-a-partner-on-impactcom).
- Descarga de catálogos: desde la plataforma (ficheros <3 GB, comprimidos .gz), por FTP (siempre en "Impact Format") o por API (requiere activar acceso API); las marcas "are advised to update their catalogs daily" y Impact sincroniza una vez al día — [Impact Help, Download product catalogs as a partner](https://help.impact.com/partner/what-would-you-like-to-learn-about/platform-features/marketing-content/product-marketplace-and-catalogs/download-product-catalogs-as-a-partner).

**Rakuten Advertising**
- Alianza con impact.com anunciada el 28-4-2026: Rakuten aporta gestión de programas y relaciones, impact.com "platform infrastructure for contracting, tracking, and payments"; no se dan fechas de migración — [Rakuten Advertising, nota de prensa](https://rakutenadvertising.com/media-and-press/rakuten-and-impact-com-announce-alliance-to-scale-the-global-partnership-economy/). AdExchanger interpreta que "merchants and publishers using Rakuten's partnership tech will move to Impact's system" — [AdExchanger](https://www.adexchanger.com/marketers/rakuten-and-impact-com-forge-a-new-alliance-that-resets-the-affiliate-industry/).
- Datafeedr indica que Rakuten "does not list Spain" entre sus países — [Datafeedr coverage](https://datafeedr.com/coverage). BuiltWith cuenta solo 5 sitios en España con Rakuten Affiliate frente a 214 con Impact — [BuiltWith Spain](https://trends.builtwith.com/ads/affiliate-programs/country/Spain).
- Un conector de terceros documenta `GET /productsearch/1.0` con parámetros keyword/mid, tope de 5.000 resultados y token Bearer de corta duración del portal de desarrolladores — [MeltanoLabs tap-rakutenadvertising (tercero)](https://github.com/MeltanoLabs/tap-rakutenadvertising).

**TradeTracker**
- Credenciales de web services bajo "Creatives > Web Services" (Customer ID y Passphrase) — [Shopify Community (tercero)](https://community.shopify.com/t/how-can-i-automate-product-updates-with-tradetracker-api/223929); WSDL público en `https://ws.tradetracker.com/soap/affiliate?wsdl` con operaciones `getFeeds`, `getFeedProductCategories`, `getFeedProducts`; el tipo `Feed` incluye `URL`, `updateDate`, `updateInterval`, `productCount`, `assignmentStatus` — [TradeTracker WSDL](https://ws.tradetracker.com/soap/affiliate?wsdl).
- Alta: "deberás indicar tu sitio web o blog para poder tener acceso a las campañas"; algunas campañas exigen aprobación; pago mínimo 25 € — [elrecaudador (tercero)](https://elrecaudador.com/tradetracker/), [salgodelacrisis (tercero)](https://salgodelacrisis.com/tradetracker/).

**Partnerize**
- Partners API con endpoint "getList all Available Feeds" (CSV); la documentación pública no detalla autenticación ni límites (contenido truncado) — [Partnerize Partners API](https://api-docs.partnerize.com/partner/). Un anunciante describe la descarga desde "Content > Feeds" en la interfaz de partner — [Plum Guide (tercero)](https://help.plumguide.com/en/articles/7177332-affiliates-feed-and-api).

**Google Merchant Center / Merchant API**
- Content API for Shopping "officially reached its sunset date on August 18, 2026"; desde el 1-9-2026 las peticiones sin extensión fallan con HTTP 410 — [Google, Deprecation and sunset](https://developers.google.com/shopping-content/guides/deprecation-and-sunset).
- Merchant API: la autorización "determines what actions the authenticated user or application is permitted to perform" dentro de una cuenta de Merchant Center, "based on the roles and permissions granted to the authenticated user within the Merchant Center account" — [Google Merchant API, Authorization overview](https://developers.google.com/merchant/api/guides/authorization/overview). Para gestionar cuentas ajenas como tercero hace falta que ese comerciante te autorice por OAuth — [Google, Content API setup](https://developers.google.cn/google-ads/shopping/feed-management/articles/t10?hl=en).

**Datafeedr**
- Planes: Starter 49 $/mes (10.000 búsquedas), Basic 79 $/mes (40.000), Pro 249 $/mes (150.000); "You must be approved by at least one merchant before showing their products"; agrega Awin, Impact, CJ, Rakuten, Tradedoubler, TradeTracker, Partnerize, Webgains, Daisycon, Adtraction, Effinity, etc. — [Datafeedr](https://datafeedr.com/). Cobertura con España: Awin 2.554 comerciantes/166 M productos, Impact 1.890, TradeTracker 1.329, Daisycon 1.117, Adtraction 1.181, CJ 736, Tradedoubler 386, Partnerize 84 (cifras globales, no solo España) — [Datafeedr coverage](https://datafeedr.com/coverage).

**Skimlinks / Sovrn Commerce**
- developers.skimlinks.com lista Merchant API, Link Wrapper, Reporting API, Product Key y Data Pipe; "Product API: Not listed" — [Skimlinks developers](https://developers.skimlinks.com/). El plugin WordPress de Skimlinks está retirado — [WordPress.org](https://snd.wordpress.org/plugins/skimlinks/).
- Sovrn: el índice de developer.sovrn.com muestra "Product Recommendation" y "Price Comparisons" bajo Product APIs, y "Product Promo Codes"; sin esquema de campos visible — [Sovrn developer](https://developer.sovrn.com/). Un directorio de terceros afirma que el acceso a Commerce API "requires an approved campaign, which Sovrn reviews only after affiliate links are installed and real clicks have flowed" — [apitracker (tercero)](https://apitracker.io/a/sovrn/products).

**Kelkoo / Idealo / PriceRunner**
- Kelkoo: tokens para Shopping API y Reporting API se crean en el Publisher Center; autenticación JWT; las "Traffic guidelines" prohíben publicar ofertas en Google/Bing Shopping y generar tráfico automatizado — [Kelkoo docs](https://docs.kelkoogroup.com/for-publishers), [Strackr (tercero)](https://strackr.com/docs/kelkoo).
- Idealo: la API (PWS 2.0, JSON) es para tiendas con contrato ("you need a shop listed on idealo"), no para terceros que lean datos — [DataFeedWatch (tercero)](https://www.datafeedwatch.com/blog/your-guide-to-selling-on-idealo?hsLang=en); documentación en import.idealo.com/docs según [Mergado (tercero)](https://www.mergado.com/tag/idealo).
- PriceRunner: no se encontró ninguna documentación de API para publishers.

### Inferences
- Para un proyecto sin tráfico ni ventas, el orden realista es: (1) Awin, por el acceso a feeds sin aprobación (soft membership), la lista scriptable y el endpoint JSONL; (2) TradeTracker y Tradedoubler, que tienen API pública con cuenta de publisher y muchos anunciantes españoles de hogar; (3) Impact, con alta rápida pero sin dimensiones de producto; (4) CJ, cuya API de productos exige estar aceptado por cada anunciante.
- Amazon queda prácticamente descartada como fuente primaria: el acceso a Creators API depende de generar ventas de forma continua (revocación tras 30 días sin ventas) y el tope inicial de 8.640 peticiones/día limita cualquier precarga de catálogo.
- Datafeedr no aporta dimensiones y cuesta dinero; solo tendría sentido como atajo de búsqueda unificada, no como fuente de medidas.
- Google Merchant Center no es una vía: la API solo expone cuentas que te han dado permiso explícito, y la Content API ya está apagada.

### Gaps
- No se pudo verificar en documentación oficial el umbral exacto de ventas para obtener (no mantener) acceso a Creators API; el "10 ventas en 30 días" es de un tercero.
- La página oficial de requisitos de publisher de Tradedoubler España devolvió 404; los requisitos citados son de blogs.
- No se encontraron los límites de tasa ni el mecanismo de autenticación de la Partners API de Partnerize.
- No se pudo comprobar si TradeTracker exige aprobación por campaña para acceder a cada feed (el campo `assignmentStatus` del WSDL sugiere que sí).

## ¿Qué exigen los términos de uso (atribución, enlace, caché, uso derivado, ausencia de ventas)?

### Takeaway
Amazon tiene las condiciones más restrictivas y documentadas: caché máxima de 24 h, prohibición de almacenar imágenes, enlace obligatorio a Amazon en cada uso, sello de fecha y aviso junto al precio, uso limitado a sitios cuya "finalidad principal" sea promocionar Amazon, aprobación previa para apps móviles y prohibición expresa de "acumular, analizar, extraer o readaptar" el contenido. Las redes europeas publican muy poco sobre uso de datos de feed en sus docs técnicas; sus condiciones están en los términos de publisher (PDF) y en las condiciones de cada programa.

### Cited Findings

**Amazon (Licencia de PI del Programa de Afiliados, versión España)**
- Caché 2(h): "podrá guardar un enlace al Contenido Publicitario del Producto durante un plazo máximo de 24 horas"; imágenes: "No guardará ni almacenará en la memoria oculta o caché Contenido Publicitario del Producto consistente en una imagen"; los ASIN pueden guardarse indefinidamente — [Amazon Afiliados España, Políticas del Programa](https://afiliados.amazon.es/help/operating/policies). Versión EE. UU.: contenido no-imagen cacheable "for up to 24 hours", imágenes no cacheables, enlace a imagen almacenable 24 h — [Amazon Associates US, Program Policies](https://affiliate-program.amazon.com/help/operating/policies).
- Enlace 1 y 2(c)(iii): "Enlazará cada uso del Contenido Publicitario del Producto, única y exclusivamente, a la página correspondiente" de Amazon — [Políticas ES](https://afiliados.amazon.es/help/operating/policies).
- Precio 2(i): "Incluirá un sello de fecha y hora junto al lugar donde se muestre la información de precio o disponibilidad" más aviso de exención (enlace o ventana emergente) — [Políticas ES](https://afiliados.amazon.es/help/operating/policies). Versión US: necesario si se usan Data Feeds o se refresca con menos frecuencia que cada hora; disclaimer "prices and availability are subject to change"; atribución obligatoria "CERTAIN CONTENT THAT APPEARS…" (2(k)) — [Políticas US](https://affiliate-program.amazon.com/help/operating/policies).
- Finalidad principal 2(c)(i): no puede usarse en un sitio "que no tenga como objetivo principal la publicidad y promoción de un Sitio de Amazon" — [Políticas ES](https://afiliados.amazon.es/help/operating/policies).
- Móvil 2(d): aprobación previa para páginas o apps móviles salvo "Aplicaciones Móviles Aprobadas" — [Políticas ES](https://afiliados.amazon.es/help/operating/policies).
- Agregación 2(e): "no accederá a Creators API y la PA API o a las Fuentes de Datos con el fin de acumular, analizar, extraer o readaptar" el contenido ni para entrenar modelos; Data Feeds solo con "autorización previa y expresa por escrito" (2(b)) — [Políticas ES](https://afiliados.amazon.es/help/operating/policies). Versión US: prohibido usar el contenido para "develop or improve large language or multimodal models" (§1) y para marketing directo (2(f)(ii)) — [Políticas US](https://affiliate-program.amazon.com/help/operating/policies).
- Caché recomendada por Amazon: Offers 1 h, BrowseNodeInfo 1 h, el resto (Images, ItemInfo…) 1 día; "It is against the Creators API Terms and Conditions to cache customer information derived from Amazon" — [Amazon, Best Programming Practices](https://partnernet.amazon.de/creatorsapi/docs/en-us/concepts/best-programming-practices).
- La licencia de Creators API es la sección IP License del Operating Agreement de cada locale: "The terms and conditions for each locale apply to any use of the Creators API in that locale" — [Amazon Creators API, License Agreement](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/license-agreement).
- Sin ventas: pérdida de acceso a la API tras 30 días consecutivos sin ventas cualificadas — [API Rates](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/api-rates); retirada de la solicitud de cuenta si no hay ventas suficientes en 180 días — [Account Dormancy](https://affiliate-program.amazon.com/help/node/topic/G7MJTPEP9NC3YKMG).

**Awin**
- Las docs técnicas de feeds no contienen términos de uso de datos (comprobado en [Product Feed Publisher](https://help.awin.com/developers/docs/product-feed-publisher.md), [FAQs](https://help.awin.com/developers/docs/faqs-for-publishers.md) y [Create-a-Feed](https://help.awin.com/developers/docs/downloading-feeds-using-create-a-feed)). Los términos de publisher se publican como PDF por país (p. ej. [Awin AG Publisher Terms agosto 2025, DE](https://www.awin.com/docs.awin.com/Legal/Publisher+Terms/2025/DE-Awin-AG-Publisher-terms-August-2025.pdf)); el depósito "is listed on the application form itself" — [resumen de búsqueda](https://success.awin.com/articles/en_US/Knowledge/Why-do-I-have-to-pay-the-sign-up-fee).
- Condiciones por programa: p. ej. Muebles Style Spain "solo aceptamos publishers cuyos métodos de promoción sean perfectamente identificables" — [Awin, perfil 122118](https://ui.awin.com/merchant-profile/122118); Leroy Merlin ES prohíbe el alta a sus empleados — [Awin, perfil 20598](https://ui.awin.com/merchant-profile/20598).
- Umbral de pago: el depósito se devuelve "after the first payment threshold is reached" — [resumen de búsqueda sobre Awin Success Center](https://success.awin.com/articles/en_US/Knowledge/Why-do-I-have-to-pay-the-sign-up-fee).

**Tradedoubler**
- La página de la API enlaza a Terms & Conditions y Privacy Policy sin reproducirlos; el servicio Unlimited está pensado para publishers que "store and process data themselves"; límite de 3 descargas por versión/24 h — [Tradedoubler Products API](https://dev.tradedoubler.com/products/publisher/).
- Condiciones por programa en el directorio, p. ej. IKEA (Alemania): sin SEM/Google Shopping/brand bidding, sin retargeting ni cashback, "Webseiten mit Sitz außerhalb Deutschlands können nicht berücksichtigt werden", y "Sämtliche Produkte sind über den Datenfeed zugänglich" — [Tradedoubler directory, IKEA 290994](https://directory.tradedoubler.com/es/programs/290994-IKEA).

**Impact.com**
- La página de descarga de catálogos "doesn't address" restricciones de uso, caché o redistribución; el modelo Catalog incluye `FTPLocations` con credenciales — [Impact Help](https://help.impact.com/partner/what-would-you-like-to-learn-about/platform-features/marketing-content/product-marketplace-and-catalogs/download-product-catalogs-as-a-partner), [Impact Partner API models](https://integrations.impact.com/partner-api-reference/partner-v14/reference/catalogs/models).

**Kelkoo**
- Traffic guidelines: prohibido publicar ofertas/Links de Kelkoo en Google o Bing Shopping y usar medios automatizados para generar tráfico — [Kelkoo, Traffic guidelines](https://docs.kelkoogroup.com/for-publishers/quick-starts/traffic-guidelines).

**Datafeedr**
- "You must be approved by at least one merchant before showing their products"; los productos retirados se eliminan automáticamente; "You keep 100% of your affiliate commissions" — [Datafeedr](https://datafeedr.com/).

### Inferences
- Un planificador de habitaciones que almacena un catálogo con medidas y lo usa para colocar muebles en un plano encaja mal con la licencia de Amazon: (a) no tiene como "objetivo principal" promocionar Amazon, (b) la precarga y normalización de dimensiones es "acumular/analizar/readaptar" sin autorización escrita, (c) la caché de 24 h obliga a refrescar todo el catálogo a diario con 8.640 peticiones/día iniciales (10 ASIN por GetItems = ~86.000 ítems/día como máximo teórico, pero cada ítem requiere refresco diario), y (d) si es app móvil o PWA instalable necesita aprobación previa. El riesgo de que Amazon bloquee la aplicación por "not direct sales to Amazon" es alto.
- En las redes europeas el modelo de "feed completo que el publisher descarga y procesa" está explícitamente previsto (Tradedoubler Unlimited, Awin JSONL/CSV gzip, Impact FTP), así que almacenar el catálogo y mostrar nombre, imagen, precio y medidas con enlace de afiliado es el uso normal; las restricciones relevantes vendrán de los términos de publisher por país (no leídos) y de cada programa (p. ej. prohibición de brand bidding, exclusividad geográfica).
- La ausencia de ventas en redes europeas no revoca el acceso a feeds según las docs leídas; solo afecta a la devolución del depósito de Awin y a que anunciantes concretos puedan expulsar a publishers inactivos (no documentado).

### Gaps
- No se pudieron leer los términos de publisher de Awin para España (PDF), ni los T&C de Tradedoubler, TradeTracker, CJ, Impact o Partnerize, por lo que no se puede afirmar qué dicen sobre caché, atribución o uso derivado de los datos de feed.
- No se encontró ninguna regla publicada en redes europeas sobre expulsión del publisher por falta de ventas.
- No se verificó si Awin exige mostrar el precio con fecha o algún aviso al reutilizar feeds.

## ¿Qué anunciantes españoles de muebles hay en cada red?

### Takeaway
Awin y TradeTracker tienen la oferta española de muebles más verificable: en Awin están Conforama ES, Banak, Kenay, Klast, Muebles Style Spain y Leroy Merlin ES; en TradeTracker la categoría "Hogar y jardín" (47 campañas) incluye Casa Viva, MerkaMueble, Kit Muebles, Decorshopping, Meblero, OcioHogar, Regaldekor, MisterWils, Songmics, Muy Mucho y Roca. IKEA España y Kave Home llevan programas propios fuera de estas redes. Para Tradedoubler, CJ, Impact y Partnerize no se pudo confirmar ningún anunciante español de muebles.

### Cited Findings

**Awin (perfiles públicos de anunciante)**
- Conforama ES (ID 11125): "Muebles y decoración 6% / Gran-Pequeño Electrodoméstico: 4%"; categorías sofás, colchones, dormitorio, salón — [Awin, perfil 11125](https://ui.awin.com/merchant-profile/11125). Conforama PT (ID 18551) también cubre España — [Awin, perfil 18551](https://ui.awin.com/merchant-profile/18551).
- Banak ES (ID 25307): cadena de muebles con >100 tiendas en España y Portugal; "Default: 6% Cliente recurrente & 8% Cliente Nuevo", 4% para retargeting y subredes — [Awin, perfil 25307](https://ui.awin.com/merchant-profile/25307/commission-groups).
- Kenay ES (ID 25309): muebles y decoración de diseño propio, muchos "fabricados en España y pueden personalizarse" — [Awin, perfil 25309](https://ui.awin.com/merchant-profile/25309?setLocale=da_DK).
- Klast ES (ID 30157): tienda online de muebles, entrega "entre 24 y 72 horas" — [Awin, perfil 30157](https://ui.awin.com/merchant-profile/30157).
- Muebles Style Spain (ID 122118): muebles de estilo diseño, "Envío gratuito a la Península" — [Awin, perfil 122118](https://ui.awin.com/merchant-profile/122118).
- Leroy Merlin ES (ID 20598): "6% CPA para productos marca Leroy Merlin" — [Awin, perfil 20598](https://ui.awin.com/merchant-profile/20598); lanzamiento del programa en Awin — [Awin news](https://www.awin.com/es/noticias-y-eventos/news/leroy-merlin), [Alimarket](https://www.alimarket.es/construccion/noticia/327301/leroy-merlin-lanza-su-programa-de-afiliacion-awin--un-nuevo-recurso-para-impulsar-ventas-online).
- Maisons du Monde: Awin anunció una oferta de comisión por el lanzamiento de su programa (país no indicado) — [Awin hub](https://hub.awin.com/?p=1701238); Lasso dice que el programa va por CJ (4–8 %, cookie 30 días, país no indicado) — [Lasso (tercero)](https://getlasso.co/affiliate/maisons-du-monde/); la versión alemana está en Effinity — [affi.io (tercero)](https://affi.io/m/maisons-du-monde-de). La página oficial de afiliación ES (maisonsdumonde.com/ES/es/e/legal/programme-affiliation) devolvió 403; la búsqueda la resume como CPA hasta 14 % para "editores temáticos, medios de comunicación e influencers".

**TradeTracker España (categoría Hogar y jardín, 47 campañas)**
- Página 1: Casa Viva (38 tiendas en España y Andorra), ColchónStore, Decorshopping, ekamia.eu, Kit Muebles, Interiorlabels ES, Living & Company ES, Ciberdescans, Estores Baratos (10 % de comisión, ticket medio 265 €), Lamparas.es, Ledbox — [TradeTracker, Hogar y jardín](https://tradetracker.com/es/campaigns/hogar-y-jardin-31/), [Estores Baratos](https://tradetracker.com/es/campaigns/hogar-y-jardin-31/estores-baratos-36792/), [Casa Viva](https://tradetracker.com/es/campaigns/hogar-y-jard%C3%ADn-31/casa-viva-31054/).
- Página 2: Meblero, MerkaMueble (tiendas físicas en España), Mipuf, MisterWils, Muy Mucho, Mundoalfombra, OcioHogar, Regaldekor, Regalos Miguel, The Secret Home ES, Lucide, Songmics, Zanvic, MaxiFundas, Roca, RivaOffice ES — [TradeTracker, Hogar y jardín p. 2](https://tradetracker.com/es/campaigns/hogar-y-jardin-31/?page=2).

**Tradedoubler**
- El directorio permite filtrar por país (España) y categoría "Hogar y jardín", pero la lista sin filtro (228 páginas) no mostró ningún programa español de muebles — [Tradedoubler directory](https://directory.tradedoubler.com/es/programs). El programa IKEA listado es de Alemania, cerrado a nuevos publishers y solo para webs con sede en Alemania — [Tradedoubler, IKEA 290994](https://directory.tradedoubler.com/es/programs/290994-IKEA).

**Programas propios (fuera de redes)**
- IKEA España: "Recibirás una comisión de hasta un 5% sobre el valor del producto", alta gratuita por formulario y aprobación; el enlace de registro apunta a afiliadosueco.com (dominio que no resolvió DNS el 3-11-2026); no se menciona feed — [IKEA España, Afiliados](https://www.ikea.com/es/es/campaigns/affiliates-pub9a336260/), [versión EN](https://ikea.com/es/en/campaigns/home-fanatic-recommend-ikea-pub9a336260).
- Kave Home: plataforma propia (affiliates.kavehome.com), "the only requirement is that you manage a web page, blog or use your profile on social networks"; abierto a particulares; comisiones según terceros entre 10 % y 30 % (fuentes contradictorias); un directorio dice que usa Post Affiliate Pro — [Kave Affiliates](https://kavehome.com/en/en/affiliate/), [Kave help](https://help.kavehome.com/hc/es/articles/10493083454621), [Kave aff-terms](https://kavehome.com/en/en/e/aff-terms), [Post Affiliate Pro (tercero)](https://www.postaffiliatepro.com/affiliate-program-directory/kave-home-affiliate-program/).

**Impact, Partnerize, Rakuten, CJ**
- No se encontró ningún anunciante español de muebles en Impact, Partnerize ni Rakuten; los ejemplos de muebles en esas redes son estadounidenses (Home Depot en Impact, One Kings Lane en Partnerize) — [UpPromote (tercero)](https://uppromote.com/blog/home-decor-furniture-affiliate-programs/). Presencia en webs españolas según BuiltWith: Impact 214 sitios, Rakuten 5, Partnerize ausente de la lista — [BuiltWith](https://trends.builtwith.com/ads/affiliate-programs/country/Spain).
- Westwing, Sklum, Miliboo y Vente-unique: no se encontró en qué red (o si) tienen programa para España.

### Inferences
- La combinación Awin + TradeTracker cubre la mayoría de los grandes de mueble generalista en España (Conforama, Leroy Merlin, Banak, Casa Viva, MerkaMueble, Kit Muebles) más marcas de diseño (Kenay, Muebles Style). Awin además es el único de los dos con campos de dimensiones estructurados en el esquema (Enhanced).
- IKEA y Kave Home, dos de las marcas más relevantes para un planificador de habitaciones en España, exigirían integraciones aparte (programa propio, sin API de productos documentada), lo que resta valor a cualquier estrategia "solo redes".

### Gaps
- No se pudo filtrar el directorio de Tradedoubler por España + Hogar (la página devolvió la lista completa sin filtros aplicados), así que no se puede afirmar que Tradedoubler no tenga anunciantes españoles de muebles; solo que no se vieron.
- No se pudo acceder a los directorios de anunciantes de CJ, Impact ni Partnerize (requieren sesión); la ausencia de anunciantes españoles de muebles en ellos no está verificada.
- No se confirmó la red del programa de Maisons du Monde para España (Awin, CJ o propio).
- No se comprobó qué anunciantes de Awin/TradeTracker entregan feed en formato Enhanced con `product_height/width/length` rellenos; requiere cuenta de publisher y descargar los feeds.
