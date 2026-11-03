# Catálogos de tiendas de muebles en España: vías oficiales de integración para Decorazon (estado a 3 de noviembre de 2026)

Nota metodológica: todo lo marcado como "no verificado" procede de buscadores o directorios de terceros y no pude abrir la fuente primaria. Los perfiles de anunciante de Awin (`ui.awin.com/merchant-profile/...`) devuelven 404 sin sesión de publisher; lo que cito de ellos procede de los fragmentos que devolvió el buscador, no de una lectura completa. Varias páginas legales (Leroy Merlin, El Corte Inglés, Kave Home, Maisons du Monde, Zara Home) bloquean el acceso automatizado (403/429) y no pude leerlas; está indicado en cada caso. Amazon se trata solo de pasada porque lo cubre otro investigador.

## Resumen por tienda (tabla de situación)

### Takeaway
Ninguna de las tiendas analizadas publica una API pública documentada para terceros con datos de producto. La única vía oficial y repetible para obtener nombre, precio, imagen, URL y (a veces) dimensiones es el feed de producto de un programa de afiliación (Awin para Leroy Merlin, Conforama y El Corte Inglés; Daisycon para Westwing; plataforma propia para Kave Home). IKEA no tiene ni API ni programa de afiliación; sus modelos 3D (GLB) se sirven en la web pero sin licencia de reutilización.

### Cited Findings
| Tienda | API/portal oficial | Programa de afiliación con feed (red) | Dimensiones en el feed | 3D/AR a terceros | Catálogo digital | Condiciones sobre scraping |
|---|---|---|---|---|---|---|
| IKEA | No hay API pública ni portal de desarrolladores; lo que circula es ingeniería inversa — [API Evangelist](https://providers.apievangelist.com/providers/ikea/) | No se ha encontrado programa de afiliación en España (ningún directorio lo lista; búsqueda sin resultados) | n/a | GLB en fichas web, sin licencia de reutilización; descarga solo con scripts no oficiales — [Digital Production, 9 feb 2026](https://digitalproduction.com/2026/02/09/download-ikea-furniture-as-3d-models-minus-the-trolley/) | Catálogo anual cancelado (impreso y digital) desde dic. 2020 — [IKEA Newsroom](https://www.ikea.com/us/en/this-is-ikea/newsroom/after-70-successful-years-ikea-is-turning-the-page-on-the-catalog-pubad91dde0) | ES: prohíbe reproducción/distribución/transformación sin consentimiento escrito y frames; no menciona robots — [Condiciones web IKEA.es](https://www.ikea.com/es/es/customer-service/terms-conditions/terminos-condiciones-web-pub417ec831/). EE. UU. (2 sep 2026) prohíbe expresamente robots/scraping — [Terms US](https://www.ikea.com/us/en/customer-service/terms-conditions/) |
| Leroy Merlin ES | No hay API pública de catálogo; el marketplace (Mirakl) solo expone API a vendedores — [ChannelEngine](https://support.channelengine.com/hc/en-us/articles/4700020245789-Leroy-Merlin-marketplace-guide) | Sí, Awin (ID 20598): 6 % marca propia, 3 % marketplace, cookie 30 días, ~180.000 referencias, "catálogo de productos actualizado" para afiliados — [Awin](https://ui.awin.com/merchant-profile/20598) | Depende de lo que cargue el anunciante en Awin (no verificado) | No encontrado | Solo folletos en agregadores (Tiendeo); no verificado en web oficial | Aviso legal no accesible (403). robots.txt bloquea herramientas de descarga, buscador y endpoints internos; no bloquea fichas de producto — [robots.txt](https://www.leroymerlin.es/robots.txt) |
| Maisons du Monde | No | Programa exclusivo en Effinity/Effiliation para Francia desde feb. 2013 — [Affilitizer](https://www.affilitizer.com/programs/maisonsdumonde.com); programa España no confirmado | Desconocido | No encontrado | Folleto "Colección Outdoor 2026" solo en Tiendeo — [Tiendeo](https://www.tiendeo.com/rena/maisons-du-monde) | Condiciones no localizadas |
| Conforama ES | No | Sí, Awin (ID 11125), "Opened" según directorio; hasta 6 %, cookie 30 días (fragmento de búsqueda, no verificado) — [affi.io](https://affi.io/m/conforama) | Desconocido | No encontrado | Folleto "Otoño Trend 2026" en Tiendeo — [Tiendeo](https://www.tiendeo.com/mora/conforama) | Condiciones no localizadas |
| Kave Home | No | Programa propio en Post Affiliate Pro: hasta 30 % (otro listado dice 10 %), cookie 60 días, solo enlaces/banners; sin mención de feed — [PostAffiliatePro](https://www.postaffiliatepro.com/affiliate-program-directory/kave-home-affiliate-program) | No consta | No encontrado | No encontrado PDF oficial | Centro de ayuda: imágenes reutilizables citando "Kave Home" — [help.kavehome.com](https://help.kavehome.com/hc/en-gb/articles/10493126185501-Can-I-use-images-from-the-web-that-are-not-on-the-platform); condiciones generales no leídas |
| Westwing ES | No | Sí, Daisycon "Westwing (ES)" abierto, 4,9 %, cookie 30 días — [affi.io](https://affi.io/m/westwing); Daisycon entrega feeds CSV/JSON/XML a publishers aprobados — [FAQ Daisycon](https://faq-publisher.daisycon.com/hc/en-us/articles/204990251) | Solo si el anunciante lo incluye (campos no estándar vía XML) — [FAQ Daisycon](https://faq-publisher.daisycon.com/hc/en-us/articles/204990231) | No encontrado | No encontrado | Condiciones no localizadas |
| El Corte Inglés | No | Sí, Awin (ID 13075): solo ventas en España, validación a 60 días, >400.000 productos — [Awin](https://ui.awin.com/merchant-profile/13075) | Desconocido | No | Sí, "catálogos digitales" en la web — [ECI](https://www.elcorteingles.es/catalogos-digitales/electronica/) | Aviso legal no accesible (403) |
| Amazon | PA-API 5.0 **deprecada**; sustituida por "Creators API" — [Amazon](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation) | Amazon Afiliados (otro investigador) | (otro investigador) | — | — | — |
| Sklum | No | TradeTracker ES cerrado; entrada en Impact.com "Opened" sin detalles — [affi.io](https://affi.io/m/sklum) | Desconocido | No | No | No localizadas |
| Muebles Boom | No | Ninguno encontrado | — | No | Sin catálogo PDF en la web — [mueblesboom.com](https://www.mueblesboom.com/) | Aviso legal en /boom/2-aviso-legal (no leído) |
| La Redoute ES | No | Affilae (acuerdo desde sept. 2023, perímetro FR) — [Kolsquare](https://www.kolsquare.com/es/customer-stories/como-la-redoute-combina-el-marketing-de-influencers-y-el-afiliacion-para-convertir-la-atencion-en-ventas); ES: Adstrategy CPA abierto, 28 días — [affi.io](https://affi.io/m/la-redoute) | Desconocido | No | No | No localizadas |
| Zara Home | No | Sin programa de afiliación encontrado; Zara usa programa de embajadores (Captiv8/LTK), no verificado — [Uppromote](https://uppromote.com/affiliate-directory/zara/) | — | No | No | No localizadas |
| H&M Home | No | Sin página oficial; directorios citan Awin/CJ/Rakuten según mercado — [Affilitizer](https://www.affilitizer.com/programs/hm.com) | Desconocido | No | No | No localizadas |
| Habitat | No | Ninguno encontrado | — | No | No | — (vuelve a España solo online desde nov. 2025 — [Vente-unique, 20 nov 2025](https://markets.financialcontent.com/minyanville/article/actus-2025-11-20-vente-uniquecom-after-belgium-and-switzerland-habitat-is-back-in-spain-the-iconic-design-continues-its-expansion-across-europe)) |
| Made.com | — | — | — | — | — | No hay evidencia de venta en España tras la compra por Next (nov. 2022) — [Modaes](https://www.modaes.com/empresas/next-prueba-suerte-en-el-hogar-y-rescata-a-made-del-concurso-por-34-millones-de-libras) |
| Dunelm | — | — | — | — | — | Sin fuente oficial de envío a España; solo reenviadores — [forward2me](https://www.forward2me.com/retailers/dunelm) |
| Wayfair | — | — | — | — | — | No opera en España; salió de Alemania/Austria el 10 ene 2025, queda EE. UU., Canadá, Reino Unido e Irlanda — [Retail Dive](https://www.retaildive.com/news/wayfair-exit-germany-layoff-730-jobs/737025); [Eurofound](https://apps.eurofound.europa.eu/restructuring-events/detail/202245) |

### Inferences
- Para Decorazon, el único camino que combina legalidad, datos estructurados y coste cero es darse de alta como publisher en Awin (Leroy Merlin, Conforama, El Corte Inglés) y Daisycon (Westwing) y consumir sus feeds. Requiere aprobación por anunciante y los datos de dimensiones no están garantizados.
- IKEA, que es la tienda más relevante para un planificador de habitaciones, es la que menos vías ofrece: sin API, sin afiliación, con condiciones que prohíben reproducir contenidos sin permiso escrito. Cualquier integración "oficial" pasaría por un acuerdo directo con IKEA Ibérica o Inter IKEA Systems, para el que no existe página pública de solicitud.

### Gaps
- No se ha podido confirmar ningún programa de afiliación de IKEA en España; la ausencia en directorios no demuestra que no exista uno privado.
- No se ha podido leer el contenido completo de ningún perfil de Awin (requieren sesión).

## ¿Qué tiendas ofrecen una vía oficial y documentada para que terceros obtengan datos de producto con dimensiones?

### Takeaway
Ninguna. No hay API pública de catálogo en ninguna de las tiendas; lo más cercano son (1) las APIs de marketplace de Leroy Merlin y Maisons du Monde (Mirakl), que solo sirven para que un vendedor gestione sus propias ofertas, y (2) los feeds de afiliación, cuyo esquema admite dimensiones (`product_length/width/height`) pero no obliga al anunciante a rellenarlas.

### Cited Findings
- IKEA: "IKEA does not publish an official public developer API or developer portal; the surfaces profiled here are community reverse-engineered specs of the IKEA storefront" — [API Evangelist](https://providers.apievangelist.com/providers/ikea/)
- IKEA: existe un "Knowledge Hub" con servicios API del equipo Knowledge Graph, pero las URL apuntan a un dominio interno (inter.ikea.net), no accesible desde fuera — [IKEA Knowledge Hub](https://ingress.prod.knowledge.ikea.net/services)
- IKEA: una oferta de empleo describe una "Inter IKEA wide API developer platform" con la que interactuarían partners y franquiciados; es una vacante, no un lanzamiento público — [vakanser.se](https://vakanser.se/jobb/product+owner+api+management+-+shared+software+development+2/)
- IKEA Business Network en España: afiliación gratuita, ofertas mensuales, tarifas de entrega reducidas y asesoramiento; no hay mención de API ni integración técnica — [IKEA Business ES](https://www.ikea.com/es/en/ikea-business); sus condiciones están en [Términos Red IKEA para Empresas](https://www.ikea.com/es/es/customer-service/terms-conditions/terminos_condiciones_ikea_para_empresas-pubc791f830/)
- IKEA, especificaciones no oficiales: el repositorio `idelsink/ikea-openapi` documenta cuatro APIs (Product Catalog, Search, Sales Item con disponibilidad y empaquetado, After Purchase Ordering), licencia MIT, "not affiliated with, endorsed by, or supported by IKEA", con aviso de que endpoints y esquemas "may change at any time" — [GitHub idelsink/ikea-openapi](https://github.com/idelsink/ikea-openapi)
- IKEA, librería no oficial `ikea_api` (Python): cubre búsqueda, ficha de artículo, stock, carrito y modelos 3D; versión 2.4.0 del 3 oct 2024; proyecto archivado el 2 feb 2025; el autor indica que el login de usuario dejó de funcionar por la telemetría de IKEA y que los tokens de invitado caducan a los 30 días — [PyPI ikea_api](https://pypi.org/project/ikea_api/)
- IKEA, scrapers comerciales de pago (no oficiales): actor de Apify a 22,99 $/mes + uso que afirma devolver dimensiones y medidas — [Apify ikea-product-scraper](https://apify.com/e-commerce/ikea-product-scraper/api); [Apify scrapesage/ikea-scraper](https://apify.com/scrapesage/ikea-scraper); dataset de Zyla Labs — [Zyla](https://www.zylalabs.com/datasets/308/Ikea+Product+Data)
- Leroy Merlin ES, marketplace: funciona sobre Mirakl; el vendedor obtiene una API key y un Store ID en el back office tras la aprobación documental — [ChannelEngine](https://support.channelengine.com/hc/en-us/articles/4700020245789-Leroy-Merlin-marketplace-guide); [Channable](https://helpcenter.channable.com/hc/en-us/articles/8505198082578-How-to-set-up-a-Leroy-Merlin-or-Bricoman-channel); alta de vendedores en [leroymerlin.es/convertirse-en-vendedor](https://www.leroymerlin.es/convertirse-en-vendedor.html) y reglas en [regulaciones-marketplace](https://www.leroymerlin.es/regulaciones-marketplace.html)
- Leroy Merlin ES, marketplace: lanzado con ~150 vendedores y >150.000 productos (noticia de 2017, cifras desfasadas) — [Forbes España](https://forbes.es/ultima-hora/201701/leroy-merlin-lanza-su-marketplace-en-espana-que-contara-con-150-vendedores-y-mas-de-150-000-productos/)
- Maisons du Monde: marketplace en España sobre Mirakl (2022), abierto a >150 marcas; API solo para vendedores — [Mirakl](https://www.mirakl.com/news/maisons-du-monde-rolls-out-its-marketplace-in-Spain)
- Conforama: marketplace con >43.000 referencias (noticia sin fecha visible) — [Just Retail](https://www.justretail.news/noticias-temas/conforama/)
- Amazon: la documentación de PA-API 5.0 redirige a una página que la declara deprecada ("no longer the recommended way to access Amazon's product catalog"); el sucesor es la Creators API (REST) y las llamadas a PA-API 5 ya reciben HTTP 403 `AccessDeniedException`; no se publican fechas de apagado — [Amazon Creators API docs](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation) (comprobado 3 nov 2026)
- Awin, feed estándar: campos obligatorios ID, nombre, precio, URL de imagen, URL de producto, categoría del comercio y descripción — [Awin Product feed FAQs](https://help.awin.com/docs/product-feed-faqs)
- Awin, "Enhanced Feeds" (formato Google): obligatorios `id`, `title`, `description`, `link`, `image_link`, `price`, `availability`; `additional_image_link` hasta 10 imágenes; el JSON de ejemplo incluye `color`, `material`, `item_group_id`, `product_length`, `product_width`, `product_height`, `product_weight`, pero la página no define si son obligatorios; formato JSON de una línea por producto — [Awin Enhanced Feeds spec](https://help.awin.com/developers/docs/enhanced-feeds-prod-spec)
- Daisycon, campos obligatorios para el anunciante: título, descripción, SKU, precio, deeplink e imagen — [FAQ anunciante Daisycon](https://faq-advertiser.daisycon.com/hc/en-us/articles/115000721785--As-an-advertiser-how-do-I-submit-a-product-feed-); los publishers pueden pedir datos no estandarizados del anunciante activando la exportación XML — [FAQ publisher Daisycon](https://faq-publisher.daisycon.com/hc/en-us/articles/204990231)

### Inferences
- Que el esquema de Awin/Daisycon admita dimensiones no significa que Leroy Merlin, Conforama o ECI las rellenen; habrá que darse de alta, descargar el feed y comprobarlo. Es probable que para muebles grandes el campo venga vacío y la dimensión haya que extraerla de la descripción.
- La API de Mirakl es irrelevante para Decorazon salvo que Decorazon vendiera en esos marketplaces.
- Las especificaciones reverse-engineered de IKEA demuestran que técnicamente los endpoints devuelven datos ricos, pero su uso no está autorizado por IKEA y el mantenimiento recae en el integrador (la librería más usada ya está archivada).

### Gaps
- No pude verificar qué campos contiene de verdad el feed de Leroy Merlin, Conforama o ECI en Awin (requiere cuenta de publisher aprobada).
- No se ha encontrado ningún programa formal de partners/API de IKEA para terceros; el "developer platform" solo aparece en una oferta de empleo.

## Donde no hay API: ¿qué programas de afiliación exponen un feed de producto y a través de qué red?

### Takeaway
Leroy Merlin, Conforama y El Corte Inglés están en Awin (España); Westwing en Daisycon (España); Kave Home tiene programa propio en Post Affiliate Pro sin feed documentado; Maisons du Monde y La Redoute se gestionan desde Francia (Effiliation y Affilae) sin programa español confirmado; Sklum, Muebles Boom, Zara Home, H&M Home, Habitat e IKEA no tienen programa de afiliación con feed verificable en España.

### Cited Findings
**Leroy Merlin ES (Awin, ID 20598)**
- Comisión 6 % CPA para productos de marca Leroy Merlin y 3 % CPA para marketplace; atribución post-clic 30 días; "catálogo de productos actualizado para uso de afiliados" con ~180.000 referencias online; se aceptan todo tipo de partnerships salvo PPC; prohibidos cupones, cashback, fidelización, subredes y puja por marca; emailing requiere aprobación previa; de julio de 2025 a fin de año los productos de marketplace tienen tope presupuestario — [Awin merchant profile 20598](https://ui.awin.com/merchant-profile/20598) (fragmento devuelto por buscador; página no accesible sin sesión)
- Influencers: 6 % por venta, enlaces y banners desde las herramientas de Awin — [Leroy Merlin afiliación influencers](https://www.leroymerlin.es/afiliacion/influencers/)
- Lanzamiento del programa en Awin (nota de prensa, 2021 aprox.) — [Alimarket](https://www.alimarket.es/construccion/noticia/327301/leroy-merlin-lanza-su-programa-de-afiliacion-awin--un-nuevo-recurso-para-impulsar-ventas-online); [Marketing4ecommerce](https://marketing4ecommerce.net/leroy-merlin-lanza-su-propio-programa-de-afiliados-para-potenciar-sus-ventas-online/)

**Conforama ES (Awin, ID 11125)**
- Directorio: "Conforama ES on Awin — Opened"; también abierto en Sale Gains (30 días) y Adstrategy CPA (28 días); Admitad ES cerrado (grupos de comisión históricos: muebles/decoración 4,62 %, electro 3,08 %) — [affi.io/m/conforama](https://affi.io/m/conforama)
- Fragmento del perfil de Awin: hasta 6 % y cookie de 30 días — [Awin merchant 11125](https://ui.awin.com/merchant-profile/11125) (no accesible sin sesión); FlexOffers presenta el programa como España y Portugal — [FlexOffers](https://www.flexoffers.com/affiliate-programs/conforama-es-affiliate-program/); Cuelinks lo da como pausado (fuente poco fiable) — [Cuelinks](https://www.cuelinks.com/campaigns/conforma-affiliate-program)

**El Corte Inglés (Awin, ID 13075)**
- Cupones permitidos, cashback no; categorías viajes, supermercado y reacondicionados no comisionan; validación a 60 días; solo ventas en territorio español; anuncio con >400.000 productos — [Awin merchant 13075](https://ui.awin.com/merchant-profile/13075) (fragmento de búsqueda); [Affilitizer](https://www.affilitizer.com/programs/elcorteingles.es)
- Comisión 0,5–2 % según agregador (no verificado) — [Shopper.com](https://shopper.com/partnerships/elcorteingles-es-affiliate-program)
- La única página oficial de afiliados de ECI que encontré es la de Entradas (ticketing), que exige ser titular del sitio web y se reserva aceptar o no — [ECI Entradas afiliados](https://www.elcorteingles.es/entradas/afiliados/); Viajes ECI va aparte en Tradedoubler — [Tradedoubler 260156](https://directory.tradedoubler.com/de/programs/260156-VECI-ES-AFF-Viajes-el-corte-ingles)

**Westwing ES (Daisycon)**
- "Westwing (ES) on Daisycon — Opened, 4,9 %, cookie 30 días"; "Westwing ES on Awin — Closed"; también Sale Gains ES abierto y Rakuten Advertising "Westwing EU" (DE) — [affi.io/m/westwing](https://affi.io/m/westwing)
- La campaña Daisycon de Alemania anuncia "14k+ products" y comisión máxima 6 EUR (sin aclarar si es porcentaje) — [Daisycon Westwing DE](https://daisycon.com/campaigns/20705-westwing-de)
- Daisycon: los publishers descargan el feed en CSV, JSON o XML desde Material > Product feeds, una vez el medio está suscrito y aprobado en la campaña — [FAQ Daisycon 204990251](https://faq-publisher.daisycon.com/hc/en-us/articles/204990251); descripción general — [Daisycon developers](https://daisycon.com/en/developers/productfeeds/)

**Kave Home (programa propio, Post Affiliate Pro; también aparece un ID de Awin)**
- Programa gestionado por Kave Home sobre Post Affiliate Pro: hasta 30 % (otro listado del mismo directorio dice hasta 10 %), CPS un nivel, cookie 60 días, países: todo el mundo, materiales: enlaces de texto y banners, pago mensual por PayPal con mínimo 100 $, contacto info@kavehome.gr; no se mencionan feed, imágenes ni API — [PostAffiliatePro directory](https://www.postaffiliatepro.com/affiliate-program-directory/kave-home-affiliate-program)
- Páginas oficiales localizadas pero no legibles (403/429 al abrir): [help.kavehome.com — programa de afiliados](https://help.kavehome.com/hc/en-gb/articles/36683079334557-What-is-the-affiliate-program-and-how-does-it-work); [kavehome.com/be/en/affiliates](https://kavehome.com/be/en/affiliates/where-do-i-begin-getting-started-kave-home-affiliate/); perfil Awin [125154](https://ui.awin.com/merchant-profile/125154) (existe según buscador; contenido no verificado)

**Maisons du Monde**
- Único programa listado: "Maisonsdumonde.com Affiliate Program", Francia, red Effinity (Effiliation) en exclusiva, activo desde feb. 2013 — [Affilitizer](https://www.affilitizer.com/programs/maisonsdumonde.com)
- Alemania en Effinity (cookie 30 días); programa DE/IT/UK en CJ cerrado — [affi.io/m/maisons-du-monde-de](https://affi.io/m/maisons-du-monde-de); formulario CJ y 4–8 % por venta según Lasso (puede estar desfasado) — [Lasso](https://getlasso.co/affiliate/maisons-du-monde/)
- El anuncio de lanzamiento en el hub de Awin ya no existe: la URL redirige a una página de desactivación — [hub.awin.com (redirigido)](https://www.awin.com/docs.awin.com/hub-deactivation/index.html?p=1701238)

**La Redoute**
- Afiliación e influencers gestionadas con Affilae desde septiembre de 2023, >200 afiliados activos en rebajas (caso de estudio general, no específico de España) — [Kolsquare](https://www.kolsquare.com/es/customer-stories/como-la-redoute-combina-el-marketing-de-influencers-y-el-afiliacion-para-convertir-la-atencion-en-ventas)
- España: "LaRedoute [CPA] on Adstrategy" abierto, 28 días; FlexOffers ES cerrado; en Affilae solo figura Suiza — [affi.io/m/la-redoute](https://affi.io/m/la-redoute); 5–10 % según agregador (no verificado) — [Shopper.com](https://shopper.com/partnerships/laredoute-es-affiliate-program)

**Sklum**
- TradeTracker ES cerrado (lanzado hace 8 años; exigía mostrar el código de descuento de marca para validar ventas); PT 7 % cerrado; "Sklum on Impact.com — Opened" sin comisión ni cookie publicadas; BlueAff DE abierto — [affi.io/m/sklum](https://affi.io/m/sklum)
- "Sklum Friends" es un programa de referidos para clientes (vales), no de afiliación — [Sklum Friends T&C](https://www.sklum.com/pt/content/3734-friends-terms-conditions); [Buyapowa, 2022](https://www.buyapowa.com/blog/sklum-the-designer-furniture-store-launches-its-referral-program.md)

**Muebles Boom**
- Sin programa de afiliados en el pie de la web; enlaces legales: "Aviso legal" (/boom/2-aviso-legal) y "Condiciones generales" (/boom/3-condiciones-generales-online) — [mueblesboom.com](https://www.mueblesboom.com/); cadena con 35 tiendas según agregador — [Tiendeo](https://www.tiendeo.com/rios/muebles-boom)

**Zara Home / H&M Home**
- Zara: programa de embajadores vía Captiv8 y LTK, cookie 24 h, sin códigos de terceros (directorio no oficial) — [Uppromote](https://uppromote.com/affiliate-directory/zara/); 8 % y sobre todo EE. UU. según otro blog — [Creator Hero](https://www.creator-hero.com/es/blog/zara-affiliate-program-in-depth-review-pros-and-cons); Zara Home se integró en la web de Zara desde 2018–2019 — [Modaes](https://www.modaes.com/empresas/inditex-fusiona-zara-y-zara-home)
- H&M: sin programa global único; redes distintas por mercado (Awin, CJ, Rakuten, Partnerize según listados) — [Affilitizer hm.com](https://www.affilitizer.com/programs/hm.com); [Unanswered.io](https://unanswered.io/guide/h-m-affiliate-program); Rakuten Advertising reivindica un programa H&M en 40 mercados — [Hello Partner](https://hellopartner.com/2023/11/06/best-partnership)

**Habitat, Made.com, Dunelm, Wayfair**
- Habitat: cierre y liquidación en enero de 2024, incluidas franquicias de España — [Time Out Barcelona](https://www.timeout.es/barcelona/es/noticias/habitat-en-liquidacion-la-marca-de-muebles-cierra-todas-sus-tiendas-incluida-la-de-barcelona-011524); relanzada por Vente-unique.com (web en Francia junio 2024) y vuelta a España 100 % online anunciada el 20 nov 2025 — [Vente-unique, 20 nov 2025](https://markets.financialcontent.com/minyanville/article/actus-2025-11-20-vente-uniquecom-after-belgium-and-switzerland-habitat-is-back-in-spain-the-iconic-design-continues-its-expansion-across-europe); >1.100 productos y recogida en tienda — [Interior Daily](https://www.interiordaily.com/article/9786909/habitat-expands-european-presence-with-new-e-commerce-launch-in-spain/). Sin programa de afiliación ni API encontrados.
- Made.com: quebró en nov. 2022; Next compró marca, web y PI por 3,4 M£ y relanzó la web a mediados de 2023 — [Modaes](https://www.modaes.com/empresas/next-prueba-suerte-en-el-hogar-y-rescata-a-made-del-concurso-por-34-millones-de-libras); [Insight DIY](https://www.insightdiy.co.uk/news/next-to-open-madecom-concession/12929.htm). La entrada en España es de 2018 (etapa anterior) — [Retail Gazette, 2018](https://www.retailgazette.co.uk/blog/2018/10/made-com-posts-40-revenue-rise-launches-spain/). No hay evidencia de venta en España hoy; la página de envíos de made.com devuelve 404.
- Dunelm: ninguna fuente oficial de envío a España; solo servicios de reenvío — [forward2me](https://www.forward2me.com/retailers/dunelm)
- Wayfair: anunció el 10 ene 2025 el cierre de Alemania (730 despidos) y, según Eurofound, dejó de aceptar pedidos también desde Austria; quedan EE. UU., Canadá, Reino Unido e Irlanda — [Retail Dive](https://www.retaildive.com/news/wayfair-exit-germany-layoff-730-jobs/737025); [Eurofound](https://apps.eurofound.europa.eu/restructuring-events/detail/202245); [Briefing.com](https://briefing.com/story-stocks/archive/2025/1/10/wayfair-exits-germany-as-it-shifts-attention-to-its-remaining-three-international-markets-(w))

**Mecánica de acceso al feed (Awin)**
- El feed solo aparece para anunciantes a los que el publisher está unido (aprobado); el registro en Create-a-Feed puede tardar hasta 1 hora; el anunciante puede no haber activado feed — [Awin: How can I access a Product Feed](https://success.awin.com/articles/en_US/Knowledge/How-can-I-access-a-Product-Feed); [Awin Product Data Feed FAQ](https://success.awin.com/articles/en_US/Knowledge/Product-Data-Feed-FAQ)
- Descarga de la lista de feeds mediante URL con la "data feed API key" (distinta de la Publisher API key), desde Toolbox > Create-a-Feed — [Awin Product Feed List Download](https://help.awin.com/docs/product-feed-list-download)
- Listado histórico de columnas del feed (PDF 2017) — [Awin FeedColumnDescriptions](https://cdn.document360.io/ec9ead62-8ecc-46ef-aac7-9b0a9081b40b/Images/Documentation/PM-FeedColumnDescriptions(1).pdf)

### Inferences
- Coste: alta gratuita en Awin/Daisycon; el "pago" es que la app debe generar ventas atribuibles o el anunciante puede expulsar al publisher. Leroy Merlin acepta "todo tipo de partnerships" salvo PPC, lo que encaja con una app de planificación.
- Mantenimiento: los feeds se regeneran por el anunciante; el integrador debe reprocesarlos periódicamente (Awin elimina feeds no actualizados en 2 años). Los IDs de producto y las URL de imagen pueden cambiar sin aviso.
- El programa de Kave Home, al ser de enlaces y banners sobre Post Affiliate Pro, probablemente no sirve para poblar un catálogo; habría que pedirles un feed directamente.

### Gaps
- No he podido confirmar si Maisons du Monde tiene campaña para España dentro de Effiliation (el directorio solo muestra Francia).
- No he encontrado la condición de "uso del feed en aplicaciones" en los T&C de Leroy Merlin/ECI/Conforama (el documento de T&C está dentro del perfil de Awin, inaccesible sin sesión).
- No se ha verificado si Sklum sigue activo en Impact.com ni sus condiciones.

## ¿Qué dicen exactamente las condiciones de uso sobre scraping, robots.txt y reutilización de imágenes y datos?

### Takeaway
Solo IKEA tiene condiciones legibles: en España prohíben reproducir, distribuir, comunicar públicamente o transformar contenidos sin consentimiento escrito y prohíben "frames", sin nombrar robots; en EE. UU. (versión de 2 sep 2026) prohíben expresamente robots/scraping y el deep-linking/embedding. Los robots.txt de IKEA y Leroy Merlin no bloquean las fichas de producto pero sí buscadores internos, endpoints internos y (IKEA) a los bots de Amazon; Leroy Merlin bloquea por nombre a herramientas de descarga masiva. El resto de avisos legales no se pudieron leer (403/429 o no localizados).

### Cited Findings
**IKEA**
- Índice legal de IKEA Ibérica S.A.: el uso de la web "está sujeto a la Política de Privacidad, a la Política de Cookies y al Aviso Legal"; enlaza a condiciones de uso de la web, de la app, de venta a distancia, de IKEA Family y de la Red IKEA para Empresas — [IKEA Ibérica T&C](https://www.ikea.com/es/es/customer-service/terms-conditions/)
- Condiciones de uso de la web IKEA.es (titular IKEA IBÉRICA S.A.; marca de INTER IKEA SYSTEMS B.V.; sin fecha de versión): "Todos los derechos de propiedad intelectual e industrial sobre el contenido del Portal" [son del titular]; "El acceso o la utilización del Portal por tu parte no puede considerarse en modo alguno como otorgamiento de derechos"; "Queda prohibida la reproducción, distribución, comunicación pública y transformación, en cualquier modalidad, [...] salvo que se cuente con el previo y expreso consentimiento por escrito de su titular"; sobre la marca: "Se prohíbe expresamente su utilización para fines comerciales ni para ningún otro fin"; política de enlaces: "no podrás dar a entender que IKEA ha autorizado el hiperenlace" y "Tampoco podrás crear macros ('frames') con las páginas web ni sobre las páginas web de IKEA"; se reservan acciones judiciales. No contiene ninguna cláusula sobre robots, spiders, scraping o minería de datos — [Condiciones web IKEA.es](https://www.ikea.com/es/es/customer-service/terms-conditions/terminos-condiciones-web-pub417ec831/)
- Condiciones de IKEA EE. UU. (fecha de efecto 2 sep 2026), sección 3: prohibido "use any robot, spider, other automatic device, or manual process to monitor, copy or scrape any of our web pages" sin "prior express written consent from an authorized executive of IKEA"; "'Deep-linking,' 'embedding' or using analogous technology is strictly prohibited"; sección 2: "The use of these images by you [...] is prohibited unless specifically permitted"; "A single copy of the Materials may be downloaded [...] for non-commercial personal use only" — [IKEA US Terms](https://www.ikea.com/us/en/customer-service/terms-conditions/) (no es la versión española; se cita como referencia de la postura del grupo)
- Condiciones de islas.ikea.es (Sarton Canarias S.A., franquiciado de Canarias y Baleares): el usuario solo está autorizado a visualizar y conservar una copia temporal privada; prohíben hiperenlaces comerciales desde terceros sin consentimiento escrito; no mencionan scraping — [Condiciones Sarton (Ibiza)](https://www.islas.ikea.es/ibiza/es/legal/condiciones-generales)
- robots.txt de ikea.com (global, aplica a /es/es/): bloqueo total a `AmazonProductDiscoverybot` y `Amazonbot`; para el resto, Disallow en búsquedas (`*/search/?q=*`, etc.), filtros y ordenación, `/compare*`, carrito/pedidos/perfil, fragmentos, y rutas internas `/iows/`, `/m3/*`, `/global/api/episod/collect`, `/cdn-cgi/`; no hay regla sobre `/p/` (fichas de producto); sitemap en `https://www.ikea.com/sitemaps/sitemap.xml` — [ikea.com/robots.txt](https://www.ikea.com/robots.txt)
- Descargador 3D no oficial: "It is not endorsed by IKEA"; el repositorio "no concede ninguna licencia adicional sobre los activos, y los términos de uso de IKEA siguen vigentes"; el autor asume que no deben usarse en VFX comercial, publicidad ni visualización de producto — [Digital Production, 9 feb 2026](https://digitalproduction.com/2026/02/09/download-ikea-furniture-as-3d-models-minus-the-trolley/)

**Leroy Merlin ES**
- robots.txt: bloquea por completo a una larga lista de scrapers y herramientas de descarga (wget, HTTrack, Xenu, WebZIP...) además de Yandex, Yahoo! Slurp China y Nutch; Disallow en buscador interno (`/buscador`, `/search?q=`), parámetros de filtro/orden, endpoints (autocomplete, `getReviews.do`, servicios de carrito), login/checkout/listas; no bloquea `/productos/` en general; 11 sitemaps incluidos cuatro de productos — [leroymerlin.es/robots.txt](https://www.leroymerlin.es/robots.txt)
- Aviso legal (`/aviso-legal.html`): HTTP 403 al intentar leerlo; búsqueda sin resultados de la página oficial. Lo único localizado es el documento portugués de leroymerlin.pt (otro país) — [Leroy Merlin PT termos](https://www.leroymerlin.pt/politicas-e-condicoes/termos-e-condicoes-gerais/)

**El Corte Inglés**
- `/aviso-legal/`: HTTP 403 al intentar leerlo. Existen condiciones de uso del área de empresas — [ECI empresas condiciones de uso](https://www.elcorteingles.es/empresas/condiciones-de-uso/) (no leído)

**Kave Home**
- Centro de ayuda: "You can use images from our KaveHome.com website as long as you specify that they belong to Kave Home. Simply add a caption mentioning Kave Home." (artículo del centro de ayuda; contexto aparente de su plataforma para profesionales; no son las condiciones generales) — [help.kavehome.com](https://help.kavehome.com/hc/en-gb/articles/10493126185501-Can-I-use-images-from-the-web-that-are-not-on-the-platform)

**Marco legal español (contexto, fuente secundaria)**
- El RDL 24/2021 introdujo el límite de minería de textos y datos, que decae si el titular reservó expresamente el uso automatizado; la reserva puede expresarse en robots.txt y en las condiciones de uso — [Tesify, 2026](https://tesify.es/puedo-extraer-datos-de-una-web-para-mi-tfg-mineria-textos-datos-2026)

### Inferences
- En IKEA España la prohibición de "reproducción, distribución, comunicación pública y transformación" sin permiso escrito cubre de facto mostrar sus imágenes y fichas dentro de Decorazon, aunque no mencione robots. La versión estadounidense de 2026 muestra hacia dónde va el grupo: prohibición explícita de scraping y embedding.
- El bloqueo de Amazonbot en robots.txt indica que IKEA vigila activamente la extracción de su catálogo por terceros.
- Que los robots.txt no bloqueen las fichas de producto solo significa que los buscadores pueden indexarlas; no autoriza la reutilización del contenido (eso lo rigen las condiciones de uso y la propiedad intelectual).

### Gaps
- No he podido leer los avisos legales de Leroy Merlin ES, El Corte Inglés, Maisons du Monde ES, Conforama, Kave Home, Westwing, Sklum, Zara Home ni H&M Home; por tanto no puedo afirmar qué dicen sobre scraping. Sería necesario abrirlos en un navegador.
- No he comprobado los robots.txt de esos dominios (solo IKEA y Leroy Merlin).
- No existe fecha de versión en las condiciones de IKEA.es; no sé cuándo se actualizaron por última vez.

## ¿Alguna tienda ofrece modelos 3D o activos AR de producto a terceros?

### Takeaway
No, ninguna de forma oficial. IKEA sirve modelos GLB en sus fichas web para la vista 3D/AR y tiene IKEA Kreativ (escáner de habitación con IA dentro de la app, disponible en España), pero no hay SDK, API ni licencia para terceros; los scripts que descargan esos GLB son no oficiales y los autores advierten de que los activos siguen bajo las condiciones de IKEA. No he encontrado activos 3D para terceros en ninguna otra tienda.

### Cited Findings
- IKEA Kreativ: lanzado por Ingka en junio de 2022; "Scene Scanner" integrado en la app IKEA para crear réplicas 3D editables de la propia habitación — [IKEA US Newsroom](https://ikea.com/us/en/newsroom/corporate-news/ikea-launches-new-ai-powered-digital-experience-empowering-customers-to-create-lifelike-room-designs-pub58c94890); [TechCrunch, 2022](https://techcrunch.com/?p=2340297)
- IKEA Kreativ en España: función dentro de la app oficial de IKEA en Android e iOS (perfil > "IKEA Kreativ"), con 50 estancias predeterminadas si no se escanea — [Genbeta](https://www.genbeta.com/a-fondo/he-probado-ikea-kreativ-me-ha-alucinado-facil-que-digitalizar-tu-cuarto-ia-decorarlo-a-tu-antojo-asi-funciona); [Xataka Home](https://www.xatakahome.com/diseno-y-arquitectura/ikea-anade-funcion-su-app-para-escanear-nuestro-cuarto-ia-ver-que-tal-quedan-muebles-puedes-probarla); página de la app — [IKEA app ES](https://www.ikea.com/es/en/ikea-app/)
- IKEA Place: app AR de 2017 sobre ARKit; en 2022 TechCrunch indicó que seguiría disponible junto a la app IKEA actualizada; no he encontrado anuncio de retirada ni confirmación de su estado actual — [TechCrunch](https://techcrunch.com/?p=2340297); [TechRadar](https://www.techradar.com/news/ikeas-new-iphone-app-can-delete-and-replace-your-old-furniture)
- Modelos 3D en la web de IKEA: userscript "IKEA 3D Model Download Button" (Tampermonkey) que añade un botón "Download 3D" en las fichas y guarda `[Producto] - [Color].glb`, funciona en todos los sitios de idioma de IKEA — [GitHub apinanaivot/IKEA-3D-Model-Download-Button (README)](https://raw.githubusercontent.com/apinanaivot/IKEA-3D-Model-Download-Button/main/README.md); descargador por lotes en Python probado solo en la web finlandesa — [GitHub apinanaivot/IKEA-3d-model-batch-downloader](https://github.com/apinanaivot/IKEA-3d-model-batch-downloader); otro proyecto similar — [GitHub GazButane/IMD](https://github.com/GazButane/IMD)
- Cobertura del descargador: los scripts "solo exponen archivos ya entregados al navegador"; "not endorsed by IKEA"; escala, orientación y materiales inconsistentes; sin licencia adicional, comprobar las condiciones de IKEA antes de uso comercial — [Digital Production, 9 feb 2026](https://digitalproduction.com/2026/02/09/download-ikea-furniture-as-3d-models-minus-the-trolley/); [80.lv](https://80.lv/articles/download-ikea-furniture-as-3d-models-with-this-script/)
- Antecedente: IKEA exploró un repositorio de modelos 3D para consumidores (2019) — [Fabbaloo, 2019](https://www.fabbaloo.com/blog/2019/3/17/ikeas-consumer-3d-model-repository)
- La librería no oficial `ikea_api` incluía un endpoint de "3D models" — [PyPI ikea_api](https://pypi.org/project/ikea_api/)
- Para Leroy Merlin, Maisons du Monde, Conforama, Kave Home, Westwing, ECI, Sklum, Muebles Boom, La Redoute, Zara Home, H&M Home y Habitat no he encontrado ninguna página oficial que ofrezca modelos 3D/AR a terceros (búsquedas sobre afiliación, API y catálogos sin ningún resultado al respecto).

### Inferences
- Los GLB de IKEA son el único activo 3D de retailer español "al alcance" para un planificador, pero su uso en Decorazon chocaría con las condiciones de IKEA.es (prohibición de reproducción/transformación sin permiso escrito). Técnicamente dependería además de endpoints que IKEA puede cambiar en cualquier momento.
- Un acuerdo directo con IKEA sería la única vía legítima a esos modelos; no existe canal público para solicitarlo.

### Gaps
- No he podido confirmar el formato exacto que sirve IKEA en España ni si hay también USDZ (la cobertura solo menciona GLB).
- Estado actual de la app IKEA Place en las tiendas de apps: no verificado.

## ¿Siguen publicando catálogo en PDF o digital?

### Takeaway
IKEA canceló su catálogo anual (impreso y digital) en diciembre de 2020; hoy en España solo hay guías de compra, revistas y folletos, y la URL de catálogos de ikea.com/es/es devolvió 404 al comprobarla (la sección sí existe en islas.ikea.es, del franquiciado de Canarias/Baleares). El Corte Inglés mantiene "catálogos digitales" en su web. De Leroy Merlin, Conforama, Maisons du Monde y Kave Home solo encontré folletos en agregadores (Tiendeo), no PDFs oficiales; Muebles Boom no ofrece catálogo descargable.

### Cited Findings
- IKEA: Inter IKEA Systems B.V. anunció el 7 dic 2020 (página editada el 29 sep 2021) "the emotional but rational decision to respectfully end the successful career of the IKEA Catalog"; terminan tanto la versión impresa como la digital; se publicó un libro homenaje en otoño de 2021 — [IKEA Newsroom](https://www.ikea.com/us/en/this-is-ikea/newsroom/after-70-successful-years-ikea-is-turning-the-page-on-the-catalog-pubad91dde0); [Reuters, 7 dic 2020](https://www.reuters.com/article/ikea-catalogue-idINL1N2IN0TN); [Wikipedia IKEA Catalogue](https://en.wikipedia.org/wiki/IKEA_Catalogue)
- IKEA: cobertura en España del fin del catálogo (2020) — [Reason Why](https://www.reasonwhy.es/actualidad/ikea-pone-fin-publicacion-catalogo-cambios-comportamiento-clientes-digital); en 2023 "hace tres años que no lo mandan" — [Directo al Paladar](https://www.directoalpaladar.com/decoracion-de-cocinas/echas-catalogo-ikea-normal-hace-tres-anos-que-no-mandan); en 2016 la tirada fue de 200 millones de ejemplares en 32 idiomas — [Wikipedia](https://en.wikipedia.org/wiki/IKEA_Catalogue)
- IKEA España (península): `https://www.ikea.com/es/es/catalogs/` devolvió HTTP 404 el 3 nov 2026; no localicé la URL oficial de la sección de catálogos/guías de compra peninsular. Las fichas de producto ofrecen descargas de planos e instrucciones de montaje, no un catálogo comercial — [ejemplo BESTÅ (islas.ikea.es)](https://www.islas.ikea.es/lagomera/es/pd/besta-estante-con-puerta-blanco-spr-49046817)
- IKEA Canarias/Baleares (Sarton Canarias): sección "Catálogos" con opción de descargar en PDF, más "Guías de compra", "Fika Magazine" y "Revista IKEA Family" — [islas.ikea.es/catalogos](https://www.islas.ikea.es/catalogos); [Fika Magazine](https://www.islas.ikea.es/comerenikea/fika-magazine)
- El Corte Inglés: sección de catálogos digitales por categoría, con ediciones 2026 ("disponible muy pronto" en algunas) — [ECI catálogos digitales](https://www.elcorteingles.es/catalogos-digitales/electronica/)
- Leroy Merlin: solo folletos en Tiendeo (última oferta 27/10/2026); no encontré sección oficial de folletos — [Tiendeo Leroy Merlin](https://www.tiendeo.com/outes/leroy-merlin)
- Conforama: folleto "Otoño Trend 2026" en Tiendeo — [Tiendeo Conforama](https://www.tiendeo.com/mora/conforama)
- Maisons du Monde: "Colección Outdoor 2026" en Tiendeo, sin PDF oficial localizado — [Tiendeo Maisons du Monde](https://www.tiendeo.com/rena/maisons-du-monde)
- Kave Home: solo páginas de Tiendeo; sin catálogo/lookbook PDF oficial localizado — [Tiendeo Kave Home](https://www.tiendeo.com/ames/kave-home)
- Muebles Boom: sin enlace a catálogo/folleto PDF en su web — [mueblesboom.com](https://www.mueblesboom.com/)

### Inferences
- Un catálogo PDF no es una fuente de datos estructurados viable para Decorazon: los que existen son folletos promocionales parciales y con vigencia corta; el único "catálogo completo" es la propia web.

### Gaps
- No he confirmado la URL ni el contenido actual de la sección de catálogos/guías de compra de IKEA España peninsular (ikea.com/es/es).
- No he confirmado si Leroy Merlin, Conforama, Maisons du Monde, Kave Home, Westwing o Sklum ofrecen PDF oficial descargable en sus propias webs.
