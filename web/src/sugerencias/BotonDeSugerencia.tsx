import { useState, type ReactNode } from 'react'
import DialogoDeSugerencia from './DialogoDeSugerencia'

interface Props {
  className?: string
  title?: string
  children: ReactNode
}

/** Botón que abre el diálogo de sugerencias. Lo usan la barra del editor y el pie del inicio. */
export default function BotonDeSugerencia({ className, title, children }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button type="button" className={className} title={title} onClick={() => setAbierto(true)}>{children}</button>
      {abierto && <DialogoDeSugerencia alCerrar={() => setAbierto(false)} />}
    </>
  )
}
