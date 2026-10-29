import { useId } from 'react'
import {
  anadirAbertura, anadirEstructura, esRectangular, redimensionarRectangulo,
  type DocumentoDiseno, type Estancia, type ResultadoEdicion, type TipoEstancia,
} from '../../nucleo'
import { textos } from '../../textos'
import CampoNumero from '../comunes/CampoNumero'
import EntradaColor from '../comunes/EntradaColor'
import { almacen, useEditor } from '../estado/almacen'

const t = textos.estancia
const TIPOS: TipoEstancia[] = ['dormitorio', 'salon', 'cocina']
const MUESTRAS_PAREDES = ['#f4f1ea', '#e9e1d3', '#d9cbb0', '#cfd8d3', '#e6d3cf', '#ffffff']
const MUESTRAS_SUELO = ['#c8a77e', '#a98462', '#8b6b4a', '#d9d4c7', '#9a9a96', '#e8e4dc']

type Anadible = 'puerta' | 'ventana' | 'columna' | 'viga' | 'radiador'

const cambiarEstancia = (cambios: Partial<Estancia>, grupo?: string) =>
  almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, ...cambios } }), grupo)

const ids = (d: DocumentoDiseno | null) => new Set([...(d?.aberturas ?? []), ...(d?.estructura ?? [])].map((x) => x.id))

/** Añade y deja seleccionado lo nuevo; puertas, ventanas y radiadores van a la pared seleccionada o a la 0. */
function anadir(tipo: Anadible) {
  const { seleccion, documento, intentar, seleccionar } = almacen.getState()
  const pared = seleccion?.tipo === 'pared' ? seleccion.indice : 0
  const f = (d: DocumentoDiseno): ResultadoEdicion =>
    tipo === 'puerta' || tipo === 'ventana' ? anadirAbertura(d, tipo, pared) : anadirEstructura(d, tipo, pared)
  const antes = ids(documento)
  if (!intentar(f)) return
  const nuevo = [...ids(almacen.getState().documento)].find((id) => !antes.has(id))
  if (nuevo) seleccionar({ tipo: tipo === 'puerta' || tipo === 'ventana' ? 'abertura' : 'estructura', id: nuevo })
}

function SelectorColor({ etiqueta, valor, muestras, alCambiar }: {
  etiqueta: string; valor: string; muestras: string[]; alCambiar(color: string, grupo?: string): void
}) {
  const id = useId()
  return (
    <div className="selector-color">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="selector-color__fila">
        <EntradaColor id={id} valor={valor} alCambiar={(c) => alCambiar(c, `color:${etiqueta}`)} />
        {muestras.map((m) => (
          <button
            key={m}
            type="button"
            className="selector-color__muestra"
            style={{ background: m }}
            aria-label={`${etiqueta} ${m}`}
            aria-pressed={valor.toLowerCase() === m}
            onClick={() => alCambiar(m)}
          />
        ))}
      </div>
    </div>
  )
}

export default function PanelEstancia() {
  const estancia = useEditor((e) => e.documento?.estancia)
  const idTipo = useId()
  if (!estancia) return null
  const { planta } = estancia
  const xs = planta.map((p) => p.x), ys = planta.map((p) => p.y)
  const ancho = Math.round(Math.max(...xs) - Math.min(...xs))
  const largo = Math.round(Math.max(...ys) - Math.min(...ys))
  const intentar = almacen.getState().intentar

  return (
    <div className="panel-estancia">
      <div className="panel__campo">
        <label htmlFor={idTipo}>{t.tipo}</label>
        <select id={idTipo} value={estancia.tipo} onChange={(e) => cambiarEstancia({ tipo: e.target.value as TipoEstancia })}>
          {TIPOS.map((x) => <option key={x} value={x}>{textos.nuevaEstancia.tipos[x]}</option>)}
        </select>
      </div>
      {esRectangular(planta) ? (
        <>
          <CampoNumero etiqueta={t.ancho} valor={ancho} min={100} max={2000} unidad="cm"
            alCambiar={(n) => intentar((d) => redimensionarRectangulo(d, n, largo))} />
          <CampoNumero etiqueta={t.largo} valor={largo} min={100} max={2000} unidad="cm"
            alCambiar={(n) => intentar((d) => redimensionarRectangulo(d, ancho, n))} />
        </>
      ) : (
        <p className="panel__nota">{textos.edicion.noRectangular}</p>
      )}
      <CampoNumero etiqueta={t.alto} valor={estancia.alto} min={200} max={400} unidad="cm" alCambiar={(n) => cambiarEstancia({ alto: n })} />
      <CampoNumero etiqueta={t.grosor} valor={estancia.grosorPared} min={5} max={50} unidad="cm" alCambiar={(n) => cambiarEstancia({ grosorPared: n })} />
      <SelectorColor etiqueta={t.colorParedes} valor={estancia.colorParedes} muestras={MUESTRAS_PAREDES}
        alCambiar={(c, g) => cambiarEstancia({ colorParedes: c }, g)} />
      <SelectorColor etiqueta={t.colorSuelo} valor={estancia.colorSuelo} muestras={MUESTRAS_SUELO}
        alCambiar={(c, g) => cambiarEstancia({ colorSuelo: c }, g)} />
      <div className="panel__botones">
        <button type="button" onClick={() => anadir('puerta')}>{t.anadirPuerta}</button>
        <button type="button" onClick={() => anadir('ventana')}>{t.anadirVentana}</button>
        <button type="button" onClick={() => anadir('columna')}>{t.anadirColumna}</button>
        <button type="button" onClick={() => anadir('viga')}>{t.anadirViga}</button>
        <button type="button" onClick={() => anadir('radiador')}>{t.anadirRadiador}</button>
      </div>
    </div>
  )
}
