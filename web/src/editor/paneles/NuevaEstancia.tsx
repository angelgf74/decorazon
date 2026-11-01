import { useState } from 'react'
import { TIPOS_ESTANCIA, type TipoEstancia } from '../../nucleo'
import { textos } from '../../textos'
import CampoNumero from '../comunes/CampoNumero'
import { useEditor } from '../estado/almacen'

const t = textos.nuevaEstancia

interface Props {
  // Si se da, entrega las medidas en lugar de crear la estancia en el almacén del editor.
  alCrear?(tipo: TipoEstancia, ancho: number, largo: number, alto: number): void
}

export default function NuevaEstancia({ alCrear }: Props) {
  const crearEnAlmacen = useEditor((e) => e.crear)
  const crear = alCrear ?? crearEnAlmacen
  const [tipo, setTipo] = useState<TipoEstancia>('dormitorio')
  const [ancho, setAncho] = useState(400)
  const [largo, setLargo] = useState(330)
  const [alto, setAlto] = useState(250)

  return (
    <form className="nueva-estancia" onSubmit={(e) => { e.preventDefault(); crear(tipo, ancho, largo, alto) }}>
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
      <button type="submit" className="primario">{t.crear}</button>
    </form>
  )
}
