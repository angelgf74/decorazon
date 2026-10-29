import { useState } from 'react'
import type { TipoEstancia } from '../../nucleo'
import { textos } from '../../textos'
import CampoNumero from '../comunes/CampoNumero'
import { useEditor } from '../estado/almacen'

const t = textos.nuevaEstancia
const TIPOS: TipoEstancia[] = ['dormitorio', 'salon', 'cocina']

export default function NuevaEstancia() {
  const crear = useEditor((e) => e.crear)
  const [tipo, setTipo] = useState<TipoEstancia>('dormitorio')
  const [ancho, setAncho] = useState(400)
  const [largo, setLargo] = useState(330)
  const [alto, setAlto] = useState(250)

  return (
    <form className="nueva-estancia" onSubmit={(e) => { e.preventDefault(); crear(tipo, ancho, largo, alto) }}>
      <h1>{t.titulo}</h1>
      <fieldset>
        <legend>{t.tipo}</legend>
        {TIPOS.map((x) => (
          <label key={x} className="nueva-estancia__tipo">
            <input type="radio" name="tipo" value={x} checked={tipo === x} onChange={() => setTipo(x)} />
            {t.tipos[x]}
          </label>
        ))}
      </fieldset>
      <CampoNumero etiqueta={t.ancho} valor={ancho} min={100} max={2000} unidad="cm" alCambiar={setAncho} />
      <CampoNumero etiqueta={t.largo} valor={largo} min={100} max={2000} unidad="cm" alCambiar={setLargo} />
      <CampoNumero etiqueta={t.alto} valor={alto} min={200} max={400} unidad="cm" alCambiar={setAlto} />
      <button type="submit" className="primario">{t.crear}</button>
    </form>
  )
}
