import { useId } from 'react'
import {
  bloquearElemento, cambiarLongitudPared, capitalizar, catalogoBase, editarAbertura, editarElemento, editarEstructura, LIMITE_NOMBRE_ELEMENTO,
  longitudPared, moverVertice, nombreDeElemento, partirPared, quitarDeEstancia, quitarVertice, rangoMedidaExtra, renombrarElemento, sePuedeVoltear,
  valorMedidaExtra, valoresVariante, valorVariante, voltearElemento,
  type Abertura, type Columna, type DocumentoDiseno, type Elemento, type Estructura, type Medidas, type Puerta,
  type Radiador, type ResultadoEdicion, type Ventana, type Viga, type ZonaColor,
} from '../../nucleo'
import { textos } from '../../textos'
import CampoNumero from '../comunes/CampoNumero'
import CampoTexto from '../comunes/CampoTexto'
import EntradaColor from '../comunes/EntradaColor'
import { etiquetaValor } from '../comunes/variantes'
import Icono from '../comunes/Icono'
import { almacen, useEditor } from '../estado/almacen'
import { borrar, duplicar } from '../estado/elementos'
import ProductoDeTienda from './ProductoDeTienda'

const t = textos.propiedades
const COORDENADA = 5000

type CambiosEnPared = Partial<Pick<Radiador, 'pared' | 'posicion' | 'ancho' | 'alto' | 'alturaSuelo'>>

const intentar = (f: (d: DocumentoDiseno) => ResultadoEdicion) => almacen.getState().intentar(f)
const quitar = (id: string) => almacen.getState().cambiar((d) => quitarDeEstancia(d, id))

function Opciones<T extends string>({ etiqueta, valor, opciones, alCambiar }: {
  etiqueta: string; valor: T; opciones: Record<T, string>; alCambiar(v: T): void
}) {
  const id = useId()
  return (
    <div className="panel__campo">
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={valor} onChange={(e) => alCambiar(e.target.value as T)}>
        {(Object.keys(opciones) as T[]).map((k) => <option key={k} value={k}>{opciones[k]}</option>)}
      </select>
    </div>
  )
}

function Pared({ doc, indice }: { doc: DocumentoDiseno; indice: number }) {
  const longitud = Math.round(longitudPared(doc.estancia.planta, indice))
  return (
    <>
      <h2>{`${t.pared} ${indice + 1}`}</h2>
      <CampoNumero etiqueta={t.longitud} valor={longitud} min={10} max={2000} unidad="cm"
        alCambiar={(n) => intentar((d) => cambiarLongitudPared(d, indice, n))} />
      <div className="panel__acciones">
        <button type="button" onClick={() => intentar((d) => partirPared(d, indice))}>{t.partir}</button>
      </div>
    </>
  )
}

function Vertice({ doc, indice }: { doc: DocumentoDiseno; indice: number }) {
  const v = doc.estancia.planta[indice]
  if (!v) return null
  return (
    <>
      <h2>{`${t.esquina} ${indice + 1}`}</h2>
      <CampoNumero etiqueta={t.x} valor={Math.round(v.x)} min={-COORDENADA} max={COORDENADA} unidad="cm"
        alCambiar={(x) => intentar((d) => moverVertice(d, indice, { x, y: v.y }))} />
      <CampoNumero etiqueta={t.y} valor={Math.round(v.y)} min={-COORDENADA} max={COORDENADA} unidad="cm"
        alCambiar={(y) => intentar((d) => moverVertice(d, indice, { x: v.x, y }))} />
      <div className="panel__acciones">
        <button type="button" className="peligro" onClick={() => { if (intentar((d) => quitarVertice(d, indice))) almacen.getState().seleccionar(null) }}>
          {t.quitarEsquina}
        </button>
      </div>
    </>
  )
}

/** Pared, posición, ancho, alto y altura desde el suelo: lo común a una ventana, una puerta y un radiador. */
function EnPared({ doc, h, alCambiar }: {
  doc: DocumentoDiseno; h: Abertura | Radiador; alCambiar(cambios: CambiosEnPared): void
}) {
  const { planta, alto } = doc.estancia
  const paredes = Object.fromEntries(planta.map((_, i) => [String(i), `${t.pared} ${i + 1}`]))
  const cambiarPared = (v: string) => {
    const pared = Number(v)
    // Conserva la posición si cabe en la pared nueva; si no, la pega al final.
    const posicion = Math.max(0, Math.min(h.posicion, Math.floor(longitudPared(planta, pared) - h.ancho)))
    alCambiar({ pared, posicion })
  }
  return (
    <>
      <Opciones etiqueta={t.pared} valor={String(h.pared)} opciones={paredes} alCambiar={cambiarPared} />
      <div className="panel__rejilla">
      <CampoNumero etiqueta={t.posicion} valor={h.posicion} min={0} max={2000} unidad="cm" alCambiar={(n) => alCambiar({ posicion: n })} />
      <CampoNumero etiqueta={t.ancho} valor={h.ancho} min={10} max={2000} unidad="cm" alCambiar={(n) => alCambiar({ ancho: n })} />
      <CampoNumero etiqueta={t.alto} valor={h.alto} min={10} max={alto} unidad="cm" alCambiar={(n) => alCambiar({ alto: n })} />
      {h.tipo !== 'puerta' && (
        <CampoNumero etiqueta={t.alturaSuelo} valor={h.alturaSuelo} min={0} max={alto} unidad="cm"
          alCambiar={(n) => alCambiar({ alturaSuelo: n })} />
      )}
      </div>
    </>
  )
}

function PropiedadesAbertura({ doc, a }: { doc: DocumentoDiseno; a: Abertura }) {
  const cambiar = (cambios: Partial<Puerta> | Partial<Ventana>) => intentar((d) => editarAbertura(d, a.id, cambios))
  return (
    <>
      <h2 className="panel__cabecera"><Icono nombre={a.tipo} />{t.tipos[a.tipo]}</h2>
      <EnPared doc={doc} h={a} alCambiar={cambiar} />
      {a.tipo === 'puerta' ? (
        <>
          <Opciones etiqueta={t.hoja} valor={a.hoja} opciones={t.hojas} alCambiar={(hoja) => cambiar({ hoja })} />
          <Opciones etiqueta={t.bisagra} valor={a.bisagra} opciones={t.bisagras} alCambiar={(bisagra) => cambiar({ bisagra })} />
          <Opciones etiqueta={t.sentido} valor={a.abreHacia} opciones={t.sentidos} alCambiar={(abreHacia) => cambiar({ abreHacia })} />
          <div className="panel__botones">
            <button type="button" onClick={() => cambiar({ bisagra: a.bisagra === 'izquierda' ? 'derecha' : 'izquierda' })}>
              <Icono nombre="voltear" />{t.voltear}
            </button>
          </div>
        </>
      ) : (
        <label className="panel__casilla">
          <input type="checkbox" checked={a.abreHaciaDentro} onChange={(e) => cambiar({ abreHaciaDentro: e.target.checked })} />
          {t.abreHaciaDentro}
        </label>
      )}
    </>
  )
}

function PropiedadesEstructura({ doc, e }: { doc: DocumentoDiseno; e: Estructura }) {
  const cambiar = (cambios: Partial<Columna> | Partial<Viga> | Partial<Radiador>) => intentar((d) => editarEstructura(d, e.id, cambios))
  const alto = doc.estancia.alto
  const coordenada = (etiqueta: string, valor: number, alCambiar: (n: number) => void) => (
    <CampoNumero etiqueta={etiqueta} valor={Math.round(valor)} min={-COORDENADA} max={COORDENADA} unidad="cm" alCambiar={alCambiar} />
  )
  return (
    <>
      <h2 className="panel__cabecera"><Icono nombre={e.tipo} />{t.tipos[e.tipo]}</h2>
      {e.tipo === 'columna' && (
        <div className="panel__rejilla">
          {coordenada(t.x, e.centro.x, (x) => cambiar({ centro: { ...e.centro, x } }))}
          {coordenada(t.y, e.centro.y, (y) => cambiar({ centro: { ...e.centro, y } }))}
          <CampoNumero etiqueta={t.ancho} valor={e.ancho} min={5} max={500} unidad="cm" alCambiar={(n) => cambiar({ ancho: n })} />
          <CampoNumero etiqueta={t.fondo} valor={e.fondo} min={5} max={500} unidad="cm" alCambiar={(n) => cambiar({ fondo: n })} />
          <CampoNumero etiqueta={t.giro} valor={e.rotacion} min={0} max={359} unidad="°" alCambiar={(n) => cambiar({ rotacion: n })} />
        </div>
      )}
      {e.tipo === 'viga' && (
        <div className="panel__rejilla">
          <CampoNumero etiqueta={t.ancho} valor={e.ancho} min={5} max={500} unidad="cm" alCambiar={(n) => cambiar({ ancho: n })} />
          <CampoNumero etiqueta={t.canto} valor={e.canto} min={1} max={alto} unidad="cm" alCambiar={(n) => cambiar({ canto: n })} />
          {coordenada(t.desdeX, e.desde.x, (x) => cambiar({ desde: { ...e.desde, x } }))}
          {coordenada(t.desdeY, e.desde.y, (y) => cambiar({ desde: { ...e.desde, y } }))}
          {coordenada(t.hastaX, e.hasta.x, (x) => cambiar({ hasta: { ...e.hasta, x } }))}
          {coordenada(t.hastaY, e.hasta.y, (y) => cambiar({ hasta: { ...e.hasta, y } }))}
        </div>
      )}
      {e.tipo === 'radiador' && (
        <>
          <EnPared doc={doc} h={e} alCambiar={cambiar} />
          <CampoNumero etiqueta={t.fondo} valor={e.fondo} min={1} max={100} unidad="cm" alCambiar={(n) => cambiar({ fondo: n })} />
        </>
      )}
    </>
  )
}

function BotonQuitar({ id }: { id: string }) {
  return (
    <div className="panel__acciones">
      <button type="button" className="peligro" onClick={() => quitar(id)}>{t.quitar}</button>
    </div>
  )
}

type CambiosElemento = Parameters<typeof editarElemento>[3]


function CampoColor({ zona, valor, alCambiar }: { zona: ZonaColor; valor: string; alCambiar(color: string): void }) {
  const id = useId()
  return (
    <div className="panel__campo">
      <label htmlFor={id}>{zona.etiqueta}</label>
      <EntradaColor id={id} valor={valor} alCambiar={alCambiar} />
    </div>
  )
}

/** En 3D solo se selecciona, edita y borra: girar y duplicar son del 2D. */
function PropiedadesElemento({ doc, e, en3d }: { doc: DocumentoDiseno; e: Elemento; en3d: boolean }) {
  const def = catalogoBase.get(e.tipo)
  if (!def) return null
  const editar = (cambios: CambiosElemento, grupo?: string) =>
    almacen.getState().cambiar((d) => editarElemento(d, catalogoBase, e.id, cambios), grupo)
  const deTienda = e.origen.tipo === 'tienda'
  const bloqueado = e.bloqueado === true
  const medida = (clave: keyof Medidas, etiqueta: string) => (
    <CampoNumero etiqueta={etiqueta} valor={e.medidas[clave]} min={def.medidas[clave].min} max={def.medidas[clave].max} unidad="cm"
      alCambiar={(n) => editar({ medidas: { [clave]: n } })} />
  )
  // Sin nombre propio, el campo enseña en gris lo que se escribiría en su lugar: el producto o el tipo.
  const nombrePorDefecto = nombreDeElemento(def, { ...e, nombre: undefined })
  return (
    <>
      <h2>{nombreDeElemento(def, e)}</h2>
      {/* Con nombre propio, el subtítulo dice lo que se tapa: el producto (y su tienda) o el tipo. */}
      {e.origen.tipo === 'tienda'
        ? <p className="panel__subtitulo">{`${nombreDeElemento(def, e) !== e.origen.nombre ? `${e.origen.nombre} · ` : ''}${textos.tienda.deTienda(capitalizar(def.nombre), e.origen.proveedor)}`}</p>
        : nombreDeElemento(def, e) !== capitalizar(def.nombre) && <p className="panel__subtitulo">{capitalizar(def.nombre)}</p>}
      <CampoTexto etiqueta={t.nombre} valor={e.nombre ?? ''} placeholder={nombrePorDefecto} maxLength={LIMITE_NOMBRE_ELEMENTO}
        alCambiar={(nombre) => almacen.getState().cambiar((d) => renombrarElemento(d, e.id, nombre))} />
      <div className="panel__rejilla">
        {/* Las de un mueble de tienda son las del producto: se cambian en «Editar producto». */}
        {!deTienda && medida('ancho', t.ancho)}
        {!deTienda && medida('fondo', t.fondo)}
        {!deTienda && def.altoReal?.(e) === undefined && medida('alto', t.alto)}
        {/* Las medidas propias del tipo (el hueco de un esquinero); en un mueble de tienda, como las demás, en su ficha. */}
        {!deTienda && def.medidasExtra?.map((m) => (
          <CampoNumero key={m.clave} etiqueta={m.etiqueta} valor={valorMedidaExtra(def, e, m.clave)} unidad="cm"
            min={rangoMedidaExtra(def, e, m.clave).min} max={rangoMedidaExtra(def, e, m.clave).max}
            alCambiar={(n) => editar({ medidasExtra: { [m.clave]: n } })} />
        ))}
      {/* Un bloqueado no gira (tampoco con el tirador ni con R). */}
      {!en3d && !bloqueado && <CampoNumero etiqueta={t.giro} valor={e.rotacion} min={0} max={359} unidad="°" alCambiar={(n) => editar({ rotacion: n })} />}
      {def.alturaSueloEditable && (
        <CampoNumero etiqueta={t.alturaSuelo} valor={e.alturaSuelo} min={0} max={Math.max(0, doc.estancia.alto - e.medidas.alto)} unidad="cm"
          alCambiar={(n) => editar({ alturaSuelo: n })} />
      )}
      </div>
      {def.variantes.map((v) => (
        <Opciones key={v.clave} etiqueta={v.etiqueta} valor={String(valorVariante(def, e, v.clave))}
          opciones={Object.fromEntries(valoresVariante(def, e, v.clave).map((x) => [String(x), etiquetaValor(x)]))}
          alCambiar={(s) => editar({ variantes: { [v.clave]: v.valores.find((x) => String(x) === s) ?? v.defecto } })} />
      ))}
      {def.zonasColor.map((z) => (
        <CampoColor key={z.clave} zona={z} valor={e.colores[z.clave] ?? z.defecto}
          alCambiar={(c) => editar({ colores: { [z.clave]: c } }, `color:${e.id}:${z.clave}`)} />
      ))}
      <ProductoDeTienda e={e} def={def} />
      <div className="panel__acciones">
        {/* Bloqueado: se selecciona y se edita, pero el plano no lo mueve ni lo gira (M-05). Voltear: izquierda ↔ derecha (M-08). */}
        <button type="button" aria-pressed={bloqueado} onClick={() => almacen.getState().cambiar((d) => bloquearElemento(d, e.id, !bloqueado))}>
          <Icono nombre={bloqueado ? 'candado' : 'candadoAbierto'} />{bloqueado ? t.desbloquear : t.bloquear}
        </button>
        {!en3d && sePuedeVoltear(def) && (
          <button type="button" onClick={() => almacen.getState().cambiar((d) => voltearElemento(d, catalogoBase, e.id))}>
            <Icono nombre="voltear" />{t.voltear}
          </button>
        )}
        {!en3d && <button type="button" onClick={() => duplicar(e.id)}>{t.duplicar}</button>}
        <button type="button" className="peligro" onClick={() => borrar(e.id)}>{t.borrar}</button>
      </div>
    </>
  )
}

const ATAJOS_ESTANCIA = [
  { teclas: ['Ctrl', 'Z'], accion: t.atajo.deshacer },
  { teclas: ['Ctrl', 'Y'], accion: t.atajo.rehacer },
  { teclas: ['← → ↑ ↓'], accion: t.atajo.mover },
  { teclas: ['Supr'], accion: t.atajo.quitar },
  { teclas: ['Esc'], accion: t.atajo.soltar },
]
const ATAJOS_MUEBLES = [...ATAJOS_ESTANCIA, { teclas: ['R'], accion: t.atajo.girar }, { teclas: ['Ctrl', 'D'], accion: t.atajo.duplicar }]

/** Sin nada seleccionado (en escritorio el panel se oculta; en móvil la hoja lo enseña): qué pulsar en el plano. */
function SinSeleccion({ paso }: { paso: number }) {
  return (
    <div className="panel__vacio">
      <h2>{t.nadaSeleccionado}</h2>
      <p className="panel__nota">{paso === 1 ? t.nada : t.nadaElemento}</p>
    </div>
  )
}

/** Los atajos de teclado de este paso (los de usarAtajos.ts), plegados al pie del panel. */
function Atajos({ paso }: { paso: number }) {
  return (
    <details className="atajos">
      <summary>{t.atajos}</summary>
      <section aria-label={t.atajos}>
        <dl>
          {(paso === 1 ? ATAJOS_ESTANCIA : ATAJOS_MUEBLES).map(({ teclas, accion }) => (
            <div key={accion} className="atajos__fila">
              <dt>{teclas.map((k, i) => <span key={k}>{i > 0 && '+'}<kbd>{k}</kbd></span>)}</dt>
              <dd>{accion}</dd>
            </div>
          ))}
        </dl>
      </section>
    </details>
  )
}

/** Propiedades de lo seleccionado. En el paso 1: pared, esquina, abertura o estructura; en el paso 2, el elemento. */
export default function PanelPropiedades() {
  const doc = useEditor((e) => e.documento)
  const seleccion = useEditor((e) => e.seleccion)
  const paso = useEditor((e) => e.paso)
  const en3d = useEditor((e) => e.vista === '3d')
  if (!doc) return null

  let contenido = null
  if (paso === 1 && seleccion) {
    if (seleccion.tipo === 'pared') contenido = <Pared doc={doc} indice={seleccion.indice} />
    else if (seleccion.tipo === 'vertice') contenido = <Vertice doc={doc} indice={seleccion.indice} />
    else if (seleccion.tipo === 'abertura') {
      const a = doc.aberturas.find((x) => x.id === seleccion.id)
      if (a) contenido = <><PropiedadesAbertura key={a.id} doc={doc} a={a} /><BotonQuitar id={a.id} /></>
    } else if (seleccion.tipo === 'estructura') {
      const e = doc.estructura.find((x) => x.id === seleccion.id)
      if (e) contenido = <><PropiedadesEstructura key={e.id} doc={doc} e={e} /><BotonQuitar id={e.id} /></>
    }
  } else if (paso === 2 && seleccion?.tipo === 'elemento') {
    const e = doc.elementos.find((x) => x.id === seleccion.id)
    if (e) contenido = <PropiedadesElemento key={e.id} doc={doc} e={e} en3d={en3d} />
  }

  return (
    <div className="panel-propiedades">
      {contenido ?? <SinSeleccion paso={paso} />}
      {contenido !== null && <Atajos paso={paso} />}
    </div>
  )
}
