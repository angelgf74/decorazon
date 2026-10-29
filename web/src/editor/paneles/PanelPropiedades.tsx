import { useId } from 'react'
import {
  cambiarLongitudPared, capitalizar, catalogoBase, editarAbertura, editarElemento, editarEstructura, longitudPared, moverVertice, partirPared,
  quitarDeEstancia, quitarVertice, valorVariante,
  type Abertura, type Columna, type DefinicionVariante, type DocumentoDiseno, type Elemento, type Estructura, type Medidas, type Puerta,
  type Radiador, type ResultadoEdicion, type Ventana, type Viga, type ZonaColor,
} from '../../nucleo'
import { textos } from '../../textos'
import CampoNumero from '../comunes/CampoNumero'
import EntradaColor from '../comunes/EntradaColor'
import { almacen, useEditor } from '../estado/almacen'
import { borrar, duplicar } from '../estado/elementos'

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
      <div className="panel__botones">
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
      <div className="panel__botones">
        <button type="button" onClick={() => { if (intentar((d) => quitarVertice(d, indice))) almacen.getState().seleccionar(null) }}>
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
      <CampoNumero etiqueta={t.posicion} valor={h.posicion} min={0} max={2000} unidad="cm" alCambiar={(n) => alCambiar({ posicion: n })} />
      <CampoNumero etiqueta={t.ancho} valor={h.ancho} min={10} max={2000} unidad="cm" alCambiar={(n) => alCambiar({ ancho: n })} />
      <CampoNumero etiqueta={t.alto} valor={h.alto} min={10} max={alto} unidad="cm" alCambiar={(n) => alCambiar({ alto: n })} />
      {h.tipo !== 'puerta' && (
        <CampoNumero etiqueta={t.alturaSuelo} valor={h.alturaSuelo} min={0} max={alto} unidad="cm"
          alCambiar={(n) => alCambiar({ alturaSuelo: n })} />
      )}
    </>
  )
}

function PropiedadesAbertura({ doc, a }: { doc: DocumentoDiseno; a: Abertura }) {
  const cambiar = (cambios: Partial<Puerta> | Partial<Ventana>) => intentar((d) => editarAbertura(d, a.id, cambios))
  return (
    <>
      <h2>{t.tipos[a.tipo]}</h2>
      <EnPared doc={doc} h={a} alCambiar={cambiar} />
      {a.tipo === 'puerta' ? (
        <>
          <Opciones etiqueta={t.hoja} valor={a.hoja} opciones={t.hojas} alCambiar={(hoja) => cambiar({ hoja })} />
          <Opciones etiqueta={t.bisagra} valor={a.bisagra} opciones={t.bisagras} alCambiar={(bisagra) => cambiar({ bisagra })} />
          <Opciones etiqueta={t.sentido} valor={a.abreHacia} opciones={t.sentidos} alCambiar={(abreHacia) => cambiar({ abreHacia })} />
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
      <h2>{t.tipos[e.tipo]}</h2>
      {e.tipo === 'columna' && (
        <>
          {coordenada(t.x, e.centro.x, (x) => cambiar({ centro: { ...e.centro, x } }))}
          {coordenada(t.y, e.centro.y, (y) => cambiar({ centro: { ...e.centro, y } }))}
          <CampoNumero etiqueta={t.ancho} valor={e.ancho} min={5} max={500} unidad="cm" alCambiar={(n) => cambiar({ ancho: n })} />
          <CampoNumero etiqueta={t.fondo} valor={e.fondo} min={5} max={500} unidad="cm" alCambiar={(n) => cambiar({ fondo: n })} />
          <CampoNumero etiqueta={t.giro} valor={e.rotacion} min={0} max={359} unidad="°" alCambiar={(n) => cambiar({ rotacion: n })} />
        </>
      )}
      {e.tipo === 'viga' && (
        <>
          <CampoNumero etiqueta={t.ancho} valor={e.ancho} min={5} max={500} unidad="cm" alCambiar={(n) => cambiar({ ancho: n })} />
          <CampoNumero etiqueta={t.canto} valor={e.canto} min={1} max={alto} unidad="cm" alCambiar={(n) => cambiar({ canto: n })} />
          {coordenada(t.desdeX, e.desde.x, (x) => cambiar({ desde: { ...e.desde, x } }))}
          {coordenada(t.desdeY, e.desde.y, (y) => cambiar({ desde: { ...e.desde, y } }))}
          {coordenada(t.hastaX, e.hasta.x, (x) => cambiar({ hasta: { ...e.hasta, x } }))}
          {coordenada(t.hastaY, e.hasta.y, (y) => cambiar({ hasta: { ...e.hasta, y } }))}
        </>
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
    <div className="panel__botones">
      <button type="button" onClick={() => quitar(id)}>{t.quitar}</button>
    </div>
  )
}

type CambiosElemento = Parameters<typeof editarElemento>[3]
type ValorVariante = DefinicionVariante['valores'][number]

const etiquetaValor = (v: ValorVariante): string =>
  typeof v === 'boolean' ? (v ? t.si : t.no) : typeof v === 'number' ? String(v) : capitalizar(v)

function CampoColor({ zona, valor, alCambiar }: { zona: ZonaColor; valor: string; alCambiar(color: string): void }) {
  const id = useId()
  return (
    <div className="panel__campo">
      <label htmlFor={id}>{zona.etiqueta}</label>
      <EntradaColor id={id} valor={valor} alCambiar={alCambiar} />
    </div>
  )
}

function PropiedadesElemento({ doc, e }: { doc: DocumentoDiseno; e: Elemento }) {
  const def = catalogoBase.get(e.tipo)
  if (!def) return null
  const editar = (cambios: CambiosElemento, grupo?: string) =>
    almacen.getState().cambiar((d) => editarElemento(d, catalogoBase, e.id, cambios), grupo)
  const medida = (clave: keyof Medidas, etiqueta: string) => (
    <CampoNumero etiqueta={etiqueta} valor={e.medidas[clave]} min={def.medidas[clave].min} max={def.medidas[clave].max} unidad="cm"
      alCambiar={(n) => editar({ medidas: { [clave]: n } })} />
  )
  return (
    <>
      <h2>{capitalizar(def.nombre)}</h2>
      {medida('ancho', t.ancho)}
      {medida('fondo', t.fondo)}
      {medida('alto', t.alto)}
      <CampoNumero etiqueta={t.giro} valor={e.rotacion} min={0} max={359} unidad="°" alCambiar={(n) => editar({ rotacion: n })} />
      {def.alturaSueloEditable && (
        <CampoNumero etiqueta={t.alturaSuelo} valor={e.alturaSuelo} min={0} max={Math.max(0, doc.estancia.alto - e.medidas.alto)} unidad="cm"
          alCambiar={(n) => editar({ alturaSuelo: n })} />
      )}
      {def.variantes.map((v) => (
        <Opciones key={v.clave} etiqueta={v.etiqueta} valor={String(valorVariante(def, e, v.clave))}
          opciones={Object.fromEntries(v.valores.map((x) => [String(x), etiquetaValor(x)]))}
          alCambiar={(s) => editar({ variantes: { [v.clave]: v.valores.find((x) => String(x) === s) ?? v.defecto } })} />
      ))}
      {def.zonasColor.map((z) => (
        <CampoColor key={z.clave} zona={z} valor={e.colores[z.clave] ?? z.defecto}
          alCambiar={(c) => editar({ colores: { [z.clave]: c } }, `color:${e.id}:${z.clave}`)} />
      ))}
      <div className="panel__botones">
        <button type="button" onClick={() => duplicar(e.id)}>{t.duplicar}</button>
        <button type="button" onClick={() => borrar(e.id)}>{t.borrar}</button>
      </div>
    </>
  )
}

/** Propiedades de lo seleccionado. En el paso 1: pared, esquina, abertura o estructura; en el paso 2, el elemento. */
export default function PanelPropiedades() {
  const doc = useEditor((e) => e.documento)
  const seleccion = useEditor((e) => e.seleccion)
  const paso = useEditor((e) => e.paso)
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
    if (e) contenido = <PropiedadesElemento key={e.id} doc={doc} e={e} />
  }

  return (
    <div className="panel-propiedades">
      {contenido ?? <p className="panel__nota">{paso === 1 ? t.nada : t.nadaElemento}</p>}
    </div>
  )
}
