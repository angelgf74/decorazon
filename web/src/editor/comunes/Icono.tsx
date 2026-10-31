import { TRAZADOS, type NombreIcono } from './iconos'

/** Icono decorativo: el nombre del control va siempre en su texto, visible o para lectores de pantalla. */
export default function Icono({ nombre }: { nombre: NombreIcono }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      {TRAZADOS[nombre].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
