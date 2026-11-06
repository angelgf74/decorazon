import { useId, useState } from 'react'

interface Props {
  etiqueta: string
  valor: string
  /** Lo que se enseña en gris cuando no hay valor (el nombre del tipo, para un nombre propio). */
  placeholder?: string
  maxLength: number
  alCambiar(texto: string): void
}

/** Campo de texto corto que confirma al salir o con Enter; Escape restaura lo que había. Como CampoNumero, pero sin rango. */
export default function CampoTexto({ etiqueta, valor, placeholder, maxLength, alCambiar }: Props) {
  const [texto, setTexto] = useState(valor)
  const id = useId()

  const [valorVisto, setValorVisto] = useState(valor)
  if (valor !== valorVisto) {
    setValorVisto(valor)
    setTexto(valor)
  }

  function confirmar() {
    const limpio = texto.trim()
    if (limpio !== valor) alCambiar(limpio)
    else setTexto(valor)
  }

  return (
    <div className="panel__campo">
      <label htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        type="text"
        value={texto}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            confirmar()
          } else if (e.key === 'Escape') {
            e.stopPropagation()
            setTexto(valor)
          }
        }}
      />
    </div>
  )
}
