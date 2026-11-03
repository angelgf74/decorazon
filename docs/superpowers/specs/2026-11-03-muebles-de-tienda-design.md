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

- Importar desde una URL o un feed: es la fase 2 o 3 del estudio.
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
