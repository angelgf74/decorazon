import { escalar, hueco, sumar, type Abertura, type DocumentoDiseno, type Punto } from '../../../nucleo'
import type { Seleccion } from '../../estado/almacen'
import { manejador, puntos, type AlPulsar } from './comun'

interface Props { documento: DocumentoDiseno; seleccion: Seleccion; alPulsar?: AlPulsar }

/** Lo que el hueco sobresale del muro por cada cara, para tapar el borde del trazo. */
const SOLAPE_CM = 0.5

const linea = (a: Punto, b: Punto, clase: string, discontinua = false) => (
  <line className={clase} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeDasharray={discontinua ? '6 4' : undefined} />
)

function Pieza({ a, documento }: { a: Abertura; documento: DocumentoDiseno }) {
  const { planta, grosorPared: g, colorSuelo } = documento.estancia
  const h = hueco(planta, a.pared, a.posicion)
  // p(t, s): t cm a lo largo de la pared desde el inicio del hueco, s cm hacia dentro (negativo: dentro del muro).
  const p = (t: number, s: number): Punto => sumar(sumar(h.cercano, escalar(h.d, t)), escalar(h.n, s))
  const w = a.ancho
  const vano = [p(0, SOLAPE_CM), p(w, SOLAPE_CM), p(w, -g - SOLAPE_CM), p(0, -g - SOLAPE_CM)]
  const jambas = (
    <>
      {linea(p(0, 0), p(0, -g), 'capa-aberturas__trazo')}
      {linea(p(w, 0), p(w, -g), 'capa-aberturas__trazo')}
    </>
  )

  if (a.tipo === 'ventana') {
    return (
      <>
        <polygon className="capa-aberturas__vano" points={puntos(vano)} fill="#fff" />
        {jambas}
        {linea(p(0, -g / 3), p(w, -g / 3), 'capa-aberturas__trazo')}
        {linea(p(0, (-2 * g) / 3), p(w, (-2 * g) / 3), 'capa-aberturas__trazo')}
        {a.abreHaciaDentro && (
          <polygon className="capa-aberturas__barrido" points={puntos([p(0, 0), p(w, 0), p(w, w / 2), p(0, w / 2)])} strokeDasharray="6 4" />
        )}
      </>
    )
  }

  if (a.hoja === 'corredera') {
    return (
      <>
        <polygon className="capa-aberturas__vano" points={puntos(vano)} fill={colorSuelo} />
        {jambas}
        {linea(p(0, -g / 3), p(w * 0.6, -g / 3), 'capa-aberturas__trazo')}
        {linea(p(w * 0.4, (-2 * g) / 3), p(w, (-2 * g) / 3), 'capa-aberturas__trazo')}
      </>
    )
  }

  // Abatible: bisagra en la cara interior (dentro) o exterior (fuera) del muro, en el lado de la bisagra.
  const dentro = a.abreHacia === 'dentro'
  const cara = dentro ? 0 : -g
  const sentido = dentro ? 1 : -1
  const tBisagra = a.bisagra === 'izquierda' ? 0 : w
  const tOtro = w - tBisagra
  const punta = p(tBisagra, cara + sentido * w)
  const cierre = p(tOtro, cara)
  const bisagra = p(tBisagra, cara)
  const giro = (punta.x - bisagra.x) * (cierre.y - bisagra.y) - (punta.y - bisagra.y) * (cierre.x - bisagra.x) > 0 ? 1 : 0
  return (
    <>
      <polygon className="capa-aberturas__vano" points={puntos(vano)} fill={colorSuelo} />
      {jambas}
      {linea(bisagra, punta, 'capa-aberturas__hoja')}
      <path
        className="capa-aberturas__barrido"
        d={`M${punta.x},${punta.y} A${w},${w} 0 0 ${giro} ${cierre.x},${cierre.y}`}
        strokeDasharray="6 4"
      />
    </>
  )
}

export default function CapaAberturas({ documento, seleccion, alPulsar }: Props) {
  return (
    <g className="capa-aberturas">
      {documento.aberturas.map((a) => {
        const elegida = seleccion?.tipo === 'abertura' && seleccion.id === a.id
        return (
          <g
            key={a.id}
            data-abertura={a.id}
            className={`capa-aberturas__pieza${elegida ? ' lienzo--seleccionado' : ''}${alPulsar ? ' lienzo--pulsable' : ''}`}
            onPointerDown={manejador(a.id, alPulsar)}
          >
            <Pieza a={a} documento={documento} />
          </g>
        )
      })}
    </g>
  )
}
