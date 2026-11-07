import { useId, useRef, useState } from 'react'
import {
  cambiarTipo, catalogoBase, desvincularTienda, editarElemento, esFechaPrecio, esUrlDeProducto, leerEnlace, leerMedidas, LIMITES_TIENDA,
  limpiarUrl, lineasMedidasExtra, rangoMedidaExtra, TIENDAS_SUGERIDAS, valorMedidaExtra, vincularTienda,
  type DatosDeEnlace, type DefinicionTipo, type Elemento, type Medidas, type OrigenTienda,
} from '../../nucleo'
import { textos } from '../../textos'
import { formatoFecha, formatoPrecio, hoy, leerPrecio } from '../comunes/formatos'
import { almacen } from '../estado/almacen'
import { guardarProducto, olvidarProducto, useMisProductos, type ProductoGuardado } from './misProductos'

const t = textos.tienda

type Campo = 'proveedor' | 'nombre' | 'referencia' | 'url' | 'precio' | 'fechaPrecio' | 'ancho' | 'fondo' | 'alto'
type Borrador = Record<Campo, string>
type Errores = Partial<Record<Campo, string>>
/** En el orden del formulario: el primero con error recibe el foco. */
const CAMPOS: Campo[] = ['url', 'proveedor', 'nombre', 'referencia', 'precio', 'fechaPrecio', 'ancho', 'fondo', 'alto']
const MEDIDAS: (Campo & keyof Medidas)[] = ['ancho', 'fondo', 'alto']

function borradorDe(e: Elemento): Borrador {
  const o = e.origen.tipo === 'tienda' ? e.origen : undefined
  return {
    proveedor: o?.proveedor ?? '',
    nombre: o?.nombre ?? '',
    referencia: o?.referencia ?? '',
    url: o?.url ?? '',
    precio: o?.precio === undefined ? '' : String(o.precio).replace('.', ','),
    fechaPrecio: o?.fechaPrecio ?? '',
    ancho: String(e.medidas.ancho),
    fondo: String(e.medidas.fondo),
    alto: String(e.medidas.alto),
  }
}

/**
 * Las medidas que se piden del producto. Sin el alto si el tipo tiene un alto real distinto del de las medidas (el
 * inodoro con la cisterna empotrada: la taza), que tampoco se edita en un mueble genérico.
 */
const medidasDe = (def: DefinicionTipo, e: Elemento) => MEDIDAS.filter((k) => k !== 'alto' || def.altoReal?.(e) === undefined)

/** Las medidas extra del tipo leídas del formulario (fijas del producto, como las demás), o el error de cada una. */
/**
 * El mueble tal como quedaría con lo escrito en el formulario: los rangos de las medidas extra dependen de las demás
 * (el hueco, del ancho del ala), así que se validan y se enseñan con lo que el usuario está escribiendo.
 */
function elementoConBorrador(e: Elemento, b: Borrador, escritas: Record<string, string>): Elemento {
  const numero = (texto: string, antes: number) => (/^\d+$/.test(texto.trim()) ? Number(texto.trim()) : antes)
  const medidas = { ancho: numero(b.ancho, e.medidas.ancho), fondo: numero(b.fondo, e.medidas.fondo), alto: numero(b.alto, e.medidas.alto) }
  const extra = Object.fromEntries(Object.entries(escritas).map(([k, v]) => [k, numero(v, e.medidasExtra?.[k] ?? 0)]))
  return { ...e, medidas, medidasExtra: { ...e.medidasExtra, ...extra } }
}

/** Las medidas extra del tipo leídas del formulario (fijas del producto, como las demás), o el error de cada una. */
function leerExtra(escritas: Record<string, string>, def: DefinicionTipo, conBorrador: Elemento): { medidasExtra: Record<string, number> } | { errores: Record<string, string> } {
  const errores: Record<string, string> = {}
  const medidasExtra: Record<string, number> = {}
  for (const m of def.medidasExtra ?? []) {
    const { min, max } = rangoMedidaExtra(def, conBorrador, m.clave)
    const texto = (escritas[m.clave] ?? '').trim()
    const n = Number(texto)
    if (!/^\d+$/.test(texto)) errores[m.clave] = /^\d+[.,]\d*$/.test(texto) ? t.errores.medidaEntera : t.errores.medida(min, max)
    else if (n < min || n > max) errores[m.clave] = t.errores.medida(min, max)
    medidasExtra[m.clave] = n
  }
  return Object.keys(errores).length > 0 ? { errores } : { medidasExtra }
}

/** El producto y sus medidas, o los errores de cada campo. Las medidas fuera del rango del tipo no se recortan en silencio. */
function leerBorrador(b: Borrador, def: DefinicionTipo, e: Elemento): { origen: OrigenTienda; medidas: Medidas } | { errores: Errores } {
  const errores: Errores = {}
  const proveedor = b.proveedor.trim()
  const nombre = b.nombre.trim()
  const referencia = b.referencia.trim()
  if (proveedor.length < 1 || proveedor.length > LIMITES_TIENDA.proveedor) errores.proveedor = t.errores.proveedor
  if (nombre.length < 1 || nombre.length > LIMITES_TIENDA.nombre) errores.nombre = t.errores.nombre
  if (referencia.length > LIMITES_TIENDA.referencia) errores.referencia = t.errores.referencia
  const url = b.url.trim() === '' ? undefined : limpiarUrl(b.url)
  if (url === null) errores.url = t.errores.url
  const precio = b.precio.trim() === '' ? undefined : leerPrecio(b.precio)
  if (precio === null) errores.precio = t.errores.precio
  if (precio !== undefined && precio !== null && !esFechaPrecio(b.fechaPrecio)) errores.fechaPrecio = t.errores.fechaPrecio
  const medidas: Medidas = { ...e.medidas }
  for (const k of medidasDe(def, e)) {
    const { min, max } = def.medidas[k]
    const texto = b[k].trim()
    const n = Number(texto)
    if (!/^\d+$/.test(texto)) errores[k] = /^\d+[.,]\d*$/.test(texto) ? t.errores.medidaEntera : t.errores.medida(min, max)
    else if (n < min || n > max) errores[k] = t.errores.medida(min, max)
    medidas[k] = n
  }
  if (Object.keys(errores).length > 0) return { errores }
  const origen: OrigenTienda = {
    tipo: 'tienda', proveedor, nombre,
    ...(referencia !== '' && { referencia }),
    ...(url && { url }),
    ...(precio !== undefined && precio !== null && { precio, fechaPrecio: b.fechaPrecio }),
  }
  return { origen, medidas }
}

interface PropsCampo {
  campo: Campo
  valor: string
  error?: string
  tipo?: 'text' | 'date' | 'url'
  modo?: 'text' | 'numeric' | 'decimal' | 'url'
  lista?: string
  enfocar?: boolean
  alCambiar(campo: Campo, valor: string): void
  referencia(campo: Campo, el: HTMLInputElement | null): void
  /** Con el texto pegado o, al salir del campo, con el que tenga. */
  alPegar?(texto: string): void
  alSalir?(): void
}

function CampoProducto({ campo, valor, error, tipo = 'text', modo, lista, enfocar, alCambiar, referencia, alPegar, alSalir }: PropsCampo) {
  const id = useId()
  const idError = `${id}-error`
  return (
    <div className="panel__campo">
      <label htmlFor={id}>{t.campos[campo]}</label>
      <input
        id={id}
        ref={(el) => referencia(campo, el)}
        type={tipo}
        inputMode={modo}
        list={lista}
        autoFocus={enfocar}
        value={valor}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        onChange={(ev) => alCambiar(campo, ev.target.value)}
        onPaste={alPegar && ((ev) => alPegar(ev.clipboardData.getData('text')))}
        onBlur={alSalir}
      />
      {error && <small id={idError} className="panel__error">{error}</small>}
    </div>
  )
}

interface PropsCampoExtra {
  etiqueta: string; valor: string; rango: { min: number; max: number }; error?: string
  alCambiar(valor: string): void; referencia(el: HTMLInputElement | null): void
}

/**
 * Una medida extra del tipo (el hueco de un esquinero) como medida del producto: su etiqueta lo dice, para no
 * confundirla con el campo de Propiedades que se ve a la vez. Debajo, el rango que admite ahora; o el error.
 */
function CampoExtra({ etiqueta, valor, rango, error, alCambiar, referencia }: PropsCampoExtra) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  return (
    <div className="panel__campo">
      <label htmlFor={id}>{t.campoExtra(etiqueta)}</label>
      <input
        id={id} ref={referencia} type="text" inputMode="numeric" value={valor}
        aria-invalid={error ? true : undefined} aria-describedby={idAyuda}
        onChange={(ev) => alCambiar(ev.target.value)}
      />
      {error
        ? <small id={idAyuda} className="panel__error">{error}</small>
        : <small id={idAyuda} className="campo-numero__ayuda">{t.rangoCm(rango.min, rango.max)}</small>}
    </div>
  )
}

function Formulario({ e, def, alTerminar }: { e: Elemento; def: DefinicionTipo; alTerminar(): void }) {
  const [borrador, setBorrador] = useState(() => borradorDe(e))
  const [errores, setErrores] = useState<Errores>({})
  // Las medidas extra tecleadas; las que no, se enseñan con el valor del mueble (también tras cambiar de tipo).
  const [extra, setExtra] = useState<Record<string, string>>({})
  const [erroresExtra, setErroresExtra] = useState<Record<string, string>>({})
  const camposExtra = useRef<Record<string, HTMLInputElement | null>>({})
  const valorExtra = (clave: string) => extra[clave] ?? String(valorMedidaExtra(def, e, clave))
  const escritasExtra = Object.fromEntries((def.medidasExtra ?? []).map((m) => [m.clave, valorExtra(m.clave)]))
  const conBorrador = elementoConBorrador(e, borrador, escritasExtra)
  const cambiarExtra = (clave: string, valor: string) => {
    setExtra((x) => ({ ...x, [clave]: valor }))
    setErroresExtra((previos) => {
      const resto = { ...previos }
      delete resto[clave]
      return resto
    })
  }
  // El enlace con el que se abrió: mientras no cambie, no se lee (al volver a «Editar producto» no se pisa nada).
  const [urlInicial] = useState(() => borrador.url.trim())
  // Lo que dice el enlace actual: la nota, el tipo que parece y el color que se aplica al guardar. Sale del campo, así
  // que borrarlo o cambiarlo se lo lleva.
  const leido: DatosDeEnlace = borrador.url.trim() === urlInicial ? {} : leerEnlace(borrador.url, catalogoBase)
  const hayLeido = Object.keys(leido).length > 0
  // El último texto con el que se rellenó y los campos que rellenó el enlace (y el usuario no ha tocado): un enlace
  // nuevo puede cambiarlos; lo tecleado, nunca.
  const ultimaLeida = useRef(urlInicial)
  const autorrellenados = useRef(new Set<Campo>())
  const ultimasMedidas = useRef('')
  const campos = useRef<Partial<Record<Campo, HTMLInputElement | null>>>({})
  const idTiendas = useId()
  const idTitulo = useId()
  const idMedidas = useId()
  const idAyudaMedidas = useId()

  // Escribir o cambiar el precio pone la fecha de hoy: un precio sin fecha engaña. Se puede corregir después.
  // Corregir un campo quita su error, sin esperar al siguiente «Guardar».
  const cambiar = (campo: Campo, valor: string) => {
    autorrellenados.current.delete(campo)
    setBorrador((b) => ({ ...b, [campo]: valor, ...(campo === 'precio' && { fechaPrecio: hoy() }) }))
    setErrores((previos) => {
      const resto = { ...previos }
      delete resto[campo]
      return resto
    })
  }
  /**
   * Rellena desde el texto del enlace los campos vacíos y los que rellenó un enlace anterior; nunca lo que el usuario
   * escribió. Solo si el texto es otro que el último leído: salir del campo sin cambiarlo no vuelve a rellenar.
   */
  const rellenarDesdeEnlace = (texto: string) => {
    if (texto.trim() === ultimaLeida.current) return
    ultimaLeida.current = texto.trim()
    const datos = leerEnlace(texto, catalogoBase)
    // Un enlace borrado o que no se lee no se lleva lo que puso el anterior: no hay nada mejor con qué sustituirlo.
    if (Object.keys(datos).length === 0) return
    const rellenables: (Campo & keyof DatosDeEnlace)[] = ['proveedor', 'nombre', 'referencia']
    setBorrador((b) => {
      const nuevo = { ...b }
      for (const c of rellenables) {
        if (b[c].trim() !== '' && !autorrellenados.current.has(c)) continue
        nuevo[c] = datos[c] ?? ''
        if (nuevo[c] !== '') autorrellenados.current.add(c)
        else autorrellenados.current.delete(c)
      }
      return nuevo
    })
  }

  /** Las medidas pegadas sí sustituyen a las que hubiera: se acaban de pegar para eso. Salir sin cambiar el texto, nada. */
  const rellenarMedidas = (texto: string) => {
    if (texto === ultimasMedidas.current) return
    ultimasMedidas.current = texto
    for (const [k, v] of Object.entries(leerMedidas(texto))) cambiar(k as Campo, String(v))
  }

  const otroTipo = leido.tipo && leido.tipo !== e.tipo ? catalogoBase.get(leido.tipo) : undefined
  const convertir = () => {
    if (!otroTipo) return
    almacen.getState().cambiar((d) => cambiarTipo(d, catalogoBase, e.id, otroTipo.id))
    // El formulario sigue con lo escrito (también las medidas, que ahora se validan con los rangos del tipo nuevo).
    // El botón desaparece: el foco va al enlace, no a la página, donde Supr o Retroceso borrarían el mueble.
    campos.current.url?.focus()
  }

  const props = (campo: Campo) => ({
    campo, valor: borrador[campo], error: errores[campo], alCambiar: cambiar,
    referencia: (c: Campo, el: HTMLInputElement | null) => { campos.current[c] = el },
  })

  const guardar = () => {
    const r = leerBorrador(borrador, def, e)
    const rx = leerExtra(escritasExtra, def, conBorrador)
    if ('errores' in r || 'errores' in rx) {
      setErrores('errores' in r ? r.errores : {})
      setErroresExtra('errores' in rx ? rx.errores : {})
      // El foco, al primer campo con error: los del producto van antes que las medidas extra.
      const primero = 'errores' in r ? CAMPOS.find((c) => r.errores[c]) : undefined
      if (primero) campos.current[primero]?.focus()
      else if ('errores' in rx) camposExtra.current[(def.medidasExtra ?? []).find((m) => rx.errores[m.clave])!.clave]?.focus()
      return
    }
    const zona = def.zonasColor[0]
    const color = leido.color
    // Un solo cambio, un solo deshacer: el producto, sus medidas y el color que nombra el enlace.
    almacen.getState().cambiar((d) => {
      const vinculado = vincularTienda(d, catalogoBase, e.id, r.origen, r.medidas, rx.medidasExtra)
      return zona && color ? editarElemento(vinculado, catalogoBase, e.id, { colores: { [zona.clave]: color } }) : vinculado
    })
    // Queda en mis productos para usarlo en otro mueble u otro diseño (M-17). El tipo es el del mueble ahora (pudo cambiar).
    const tipo = almacen.getState().documento?.elementos.find((x) => x.id === e.id)?.tipo ?? e.tipo
    guardarProducto({ tipo, origen: r.origen, medidas: r.medidas, ...(def.medidasExtra?.length && { medidasExtra: rx.medidasExtra }) })
    alTerminar()
  }

  return (
    <form
      className="producto-tienda"
      aria-labelledby={idTitulo}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault()
        guardar()
      }}
    >
      <h3 id={idTitulo} className="panel__titulo">{t.titulo}</h3>
      {/* El enlace, primero: de su texto salen tienda, nombre, referencia, tipo y color (sin abrir la web de la tienda).
          Al abrir, el foco va aquí: sin él quedaría en la página, y Supr o Retroceso borrarían el mueble. */}
      <CampoProducto {...props('url')} tipo="url" modo="url" enfocar alPegar={rellenarDesdeEnlace} alSalir={() => rellenarDesdeEnlace(borrador.url)} />
      {/* Siempre montada, para que el lector de pantalla anuncie el cambio; el aviso de tipo va aparte, con su botón. */}
      <p className="panel__nota producto-tienda__estado" role="status">{hayLeido ? t.rellenado : ''}</p>
      {otroTipo && (
        <div className="producto-tienda__aviso">
          <p>{t.pareceOtroTipo(`${otroTipo.genero === 'm' ? 'un' : 'una'} ${otroTipo.nombre}`)}</p>
          <button type="button" onClick={convertir}>{t.cambiarA(otroTipo.nombre)}</button>
        </div>
      )}
      <CampoProducto {...props('proveedor')} lista={idTiendas} />
      <datalist id={idTiendas}>
        {TIENDAS_SUGERIDAS.map((tienda) => <option key={tienda} value={tienda} />)}
      </datalist>
      <CampoProducto {...props('nombre')} />
      <CampoProducto {...props('referencia')} />
      <div className="panel__campo">
        <label htmlFor={idMedidas}>{t.medidasPegadas}</label>
        <textarea
          id={idMedidas}
          rows={2}
          aria-describedby={idAyudaMedidas}
          onPaste={(ev) => rellenarMedidas(ev.clipboardData.getData('text'))}
          onBlur={(ev) => rellenarMedidas(ev.target.value)}
        />
        <small id={idAyudaMedidas} className="campo-numero__ayuda">{t.ayudaMedidas}</small>
      </div>
      <div className="panel__rejilla">
        <CampoProducto {...props('precio')} modo="decimal" />
        <CampoProducto {...props('fechaPrecio')} tipo="date" />
        {medidasDe(def, e).map((k) => <CampoProducto key={k} {...props(k)} modo="numeric" />)}
        {def.medidasExtra?.map((m) => (
          <CampoExtra
            key={m.clave} etiqueta={m.etiqueta} valor={valorExtra(m.clave)} error={erroresExtra[m.clave]}
            rango={rangoMedidaExtra(def, conBorrador, m.clave)}
            alCambiar={(v) => cambiarExtra(m.clave, v)} referencia={(el) => { camposExtra.current[m.clave] = el }}
          />
        ))}
      </div>
      <div className="panel__acciones">
        <button type="submit" className="primario">{t.guardar}</button>
        <button type="button" onClick={alTerminar}>{t.cancelar}</button>
      </div>
    </form>
  )
}

interface PropsFicha { e: Elemento; def: DefinicionTipo; origen: OrigenTienda; enfocar: boolean; alEditar(): void; alDesvincular(): void }

function Ficha({ e, def, origen, enfocar, alEditar, alDesvincular }: PropsFicha) {
  const idTitulo = useId()
  const { ancho, fondo } = e.medidas
  const alto = def.altoReal?.(e) ?? e.medidas.alto
  return (
    <section className="producto-tienda" aria-labelledby={idTitulo}>
      <h3 id={idTitulo} className="panel__titulo">{t.titulo}</h3>
      <dl className="producto-tienda__ficha">
        <dt>{t.ficha.proveedor}</dt>
        <dd>{origen.proveedor}</dd>
        {origen.referencia && (
          <>
            <dt>{t.ficha.referencia}</dt>
            <dd>{origen.referencia}</dd>
          </>
        )}
        {origen.precio !== undefined && (
          <>
            <dt>{t.ficha.precio}</dt>
            <dd>{t.precioAnotado(formatoPrecio(origen.precio), origen.fechaPrecio && formatoFecha(origen.fechaPrecio))}</dd>
          </>
        )}
        <dt>{t.ficha.medidas}</dt>
        {/* Las medidas extra van dentro del mismo valor: como dd sueltos descolocaban la rejilla de dos columnas. */}
        <dd>
          <div>{`${ancho} × ${fondo} × ${alto} cm`}</div>
          {lineasMedidasExtra(def, e).map((linea) => (
            <div key={linea}>{linea}</div>
          ))}
        </dd>
      </dl>
      {/* El validador ya rechaza otras; se comprueba otra vez porque aquí se pinta un enlace. */}
      {origen.url && esUrlDeProducto(origen.url) && (
        <p><a href={origen.url} target="_blank" rel="noopener noreferrer nofollow">{t.verEnTienda}</a></p>
      )}
      <div className="panel__acciones">
        <button type="button" autoFocus={enfocar} onClick={alEditar}>{t.editar}</button>
        <button type="button" onClick={alDesvincular}>{t.desvincular}</button>
      </div>
      <p className="panel__nota">{t.marcas}</p>
    </section>
  )
}

/**
 * El producto de tienda de un mueble (fase 1: lo teclea el usuario; Decorazon no llama a ninguna tienda). Un mueble
 * genérico ofrece vincularlo; uno vinculado enseña su ficha. El formulario guarda todo de una vez: un solo deshacer.
 */
export default function ProductoDeTienda({ e, def }: { e: Elemento; def: DefinicionTipo }) {
  const [editando, setEditando] = useState(false)
  // Al cerrar el formulario o desvincular desaparece el control que tenía el foco: se lleva al botón que queda, para
  // que no caiga en la página (donde Supr o Retroceso borrarían el mueble). Al seleccionar el mueble, no.
  const [enfocar, setEnfocar] = useState(false)
  const terminar = () => {
    setEnfocar(true)
    setEditando(false)
  }
  if (editando) return <Formulario e={e} def={def} alTerminar={terminar} />
  if (e.origen.tipo === 'tienda') {
    const desvincular = () => {
      setEnfocar(true)
      almacen.getState().cambiar((d) => desvincularTienda(d, e.id))
    }
    return <Ficha e={e} def={def} origen={e.origen} enfocar={enfocar} alEditar={() => setEditando(true)} alDesvincular={desvincular} />
  }
  return (
    <>
      <div className="panel__acciones">
        <button type="button" autoFocus={enfocar} onClick={() => setEditando(true)}>{t.esDeTienda}</button>
      </div>
      <MisProductos e={e} alUsar={() => setEnfocar(true)} />
    </>
  )
}

/** Los productos ya tecleados de este tipo (M-17): «Usar» vincula el mueble con uno de ellos, medidas incluidas, en un solo paso. */
function MisProductos({ e, alUsar }: { e: Elemento; alUsar(): void }) {
  const productos = useMisProductos().filter((p) => p.tipo === e.tipo)
  const idTitulo = useId()
  if (productos.length === 0) return null
  const usar = (p: ProductoGuardado) => {
    // La ficha que sale después lleva el foco a «Editar producto»: el botón pulsado desaparece y no cae en la página.
    alUsar()
    almacen.getState().cambiar((d) => vincularTienda(d, catalogoBase, e.id, p.origen, p.medidas, p.medidasExtra))
    guardarProducto(p)
  }
  return (
    <section className="mis-productos" aria-labelledby={idTitulo}>
      <h3 id={idTitulo} className="panel__titulo">{t.misProductos}</h3>
      <ul className="mis-productos__lista" aria-labelledby={idTitulo}>
        {productos.map((p) => (
          <li key={`${p.origen.proveedor}|${p.origen.nombre}|${p.origen.referencia ?? ''}`} className="mis-productos__producto">
            <button type="button" onClick={() => usar(p)} aria-label={t.usarProducto(p.origen.nombre, p.origen.proveedor)}>
              <span>{p.origen.nombre}</span>
              <small>{`${p.origen.proveedor} · ${p.medidas.ancho} × ${p.medidas.fondo} cm${p.origen.precio !== undefined ? ` · ${formatoPrecio(p.origen.precio)}` : ''}`}</small>
            </button>
            <button type="button" className="boton-icono enlace" aria-label={t.olvidarProducto(p.origen.nombre, p.origen.proveedor)}
              title={t.olvidarProducto(p.origen.nombre, p.origen.proveedor)} onClick={() => olvidarProducto(p)}>×</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
