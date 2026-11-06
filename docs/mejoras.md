# Mejoras de Decorazon

Lista viva de sugerencias de producto y uso. Nace el 6 de noviembre de 2026, con el rediseño del editor (planes 08 a 11) ya publicado, a partir de la spec (`superpowers/specs/2026-10-24-decorazon-design.md`), las specs posteriores, los pendientes de los planes y el código de `web/src` tal como está ese día.

## Cómo se usa

- Cada sugerencia tiene un **Estado**: `pendiente`, `en curso`, `realizada` o `descartada`.
- Al cambiar un estado se anota en **Notas** la fecha y, si procede, el PR (p. ej. «realizada el 12 nov 2026, PR #45») o el motivo (`descartada`).
- **Valor**: alto / medio / bajo, para quien amuebla una estancia de su casa. **Esfuerzo**: S (horas), M (uno o dos días), L (varios días, o toca la API y el formato del documento).
- **Depende de**: otra sugerencia que conviene hacer antes, o nada.
- Lo marcado «no comprobado» es una suposición sobre el código que hay que confirmar antes de empezar.
- Las sugerencias no se renumeran ni se borran: una idea descartada se queda con su motivo, para no volver a discutirla.
- La deuda técnica menor no va aquí: está en los ficheros de pendientes enlazados al final.

## Las cinco primeras

1. **M-14 Miniaturas por tipo en el catálogo.** Es lo que más se nota al abrir el paso 2: las tarjetas son solo texto y hay más de 50 tipos. La huella 2D que ya dibuja el plano sirve de miniatura sin dibujar iconos a mano.
2. **M-01 Mover lo seleccionado con las flechas.** Lo espera cualquiera que haya usado un editor; cuesta unas horas y arregla la edición fina, que con el ratón o el dedo es la parte más torpe.
3. **M-30 Diseños de ejemplo en el inicio.** El anti-objetivo de la spec es «que haya que leer un manual»: abrir un dormitorio ya amueblado y tocarlo enseña la app mejor que cualquier texto, y da una imagen real para la portada.
4. **M-11 Descargar la imagen 3D y el plano.** La captura 3D ya existe para la vista previa del enlace; falta un botón. Es lo que la gente manda por WhatsApp o guarda en el móvil.
5. **M-26 Avisos y estado de guardado anunciados al lector de pantalla.** Barato, y hoy un lector de pantalla no se entera ni de un conflicto nuevo ni de «Guardado».

## Editor 2D

| Id | Sugerencia | Qué aporta | Mínimo que haría | Valor | Esfuerzo | Depende de | Estado | Notas |
|---|---|---|---|---|---|---|---|---|
| M-01 | Mover lo seleccionado con las flechas del teclado | Ajuste fino sin pelearse con el ratón ni con el imán; también para esquinas y aberturas | En `usarAtajos.ts`, flechas = 1 cm y con Mayúsculas 10 cm, agrupado en el historial para que un Ctrl+Z deshaga el recorrido entero; en el paso 1 mueve esquinas y desplaza puertas y ventanas por su pared | alto | S | — | pendiente | Comprobado: hoy no se atiende ninguna flecha fuera del menú «Más acciones». Pega (6 nov 2026): `moverElemento` siempre imanta (`IMAN_CM` = 15), así que 1 cm junto a una pared se volvería a pegar; hace falta `desplazarElemento` sin imán |
| M-02 | Selección múltiple | Mover o borrar un conjunto (la mesa con sus sillas) de una vez | Mayúsculas+clic para añadir a la selección y arrastre conjunto; sin girar ni duplicar en grupo en la primera versión | medio | L | M-01 | pendiente | `Seleccion` es un solo elemento en el almacén: toca el estado, las capas y el panel |
| M-03 | Superficie y perímetro de la estancia | El dato que todo el mundo quiere al diseñar y al pedir presupuestos (suelo, pintura) | En el panel de Estancia, «Superficie: 12,4 m²» y «Paredes: 14,2 m», y lo mismo en la hoja para imprimir | medio | S | — | pendiente | Comprobado: no hay m² en ninguna pantalla. Con las aberturas se puede dar también la superficie de pared sin huecos |
| M-04 | Plantillas de planta | Hacer una L o un pasillo sin partir paredes y mover esquinas a mano | En «Nueva estancia», además del rectángulo: L (con las dos medidas del entrante) y rectángulo con hueco en una esquina | medio | M | — | pendiente | Hoy se empieza siempre con un rectángulo |
| M-05 | Bloquear un mueble | Que la cama ya colocada no se mueva por un arrastre torpe en el móvil | Un candado en el panel de propiedades; un elemento bloqueado se selecciona pero no se arrastra ni se gira, y el plano lo dibuja con un candado pequeño | medio | M | — | pendiente | Campo nuevo en el documento (`bloqueado?: boolean`), compatible con los diseños guardados |
| M-06 | Cinta métrica | Medir una distancia cualquiera (de la ventana al rincón) sin colocar nada | Herramienta en los controles del plano: dos clics, cota flotante con la distancia, Esc la quita | medio | M | — | pendiente | Las cotas al mover van del mueble a las paredes; no comprobado si también a los muebles vecinos: si no, es la otra mitad de esta mejora |
| M-07 | Nombre propio por mueble | «Armario de Ana» en el plano y en la hoja, en vez de dos «Armario» iguales | Campo de texto opcional en Propiedades; lo usan el plano, la lista de la hoja y la vista compartida | bajo | S | — | pendiente | Los productos de tienda ya enseñan su nombre; los genéricos no tienen |
| M-08 | Voltear | Cambiar de lado un sofá con chaise, un escritorio en L o la bisagra de una puerta con un botón | Un botón «Voltear» que cambia la variante de lado (`chaise`, `ala`, `bisagra`) sin buscarla en el desplegable | bajo | S | — | pendiente | Comprobado: el lado ya es una variante en esos tipos, así que es solo un atajo |

## Vista 3D

| Id | Sugerencia | Qué aporta | Mínimo que haría | Valor | Esfuerzo | Depende de | Estado | Notas |
|---|---|---|---|---|---|---|---|---|
| M-09 | Vista desde dentro (primera persona) | La «sensación de realidad» que pide la spec: ver la habitación como al entrar por la puerta | Botón en la barra de la 3D: cámara a 160 cm junto a la puerta mirando al centro, giro con arrastre, sin andar; volver a la órbita con el mismo botón | alto | M | — | pendiente | Hoy la cámara solo orbita; con la cámara dentro, «Ocultar paredes delante» debe desactivarse |
| M-10 | Mover muebles en 3D | No tener que volver al 2D para un retoque mientras se mira el resultado | Arrastre sobre el plano del suelo con el mismo imán que en 2D; girar sigue en 2D | medio | L | — | pendiente | La spec decidió «mover y girar solo en 2D»; hacerlo bien con la cámara en perspectiva cuesta más de lo que parece |
| M-11 | Descargar la imagen 3D y el plano | Mandar por WhatsApp o guardar en el móvil sin pasar por «Imprimir» | En «Más acciones»: «Descargar imagen» (PNG de la 3D, reutilizando `Captura3D`) y «Descargar plano» (PNG del SVG con las cotas) | medio | S | — | pendiente | Comprobado: `Captura3D` ya hace el PNG para la vista previa del enlace; no hay ninguna descarga |
| M-12 | Materiales con textura | Que la madera, la tela y la cerámica no sean colores planos, para que el 3D «no parezca un juguete» | Textura procedimental o un mapa pequeño por material (veta, trama, baldosa), teñido con el color del usuario | medio | M | — | pendiente | No comprobado cómo se ven hoy los materiales de `materiales3d.ts`; antes de hacerlo, mirar la 3D en un portátil normal y decidir si hace falta |
| M-13 | Luz de la ventana y lámparas encendidas | Más realismo barato: la ventana ilumina de verdad y la lámpara de pie da luz cálida | Una luz direccional por ventana (atenuada) y una luz puntual por lámpara, con tope de luces para no bajar los fps | bajo | M | — | pendiente | Vigilar el rendimiento: la spec exige 60 fps con 40 elementos |

## Catálogo y muebles

| Id | Sugerencia | Qué aporta | Mínimo que haría | Valor | Esfuerzo | Depende de | Estado | Notas |
|---|---|---|---|---|---|---|---|---|
| M-14 | Miniaturas por tipo en el catálogo | Recorrer más de 50 tipos de un vistazo, sin leer | Un SVG pequeño por tarjeta dibujado con la huella 2D del tipo (la misma que pinta `CapaElementos`) con sus medidas por defecto | alto | M | — | pendiente | Anotado como fuera del rediseño en el plan 11; la huella ya existe, así que no hay que dibujar iconos a mano |
| M-15 | Usados hace poco y favoritos | Volver al mueble que se acaba de usar sin buscarlo | Un grupo «Usados hace poco» (últimos 6, en `localStorage`) delante de los demás; favoritos con estrella en la tarjeta | bajo | S | M-14 | pendiente | — |
| M-16 | Tipos que faltan | Cubrir casos habituales que hoy no se pueden modelar | Cuna y litera (habitación infantil), sofá cama, zapatero, perchero y mesa plegable; cada uno con huella, aperturas, 3D y su test de integridad | medio | M | — | pendiente | Lista sacada de comparar los ficheros de `nucleo/catalogo/definiciones` con lo que se amuebla en una casa; no comprobado qué piden los usuarios: cruzar con las sugerencias recibidas |
| M-17 | Mis productos de tienda | Reutilizar un producto tecleado (el PAX con sus medidas y precio) en otro diseño sin volver a escribirlo | Al vincular, guardar el producto en una lista propia (`localStorage` primero; en la cuenta después); «Es de una tienda» ofrece elegirlo | medio | M | — | pendiente | Fase 1 de tiendas hecha; esto es carga manual reutilizable, no un importador |
| M-18 | Cambiar el tipo de estancia sin sorpresas | Probar el mismo plano como despacho y como dormitorio | Ya se puede cambiar el tipo; falta que el catálogo avise de qué grupo cambia y que la hoja lo refleje | bajo | S | — | pendiente | No comprobado qué pasa hoy con los muebles al cambiar de tipo: si todo sigue, basta con probarlo y cerrar esta línea |

## Cuentas y diseños

| Id | Sugerencia | Qué aporta | Mínimo que haría | Valor | Esfuerzo | Depende de | Estado | Notas |
|---|---|---|---|---|---|---|---|---|
| M-19 | Miniatura, búsqueda y orden en Mis diseños | Encontrar un diseño entre 20 sin abrirlos | Miniatura del plano en cada tarjeta (generada al guardar, como la de la vista previa), buscador por nombre y orden por nombre, tipo o fecha | medio | M | — | pendiente | Hoy la lista va solo por fecha y la imagen solo se genera para diseños compartidos (`RefrescoDeVistaPrevia`) |
| M-20 | Exportar e importar un diseño como fichero | Copia de seguridad propia y pasar un diseño entre navegadores sin cuenta | «Descargar diseño» (JSON del documento) en «Más acciones» y «Abrir fichero» en el inicio y en Mis diseños, pasando por `validar` | medio | S | — | pendiente | El documento ya es un JSON versionado con validación; es casi solo la interfaz |
| M-21 | Copia automática antes de sobrescribir | Recuperar un diseño tras un «Sobrescribir con la mía» o un borrado de muebles del que uno se arrepiente al día siguiente | La API guarda la versión anterior al sobrescribir (una sola por diseño) y «Más acciones» ofrece «Recuperar la versión anterior» | medio | L | — | pendiente | Toca API, base de datos y límites de tamaño; no es un historial completo |
| M-22 | Compartir desde el móvil con la hoja nativa | Mandar el enlace por WhatsApp con un toque en vez de copiar y pegar | En `DialogoCompartir`, botón «Enviar» con `navigator.share` cuando exista; si no, el de copiar de siempre | medio | S | — | pendiente | Comprobado: no se usa `navigator.share` en ningún sitio |
| M-23 | Precios y lista de la compra en la vista compartida | Que el carpintero o la pareja vean las referencias y el total anotado, que es a lo que se manda el enlace | La lista de muebles de `VistaCompartida` enseña tienda, referencia, enlace y precio, con el mismo aviso de precios anotados que la hoja | medio | S | — | realizada | Ya existía (6 nov 2026): `VistaCompartida` pinta `TablaDeMuebles` con `enlaces`, que enseña tienda, referencia, precio con fecha, total y aviso; test «muebles de tienda» en `VistaCompartida.test.tsx`. La nota anterior venía de buscar en el fichero equivocado |
| M-24 | Imprimir desde la vista compartida | Quien recibe el enlace se lleva la hoja al taller sin tener cuenta | Botón «Imprimir» en la vista compartida que abra la misma `HojaImpresion` en solo lectura | bajo | S | — | pendiente | Comprobado (6 nov 2026): la vista compartida reutiliza `PlanoDelDiseno`, `PlanoAmpliado` y `TablaDeMuebles`, pero no `HojaImpresion`, que lee el documento del almacén y solo acepta `alCerrar`: hay que pasarle `doc` y `nombre` por props |

## Móvil

| Id | Sugerencia | Qué aporta | Mínimo que haría | Valor | Esfuerzo | Depende de | Estado | Notas |
|---|---|---|---|---|---|---|---|---|
| M-25 | Instalar como app | Que en el móvil quede un icono y abra a pantalla completa | Capturar `beforeinstallprompt` y ofrecer «Instalar Decorazon» en «Más acciones» (Android/Chrome); en iOS, una nota de cómo hacerlo | bajo | S | — | pendiente | La PWA ya existe (`vite-plugin-pwa`); comprobado que no se gestiona el aviso de instalación |
| M-27 | Girar un mueble con dos dedos | Girar sin acertar el círculo pequeño con el dedo | Gesto de rotación con dos dedos sobre el mueble seleccionado, con los mismos saltos de 90° que el círculo | bajo | M | — | pendiente | El pellizco con dos dedos ya hace zoom: hay que distinguir ambos gestos por dónde empiezan |

## Accesibilidad y rendimiento

| Id | Sugerencia | Qué aporta | Mínimo que haría | Valor | Esfuerzo | Depende de | Estado | Notas |
|---|---|---|---|---|---|---|---|---|
| M-26 | Anunciar los avisos al lector de pantalla | Hoy un lector de pantalla no se entera de un conflicto nuevo | Una región `aria-live="polite"` oculta en el editor que anuncie los cambios del chip de avisos, con retardo para no hablar en cada movimiento de un arrastre | medio | S | — | pendiente | Corregido el 6 nov 2026: el estado de guardado ya es `role="status"` en la barra (que implica `aria-live="polite"`), así que solo faltan los avisos. En el rediseño se quitó el `role="status"` del chip por duplicar anuncios |
| M-28 | Seleccionar muebles con el teclado | Usar el plano sin ratón: Tab recorre los muebles y Enter los selecciona | Los elementos del SVG con `tabIndex` y `aria-label` (nombre y medidas), orden de tabulación por posición; con M-01 ya se mueven | medio | M | M-01 | pendiente | Comprobado: `tabIndex` solo existe en la hoja para imprimir |
| M-29 | Modo oscuro | Comodidad de noche y en el móvil; lo esperan los usuarios de Android | `prefers-color-scheme: dark` con los tokens de `base.css` (crema, terracota, tinta) invertidos con cuidado; el plano y la 3D no cambian | bajo | M | — | pendiente | Comprobado: no hay ninguna regla de esquema oscuro |
| M-31 | Medir la carga y fijar un presupuesto | Saber cuánto tarda en abrir en un móvil normal antes de que lo note nadie | Lighthouse en móvil sobre `/disenar`, comprobar que three solo se carga al entrar en 3D, y anotar aquí las cifras y el tope que no se quiere superar | medio | S | — | pendiente | No medido; `vite.config.ts` no define `manualChunks`, así que no está comprobado cómo se parte el bundle |

## Otros

| Id | Sugerencia | Qué aporta | Mínimo que haría | Valor | Esfuerzo | Depende de | Estado | Notas |
|---|---|---|---|---|---|---|---|---|
| M-30 | Diseños de ejemplo en el inicio | Entender la app tocando un dormitorio ya amueblado, sin leer nada; y una imagen real para la portada | Tres documentos de ejemplo en el repo (dormitorio, salón, cocina), tarjetas con su miniatura en el inicio y «Abrir una copia» (misma regla que «Hacer una copia» del enlace compartido) | alto | M | — | pendiente | Los ejemplos sirven también para los e2e y las capturas |
| M-32 | Primer uso guiado | Las tres cosas que hay que saber (esquinas, catálogo, girar) dichas una vez y en su sitio | La primera vez, una burbuja en tres pasos sobre el plano, el catálogo y el círculo de giro, que se cierra con un toque y no vuelve | medio | M | — | pendiente | Las pistas ya existen como píldora; esto las sustituye solo la primera vez |
| M-33 | Inglés | Abrir la app a quien no lea español | Los textos ya están centralizados en `textos.ts`: añadir `en` y elegir por el idioma del navegador, con selector en el pie | bajo | M | — | pendiente | Las etiquetas del catálogo (variantes y zonas de color) viven en las definiciones, no en `textos.ts`: hay que sacarlas |
| M-34 | Saber qué se usa | Decidir estas mejoras con datos: qué tipos se colocan, cuántos llegan a 3D, cuántos imprimen | Eventos sin datos personales al tracker de analítica que ya hay (tipo colocado, vista 3D abierta, hoja impresa, enlace creado) | medio | M | — | pendiente | La analítica propia ya carga en producción (`VITE_ANALITICA_SITIO`). Comprobado el 6 nov 2026: el tracker de WebAnalytics solo hace un POST a `/api/visits` y no admite eventos con nombre; hay que añadir un endpoint de eventos y una función global en ese proyecto antes (por eso sube a M) |

## Lo que no haría

| Id | Sugerencia | Qué aporta | Mínimo que haría | Valor | Esfuerzo | Depende de | Estado | Notas |
|---|---|---|---|---|---|---|---|---|
| M-35 | Importar catálogos de tiendas (Awin, feeds, scraping) | Buscar «PAX» y que salga con medidas | — | — | L | — | descartada | Decisión de Angel del 3 nov 2026 en `estudios/2026-11-03-catalogos-de-tiendas.md`: Awin exige afiliación con cookies y datos retirables, y el scraping está prohibido por las condiciones de IKEA, Amazon y Leroy Merlin |
| M-36 | Editar un diseño entre varios a la vez | Diseñar en pareja desde dos móviles | — | — | L | — | descartada | No-objetivo de la spec; la concurrencia por ETag está pensada para una persona en varios dispositivos, no para edición simultánea |
| M-37 | Comentarios en el enlace compartido | Que quien lo recibe deje notas sobre el plano | — | — | M | — | descartada | No-objetivo de la spec de compartir: abre moderación, correo y datos de terceros. Las sugerencias ya tienen su canal |
| M-38 | Versiones fijas o varios enlaces por diseño | Enseñar «la opción A» y «la opción B» | — | — | M | — | descartada | No-objetivo de la spec de compartir; «Duplicar» y compartir cada copia cubre el caso |
| M-39 | Varias estancias en un mismo diseño | Un piso entero | — | — | L | — | descartada | No-objetivo de la v1: cambia el documento, los conflictos y el 3D. Si lo piden los usuarios, se replantea como spec nueva |
| M-40 | Techos inclinados y paredes curvas | Buhardillas | — | — | L | — | descartada | No-objetivo de la v1; la geometría de conflictos da por hecho techo plano y paredes rectas |
| M-41 | Render fotorrealista | Imágenes «de catálogo» | — | — | L | — | descartada | No-objetivo y anti-objetivo (un 3D lento es un fracaso); M-12 y M-13 son el techo razonable |
| M-42 | App Android nativa | Estar en Google Play | — | — | L | — | descartada | No-objetivo de la v1; M-25 (instalar la PWA) cubre lo que la gente nota |

## Pendientes técnicos (no se copian aquí)

- [Plan 1: núcleo](superpowers/plans/2026-10-24-01-pendientes.md)
- [Plan 2: API](superpowers/plans/2026-10-25-02-pendientes.md)
- [Plan 3: editor 2D](superpowers/plans/2026-10-29-03-pendientes.md)
- [Plan 4: vista 3D](superpowers/plans/2026-10-29-04-pendientes.md)
- [Plan 5: cuentas y sincronización](superpowers/plans/2026-10-30-05-pendientes.md)
- [Plan 6: despliegue](superpowers/plans/2026-10-31-06-pendientes.md)
- [Plan 7: sincronización y editor, y lo que quedó de las mejoras del 2 y 3 de noviembre](superpowers/plans/2026-11-01-07-pendientes.md)
- [Plan 11: lo que queda fuera del rediseño](superpowers/plans/2026-11-06-11-catalogo-rejilla.md#lo-que-queda-fuera-del-rediseño)
