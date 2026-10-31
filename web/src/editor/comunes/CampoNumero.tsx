import { useId, useState } from 'react'

interface Props {
  etiqueta: string
  valor: number
  min: number
  max: number
  unidad?: string
  alCambiar(n: number): void
}

export default function CampoNumero({ etiqueta, valor, min, max, unidad, alCambiar }: Props) {
  const [texto, setTexto] = useState(String(valor))
  const id = useId()
  const idAyuda = `${id}-ayuda`

  const [valorVisto, setValorVisto] = useState(valor)
  if (valor !== valorVisto) {
    setValorVisto(valor)
    setTexto(String(valor))
  }

  function confirmar() {
    const limpio = texto.trim()
    if (!/^-?\d+$/.test(limpio)) {
      setTexto(String(valor))
      return
    }
    const n = Math.min(max, Math.max(min, Number(limpio)))
    setTexto(String(valor))
    if (n !== valor) alCambiar(n)
  }

  return (
    <div className="campo-numero">
      <label className="campo-numero__etiqueta" htmlFor={id}>{etiqueta}</label>
      <span className={`campo-numero__control${unidad ? ' campo-numero__control--unidad' : ''}`}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={texto}
          aria-describedby={idAyuda}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmar()
            }
            else if (e.key === 'Escape') setTexto(String(valor))
          }}
        />
        {/* La unidad ya va en la ayuda de rango, que el campo anuncia con aria-describedby. */}
        {unidad && <span className="campo-numero__unidad" aria-hidden="true">{unidad}</span>}
      </span>
      <small id={idAyuda} className="campo-numero__ayuda">{`${min}–${max}${unidad ? ` ${unidad}` : ''}`}</small>
    </div>
  )
}
