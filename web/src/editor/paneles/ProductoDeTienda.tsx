import { useId, useRef, useState } from 'react'
import {
  cambiarTipo, catalogoBase, desvincularTienda, editarElemento, esFechaPrecio, esUrlDeProducto, leerEnlace, leerMedidas, LIMITES_TIENDA,
  limpiarUrl, TIENDAS_SUGERIDAS, vincularTienda,
  type DatosDeEnlace, type DefinicionTipo, type Elemento, type Medidas, type OrigenTienda,
} from '../../nucleo'
import { textos } from '../../textos'
import { formatoFecha, formatoPrecio, hoy, leerPrecio } from '../comunes/formatos'
import { almacen } from '../estado/almacen'

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

function Formulario({ e, def, alTerminar }: { e: Elemento; def: DefinicionTipo; alTerminar(): void }) {
  const [borrador, setBorrador] = useState(() => borradorDe(e))
  const [errores, setErrores] = useState<Errores>({})
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
    if ('errores' in r) {
      setErrores(r.errores)
      const primero = CAMPOS.find((c) => r.errores[c])
      if (primero) campos.current[primero]?.focus()
      return
    }
    const zona = def.zonasColor[0]
    const color = leido.color
    // Un solo cambio, un solo deshacer: el producto, sus medidas y el color que nombra el enlace.
    almacen.getState().cambiar((d) => {
      const vinculado = vincularTienda(d, catalogoBase, e.id, r.origen, r.medidas)
      return zona && color ? editarElemento(vinculado, catalogoBase, e.id, { colores: { [zona.clave]: color } }) : vinculado
    })
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
        <dd>{`${ancho} × ${fondo} × ${alto} cm`}</dd>
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
    <div className="panel__acciones">
      <button type="button" autoFocus={enfocar} onClick={() => setEditando(true)}>{t.esDeTienda}</button>
    </div>
  )
}
