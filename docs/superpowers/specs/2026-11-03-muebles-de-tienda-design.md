# Muebles de tienda (fase 1: carga manual)

## Para qué

Que un mueble del diseño pueda ser un producto concreto de una tienda («el PAX de IKEA de 100 × 58 × 201»), para comprobar si cabe ese y no uno genérico, y llevarse a la tienda una lista con referencias, enlaces y precios. Es la fase 1 del estudio `docs/estudios/2026-11-03-catalogos-de-tiendas.md`. Ninguna tienda tiene API pública y la spec (§6.3) prohíbe extraer datos de sus webs, así que **los datos los teclea el usuario**. Decorazon no llama a ninguna tienda.

## Decisiones de Angel

- **Se vincula desde Propiedades.** Se coloca un tipo normal (un armario), y en su panel se pulsa «Es de una tienda» y se rellenan los datos del producto.
- **Medidas fijas.** Una vez vinculado, ancho, fondo y alto son los del producto: se ven pero no se editan sueltas. Se cambian en «Editar producto».
- **El nombre del producto** se ve en el plano («PAX») y en la lista de muebles («PAX», con el tipo debajo). La tienda va en texto.
- **Precio con fecha y total.** Cada producto lleva el precio anotado por el usuario y la fecha en que lo anotó. La hoja suma un total y avisa de que son precios anotados y pueden haber cambiado.

## Modelo

El campo `origen` de cada elemento admite, además de `{ tipo: 'generico' }`:

```ts
interface OrigenTienda {
  tipo: 'tienda'
  proveedor: string    // «IKEA», texto libre (1–60); se sugieren las tiendas habituales
  nombre: string       // «PAX», texto libre (1–80)
  referencia?: string  // «805.483.84» (hasta 40)
  url?: string         // http o https (hasta 2000), sin parámetros de seguimiento
  precio?: number      // euros, 0–1.000.000, con dos decimales como mucho
  fechaPrecio?: string // AAAA-MM-DD; solo junto a un precio
}
```

- Las medidas siguen en `elemento.medidas`. La regla de «fijas» la aplica el editor: `editarElemento` ignora los cambios de medidas de un elemento de tienda, y solo los cambia `vincularTienda`, la acción de guardar el producto.
- Sigue valiendo el rango del tipo: un producto de 330 cm no cabe en un sofá de como mucho 320. El formulario lo dice en el campo y no deja guardar.
- Duplicar copia el producto. Desvincular vuelve a `generico` y conserva las medidas.
- Es un campo nuevo dentro de `origen`, así que **el formato del documento no cambia** (sigue siendo 1). Una versión anterior de la web que abra un diseño con un mueble de tienda lo rechazaría por el validador. Se acepta, porque la PWA se actualiza sola.
- La API no cambia: guarda el documento como jsonb sin mirar los elementos.

## Qué se guarda y qué no

- Se guarda: tienda, nombre, referencia, URL, precio y fecha. Son hechos que teclea el usuario.
- No se guardan fotos, descripciones de la tienda, logotipos, disponibilidad ni nada que venga de la web de la tienda.
- Los productos viven en el diseño de cada usuario. No hay catálogo común: uno reconstruido con miles de fichas tecleadas se acercaría a la extracción sistemática de una base de datos (art. 133.2 LPI).

## URL

- Se acepta pegada sin esquema («ikea.com/es/es/p/…») y se le pone `https://`. Solo se admiten `http:` y `https:`. Cualquier otra cosa (`javascript:`, `data:`…) es un error en el formulario y **también en el validador del documento**, porque un diseño compartido lo pinta otra persona.
- Al guardar se quitan los parámetros de seguimiento: `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `mc_cid`, `mc_eid`, `igshid`, `yclid`, `ttclid`, `srsltid`, `awc`, `cjevent`, `irclickid` y `_ga`.
- Se abre en pestaña nueva con `rel="noopener noreferrer nofollow"`, sin iframe ni vista previa.

## Interfaz

**Propiedades de un mueble genérico:** debajo de los colores, un botón «Es de una tienda» que abre el formulario del producto, con las medidas actuales ya puestas.

**Formulario del producto**, dentro del panel:
- Tienda (con sugerencias: IKEA, Leroy Merlin, Conforama, El Corte Inglés, Kave Home, Maisons du Monde, Sklum, Amazon), nombre, referencia y enlace.
- Ancho, fondo y alto.
- Precio en €. La fecha se pone sola, hoy, cuando se escribe o cambia el precio, y se puede corregir.
- Botones «Guardar» y «Cancelar». Guardar es un solo paso de deshacer. Tienda y nombre son obligatorios.

**Propiedades de un mueble de tienda:**
- Título: el nombre del producto, con el tipo debajo («Armario de IKEA»).
- Ficha de solo lectura: tienda, referencia, «Ver en la tienda» (el enlace), precio con su fecha y las medidas.
- Botones «Editar producto» y «Desvincular».
- Siguen editables el giro, la altura desde el suelo (si el tipo la tiene), las variantes y los colores: son del modelo paramétrico, no del producto.
- Nota fija: «Los nombres de productos y marcas son de sus dueños. Decorazon no está afiliada a ninguna tienda.»

**Plano:** el nombre del producto en lugar del tipo. Los avisos de conflictos siguen con el tipo («el armario choca con la puerta»), que tiene género y artículo.

**Lista de muebles** (hoja de impresión y página compartida):
- Columna «Mueble»: el nombre del producto y, debajo, «Armario · IKEA · ref. 805.483.84».
- Precio con fecha: «199,00 € (anotado el 03/11/2026)».
- En la página compartida, «Ver en la tienda» enlazado. En la hoja, la URL en texto, para que se lea en papel.
- Si hay algún producto con precio, al final de la tabla: «Total anotado: 1.234,50 € (N productos)» y debajo «Precios anotados a mano en la fecha indicada; pueden haber cambiado».
- Si hay algún producto de tienda, la nota de marcas al pie.

## Decisiones tras la revisión

- **Volver a una versión anterior:** esa versión no entiende un mueble de tienda. Al abrir el diseño anónimo, lo aparta a `decorazon.disenoAnonimo.descartado`. Al volver a esta versión, si no hay diseño anónimo y el apartado sí se entiende, se recupera. Descartar el diseño a propósito (nuevo diseño, subirlo a la cuenta o cerrar sesión) borra también el apartado, para que no reaparezca. Un diseño de la cuenta con muebles de tienda no se abre en la versión vieja, pero sigue intacto en el servidor.
- **Alto real:** en un tipo con alto real distinto del de las medidas (el inodoro con la cisterna empotrada) no se pide el alto del producto. La ficha y la hoja enseñan el de la taza.
- **En el plano**, el nombre se recorta a 20 caracteres con «…». En la lista va entero.
- **Precios con separador de miles** también con cuatro cifras: «1.234,50 €».
- **Foco:** al abrir el formulario va a «Tienda». Al guardar, cancelar o desvincular vuelve al botón que queda. Sin esto quedaba en la página, donde Supr o Retroceso borran el mueble.
- **Medidas con decimales:** tienen su propio mensaje. El error de un campo se quita al corregirlo.

## Fuera de alcance

- Descargar la ficha de la tienda, desde el navegador o desde la API, o importar un feed: es la fase 2 o 3 del estudio. La fase 1b solo lee el texto del enlace y lo que el usuario pega.
- Un catálogo común de productos de tienda.
- Modelos 3D de los productos: se siguen pintando con el modelo paramétrico del tipo.
- Otras monedas.
- Enlaces de afiliado.

## Pruebas

- **Núcleo:**
  - validar un origen de tienda: campos, límites, URL `javascript:` rechazada y fecha sin precio rechazada;
  - `limpiarUrl`;
  - `vincularTienda` y desvincular, con las medidas recortadas al rango;
  - `editarElemento` ignora las medidas de un mueble de tienda;
  - duplicar copia el producto;
  - `nombreDeElemento`.
- **Panel:**
  - vincular, guardar con un solo deshacer, cancelar y desvincular;
  - errores de URL y de campos obligatorios;
  - la fecha se pone al escribir el precio;
  - las medidas son de solo lectura una vez vinculado.
- **Hoja y página compartida:**
  - la fila del producto, el total y la nota;
  - la URL en texto en la hoja y como enlace con `rel` en la página compartida.
- **Plano:** la etiqueta lleva el nombre del producto.

## Fase 1b: el enlace primero, leer la dirección y armario esquinero

### Para qué

Rellenar a mano tienda, nombre y referencia es lento. Casi siempre se empieza por la ficha del producto abierta en otra pestaña. Además, el primer producto de ejemplo de Angel es un armario esquinero (PAX / GRIMO, 110/110 × 201 cm), y Decorazon no tiene armarios en L.

### Decisiones de Angel

- **El enlace es el primer campo.** Una vez pegado, se rellena lo que se pueda.
- **Se lee la dirección y se pegan las medidas.** No se abre la web de la tienda, ni desde el navegador ni desde la API: la spec (§6.3) y las condiciones de IKEA y Amazon lo prohíben, y el navegador tampoco podría por CORS. Del texto del enlace salen tienda, nombre, referencia, tipo y color. Las medidas salen de un recuadro donde el usuario pega el bloque de medidas que copia de la ficha.
- **Se propone cambiar el tipo.** Si el enlace es de otro tipo de mueble (un esquinero pegado en un armario normal), un aviso lo dice y un botón convierte el mueble. No se cambia solo.

### Leer la dirección

`leerEnlace(url)` es una función pura del núcleo. Solo mira el texto y devuelve lo que encuentre; lo que no, queda sin rellenar:

- **Tienda**, por el dominio, quitando `www.` y aceptando cualquier dominio de país:

  | Dominio | Tienda |
  |---|---|
  | ikea.com | IKEA |
  | leroymerlin.es | Leroy Merlin |
  | conforama.es | Conforama |
  | elcorteingles.es | El Corte Inglés |
  | kavehome.com | Kave Home |
  | maisonsdumonde.com | Maisons du Monde |
  | sklum.com | Sklum |
  | amazon.es | Amazon |

  Otro dominio no rellena la tienda.
- **Tipo**: se comparan las palabras de la ruta, sin tildes y en minúsculas, con los nombres del catálogo, y gana la coincidencia más larga. «armario esquinero» gana a «armario».
- **Nombre**:
  - En IKEA, las palabras de la ruta antes del tipo, en mayúsculas y unidas con « / »: `pax-grimo-armario-esquinero-…` → «PAX / GRIMO».
  - En las demás tiendas, el último tramo de la ruta legible: guiones como espacios, la primera letra en mayúscula y sin el código final si lo hay.
  - Se recorta al límite de 80.
- **Referencia**: en IKEA, el código final de 8 cifras, con o sin la «s» de las combinaciones: `s29502652` → «295.026.52». En otras tiendas no se adivina.
- **Color**: la primera palabra de la ruta que esté en una tabla corta de colores, pasada a hex: blanco, negro, gris, gris oscuro, beige, crema, roble, nogal, haya, pino, azul, verde, rosa, rojo, amarillo. Se aplica a la primera zona de color del mueble al guardar.

**En el formulario:**
- Al salir del campo del enlace, o al pegarlo, se rellenan los campos vacíos y los que rellenó un enlace anterior. Nunca se pisa lo que el usuario tecleó.
- Solo se lee si el enlace es distinto del último leído. Al volver a «Editar producto», el enlace guardado no se vuelve a leer: ni nota, ni aviso, ni se pisa el color elegido después.
- Debajo sale la nota «Rellenado a partir del enlace: revisa los datos», en una región que siempre está y se anuncia.
- Lo leído sigue al enlace: si se borra o se cambia, desaparecen la nota y el aviso de tipo, y su color ya no se aplica al guardar.
- Un enlace que no se lee (no http) no rellena nada ni borra lo que puso el anterior. Sin ruta, solo da la tienda. El error de enlace inválido sigue saliendo al guardar.
- Un tipo que aparece tras «de», «del», «para» o «con» es un complemento y no cuenta: «lámpara de mesa», «silla de escritorio», «cabecero de cama». A igual largo, gana el tipo que aparece antes.
- La tienda es la del dominio registrado, contando los dominios de país de dos partes (ikea.co.uk). «ikea.otrodominio.com» no es IKEA.
- Fuera de IKEA, el nombre sale del último tramo con dos palabras o más y sin «=»: Amazon pone «ref=…» al final y el nombre antes de «/dp/». Los códigos del principio y del final no forman parte del nombre.
- El color es el primero que aparece en la dirección, no el primero de la tabla.

### Pegar las medidas

Un recuadro opcional, «Pega aquí las medidas de la ficha». Al pegar o al salir de él, `leerMedidas(texto)` (pura) rellena ancho, fondo y alto. Entiende:

- etiquetas: «Ancho» o «Anchura»; «Fondo» o «Profundidad»; «Alto» o «Altura», seguidas de un número y «cm» (también en la línea siguiente, como al copiar una tabla), en cualquier orden y con o sin dos puntos. Una etiqueta con complemento («Altura del asiento», «Ancho del colchón», «Altura máx.») no es la medida del mueble y no cuenta;
- «110x58x201 cm» y «110 × 58 × 201 cm», como ancho × fondo × alto;
- «110/110x201 cm», el formato de un esquinero: los dos lados y el alto (ancho 110, fondo 110, alto 201);
- decimales con coma o punto, que se redondean al centímetro.

Lo que no entiende no rellena nada. Aquí las medidas sí pisan lo que hubiera, porque el usuario acaba de pegarlas para eso, pero solo si el texto del recuadro ha cambiado: salir de él no deshace una corrección a mano. Siguen valiendo los rangos del tipo al guardar. Se leen los primeros 2.000 caracteres, de sobra para el bloque de medidas, para que un texto enorme no deje la página pensando.

### Armario esquinero

Tipo nuevo `armario-esquinero` («armario esquinero», masculino, dormitorio), en L como el sofá rinconera:

- **Medidas:** `ancho` es el lado pegado a la pared del fondo y `fondo` el lado del ala, los dos medidos por fuera. Van de 80 a 200 cm, con 110 por defecto. El alto va de 150 a 260 cm, con 201 por defecto.
- **Variantes:**
  - «Rincón», izquierda o derecha: hacia dónde va el ala. Por defecto, izquierda.
  - «Profundidad», 35 o 58 cm (por defecto 58, la de PAX): el grueso de los dos cuerpos.
- **Huella:** la L de 6 vértices. Los volúmenes son dos cajas convexas que se tocan en el rincón y cubren la L.
- **Puertas abatibles:** en cada cara frontal, las hojas justas para que ninguna pase de 60 cm, cada una con su zona de apertura. Se numeran desde fuera: la primera lleva la bisagra en el extremo exterior y se alternan. Si un lado tiene menos de 30 cm libres desde el rincón, no lleva puertas.
- **3D:** los dos cuerpos, el rincón interior tapado, y los frentes y tiradores. Zonas de color: «Cuerpo» y «Puertas».
- **Nombre en el plano:** sobre el lado largo, que es el del fondo o, si el ala es más larga, el ala.
- **Imán:** pega al rincón por su rectángulo envolvente, como el sofá rinconera.

### Cambiar el tipo

`cambiarTipo(doc, catálogo, id, tipo)` es pura:
- conserva id, posición, giro y origen;
- recorta las medidas al rango del tipo nuevo;
- conserva la altura desde el suelo solo si los dos tipos la dejan elegir; si no, pone la del tipo nuevo;
- pone las variantes por defecto;
- mantiene los colores de las zonas con la misma clave y pone por defecto las demás;
- vuelve a imantar.

En el formulario, si `leerEnlace` da un tipo distinto del mueble, sale el aviso «Este enlace parece un armario esquinero» con el botón «Cambiar a armario esquinero». El cambio es un solo paso de deshacer. El formulario sigue abierto con lo escrito, también las medidas, que desde ese momento se validan con los rangos del tipo nuevo. El foco va al enlace: el botón desaparece, y con el foco en la página Supr o Retroceso borrarían el mueble.

### Pruebas

- **`leerEnlace`:**
  - el enlace del ejemplo: IKEA, «PAX / GRIMO», «295.026.52», armario esquinero y blanco;
  - un artículo IKEA sin «s», una tienda de la lista sin referencia, un dominio desconocido, una ruta sin palabras, `javascript:` y vacío;
  - la coincidencia más larga del tipo.
- **`leerMedidas`:** cada formato, el orden libre de las etiquetas, los decimales y un texto sin medidas.
- **`cambiarTipo`:** conserva lo que debe, recorta medidas, colores por clave y documento válido.
- **Armario esquinero:**
  - la integridad del catálogo;
  - huella de 6 vértices;
  - volúmenes que cubren la L;
  - espejo izquierda/derecha;
  - puertas y sus zonas;
  - sin puerta en un ala estrecha.
- **Formulario:**
  - el enlace primero y con el foco;
  - pegar el enlace del ejemplo en un armario rellena tienda, nombre y referencia, no pisa un nombre ya escrito y avisa del esquinero;
  - el botón cambia el tipo (un deshacer);
  - pegar «110/110x201 cm» rellena las medidas;
  - el color se aplica al guardar.
