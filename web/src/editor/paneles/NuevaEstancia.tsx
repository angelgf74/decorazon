import { useId, useState } from 'react'
import { ESQUINAS, plantaDeForma, TIPOS_ESTANCIA, type Esquina, type FormaDePlanta, type TipoEstancia } from '../../nucleo'
import { textos } from '../../textos'
import CampoNumero from '../comunes/CampoNumero'
import { useEditor } from '../estado/almacen'

const t = textos.nuevaEstancia

interface Props {
  // Si se da, entrega las medidas en lugar de crear la estancia en el almacén del editor.
  alCrear?(tipo: TipoEstancia, ancho: number, largo: number, alto: number, forma: FormaDePlanta): void
}

/** Margen del dibujo de la planta, en unidades de su viewBox (cm). */
const MARGEN_DIBUJO_CM = 20

/** La planta que saldrá, a escala, para ver dónde cae el entrante antes de crearla. */
function DibujoDePlanta({ ancho, largo, forma }: { ancho: number; largo: number; forma: FormaDePlanta }) {
  const puntos = plantaDeForma(ancho, largo, forma).map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <svg className="nueva-estancia__dibujo" viewBox={`${-MARGEN_DIBUJO_CM} ${-MARGEN_DIBUJO_CM} ${ancho + 2 * MARGEN_DIBUJO_CM} ${largo + 2 * MARGEN_DIBUJO_CM}`} aria-hidden="true" focusable="false">
      <polygon points={puntos} />
    </svg>
  )
}

export default function NuevaEstancia({ alCrear }: Props) {
  const crearEnAlmacen = useEditor((e) => e.crear)
  const crear = alCrear ?? crearEnAlmacen
  const [tipo, setTipo] = useState<TipoEstancia>('dormitorio')
  const [ancho, setAncho] = useState(400)
  const [largo, setLargo] = useState(330)
  const [alto, setAlto] = useState(250)
  const [enEle, setEnEle] = useState(false)
  // El entrante empieza en un tercio de cada medida; se edita solo con la L elegida.
  const [entranteAncho, setEntranteAncho] = useState(Math.round(400 / 3))
  const [entranteLargo, setEntranteLargo] = useState(Math.round(330 / 3))
  const [esquina, setEsquina] = useState<Esquina>('abajo-derecha')
  const idEsquina = useId()
  const forma: FormaDePlanta = enEle ? { forma: 'ele', entranteAncho, entranteLargo, esquina } : { forma: 'rectangulo' }

  return (
    <form className="nueva-estancia" onSubmit={(e) => { e.preventDefault(); crear(tipo, ancho, largo, alto, forma) }}>
      <h1>{t.titulo}</h1>
      <fieldset>
        <legend>{t.tipo}</legend>
        {TIPOS_ESTANCIA.map((x) => (
          <label key={x} className="nueva-estancia__tipo">
            <input type="radio" name="tipo" value={x} checked={tipo === x} onChange={() => setTipo(x)} />
            {t.tipos[x]}
          </label>
        ))}
      </fieldset>
      <CampoNumero etiqueta={t.ancho} valor={ancho} min={100} max={2000} unidad="cm" alCambiar={setAncho} />
      <CampoNumero etiqueta={t.largo} valor={largo} min={100} max={2000} unidad="cm" alCambiar={setLargo} />
      <CampoNumero etiqueta={t.alto} valor={alto} min={200} max={400} unidad="cm" alCambiar={setAlto} />
      <fieldset>
        <legend>{t.forma}</legend>
        <div className="nueva-estancia__forma">
          <div>
            <label className="nueva-estancia__tipo">
              <input type="radio" name="forma" value="rectangulo" checked={!enEle} onChange={() => setEnEle(false)} />
              {t.formas.rectangulo}
            </label>
            <label className="nueva-estancia__tipo">
              <input type="radio" name="forma" value="ele" checked={enEle} onChange={() => setEnEle(true)} />
              {t.formas.ele}
            </label>
          </div>
          <DibujoDePlanta ancho={ancho} largo={largo} forma={forma} />
        </div>
        {enEle && (
          <>
            <CampoNumero etiqueta={t.entranteAncho} valor={entranteAncho} min={50} max={Math.max(50, ancho - 50)} unidad="cm" alCambiar={setEntranteAncho} />
            <CampoNumero etiqueta={t.entranteLargo} valor={entranteLargo} min={50} max={Math.max(50, largo - 50)} unidad="cm" alCambiar={setEntranteLargo} />
            <div className="panel__campo">
              <label htmlFor={idEsquina}>{t.esquina}</label>
              <select id={idEsquina} value={esquina} onChange={(e) => setEsquina(e.target.value as Esquina)}>
                {ESQUINAS.map((x) => <option key={x} value={x}>{t.esquinas[x]}</option>)}
              </select>
            </div>
          </>
        )}
      </fieldset>
      <button type="submit" className="primario">{t.crear}</button>
    </form>
  )
}
