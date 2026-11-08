import { useEffect, useMemo } from 'react'
import { escenaEstancia, materialDelSuelo, type DocumentoDiseno } from '../../nucleo'
import { geometriaSuelo } from './geometrias'
import { materialDe } from './materiales3d'
import Pieza, { type EventosPieza } from './Pieza'

interface Props {
  doc: DocumentoDiseno
  /** Paredes que no se pintan (ni sus huecos ni lo que va pegado a ellas). */
  ocultas: ReadonlySet<number>
  /** Si el suelo recibe la sombra dura del sol; con las sombras suaves de la captura, no (las pone `SombrasSuaves`). */
  sueloConSombra?: boolean
}

/** Muros, huecos y estructura tapan lo que hay detrás: ni seleccionan ni dejan pasar el clic (ni anulan la selección). */
const OCLUSOR: EventosPieza = {
  onClick: (e) => e.stopPropagation(),
  onPointerOver: (e) => e.stopPropagation(),
}

export default function Estancia3D({ doc, ocultas, sueloConSombra = true }: Props) {
  // `cambiar` recrea todas las referencias del documento: se memoriza por el contenido de lo que pinta la estancia,
  // para que editar un mueble no rehaga (ni libere) las geometrías de los muros.
  const clave = JSON.stringify({ estancia: doc.estancia, aberturas: doc.aberturas, estructura: doc.estructura })
  const { suelo, muros, huecos, estructura } = useMemo(() => {
    const partes = JSON.parse(clave) as Pick<DocumentoDiseno, 'estancia' | 'aberturas' | 'estructura'>
    return escenaEstancia({ formato: 1, elementos: [], ...partes })
  }, [clave])
  const geometriaDelSuelo = useMemo(() => geometriaSuelo(suelo), [suelo])
  useEffect(() => () => geometriaDelSuelo.dispose(), [geometriaDelSuelo])
  return (
    <group>
      <mesh receiveShadow={sueloConSombra} geometry={geometriaDelSuelo} material={materialDe(materialDelSuelo(doc.estancia.tipo), doc.estancia.colorSuelo)} />
      {/* Muros y huecos no proyectan: con el sol a 45° su sombra cubría media estancia y cambiaba al ocultar paredes. */}
      {[...muros, ...huecos].map((p, k) => (ocultas.has(p.pared) ? null : <Pieza key={k} pieza={p} eventos={OCLUSOR} proyecta={false} />))}
      {estructura.map((p, k) => (p.pared !== undefined && ocultas.has(p.pared) ? null : <Pieza key={`e${k}`} pieza={p} eventos={OCLUSOR} />))}
    </group>
  )
}
