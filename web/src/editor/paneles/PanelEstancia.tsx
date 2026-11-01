import { useId, type ReactNode } from 'react'
import {
  anadirAbertura, anadirEstructura, cajaPlanta, editarEstancia, esRectangular, redimensionarRectangulo, TIPOS_ESTANCIA,
  type DocumentoDiseno, type Estancia, type ResultadoEdicion, type TipoEstancia,
} from '../../nucleo'
import { textos } from '../../textos'
import CampoNumero from '../comunes/CampoNumero'
import EntradaColor from '../comunes/EntradaColor'
import Icono from '../comunes/Icono'
import { almacen, useEditor } from '../estado/almacen'

const t = textos.estancia
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

/** Luminancia relativa (WCAG) de un color #rrggbb, para pintar encima la marca en claro u oscuro. */
function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

function SelectorColor({ etiqueta, valor, muestras, alCambiar }: {
  etiqueta: string; valor: string; muestras: string[]; alCambiar(color: string, grupo?: string): void
}) {
  const id = useId()
  return (
    <div className="selector-color">
      <label className="panel__etiqueta" htmlFor={id}>{etiqueta}</label>
      <div className="selector-color__fila">
        {muestras.map((m) => (
          <button
            key={m}
            type="button"
            className={`selector-color__muestra selector-color__muestra--${luminancia(m) < 0.35 ? 'oscura' : 'clara'}`}
            style={{ background: m }}
            aria-label={`${etiqueta} ${m}`}
            aria-pressed={valor.toLowerCase() === m}
            onClick={() => alCambiar(m)}
          />
        ))}
        <span className="selector-color__otro" title={t.otroColor}>
          <EntradaColor id={id} valor={valor} alCambiar={(c) => alCambiar(c, `color:${etiqueta}`)} />
        </span>
      </div>
    </div>
  )
}

const ANADIBLES: { tipo: Anadible; etiqueta: string }[] = [
  { tipo: 'puerta', etiqueta: t.anadirPuerta },
  { tipo: 'ventana', etiqueta: t.anadirVentana },
  { tipo: 'columna', etiqueta: t.anadirColumna },
  { tipo: 'viga', etiqueta: t.anadirViga },
  { tipo: 'radiador', etiqueta: t.anadirRadiador },
]

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="panel__seccion" aria-labelledby={id}>
      <h2 id={id} className="panel__titulo">{titulo}</h2>
      {children}
    </section>
  )
}

export default function PanelEstancia() {
  const estancia = useEditor((e) => e.documento?.estancia)
  const paredElegida = useEditor((e) => (e.seleccion?.tipo === 'pared' ? e.seleccion.indice : null))
  const idTipo = useId()
  if (!estancia) return null
  const { planta } = estancia
  const caja = cajaPlanta(planta)
  const ancho = Math.round(caja.maxX - caja.minX)
  const largo = Math.round(caja.maxY - caja.minY)
  const intentar = almacen.getState().intentar

  return (
    <div className="panel-estancia">
      <Seccion titulo={t.secciones.estancia}>
        <div className="panel__campo">
          <label className="panel__etiqueta" htmlFor={idTipo}>{t.tipo}</label>
          <select id={idTipo} value={estancia.tipo} onChange={(e) => cambiarEstancia({ tipo: e.target.value as TipoEstancia })}>
            {TIPOS_ESTANCIA.map((x) => <option key={x} value={x}>{textos.nuevaEstancia.tipos[x]}</option>)}
          </select>
        </div>
        {!esRectangular(planta) && <p className="panel__nota">{textos.edicion.noRectangular}</p>}
        <div className="panel__rejilla">
          {esRectangular(planta) && (
            <>
              <CampoNumero etiqueta={t.ancho} valor={ancho} min={100} max={2000} unidad="cm"
                alCambiar={(n) => intentar((d) => redimensionarRectangulo(d, n, largo))} />
              <CampoNumero etiqueta={t.largo} valor={largo} min={100} max={2000} unidad="cm"
                alCambiar={(n) => intentar((d) => redimensionarRectangulo(d, ancho, n))} />
            </>
          )}
          <CampoNumero etiqueta={t.alto} valor={estancia.alto} min={200} max={400} unidad="cm" alCambiar={(n) => intentar((d) => editarEstancia(d, { alto: n }))} />
          <CampoNumero etiqueta={t.grosor} valor={estancia.grosorPared} min={5} max={50} unidad="cm" alCambiar={(n) => intentar((d) => editarEstancia(d, { grosorPared: n }))} />
        </div>
      </Seccion>
      <Seccion titulo={t.secciones.acabados}>
        <SelectorColor etiqueta={t.colorParedes} valor={estancia.colorParedes} muestras={MUESTRAS_PAREDES}
          alCambiar={(c, g) => cambiarEstancia({ colorParedes: c }, g)} />
        <SelectorColor etiqueta={t.colorSuelo} valor={estancia.colorSuelo} muestras={MUESTRAS_SUELO}
          alCambiar={(c, g) => cambiarEstancia({ colorSuelo: c }, g)} />
      </Seccion>
      <Seccion titulo={t.secciones.anadir}>
        <div className="baldosas">
          {ANADIBLES.map(({ tipo, etiqueta }) => (
            <button key={tipo} type="button" className="baldosa" aria-label={etiqueta} onClick={() => anadir(tipo)}>
              <Icono nombre={tipo} />
              <span>{t.nombres[tipo]}</span>
            </button>
          ))}
        </div>
        <p className="panel__nota">{paredElegida === null ? t.dondeSeAnade : t.dondeSeAnadePared(paredElegida + 1)}</p>
      </Seccion>
    </div>
  )
}
