import { useEffect, useMemo } from 'react'
import { escenaEstancia, type DocumentoDiseno } from '../../nucleo'
import { geometriaSuelo } from './geometrias'
import { materialDe } from './materiales3d'
import Pieza, { type EventosPieza } from './Pieza'

interface Props {
  doc: DocumentoDiseno
  /** Paredes que no se pintan (ni sus huecos). */
  ocultas: ReadonlySet<number>
}

/** Muros, huecos y estructura tapan lo que hay detrás: ni seleccionan ni dejan pasar el clic (ni anulan la selección). */
const OCLUSOR: EventosPieza = {
  onClick: (e) => e.stopPropagation(),
  onPointerOver: (e) => e.stopPropagation(),
}

export default function Estancia3D({ doc, ocultas }: Props) {
  const { suelo, muros, huecos, estructura } = useMemo(() => escenaEstancia(doc), [doc])
  const geometriaDelSuelo = useMemo(() => geometriaSuelo(suelo), [suelo])
  useEffect(() => () => geometriaDelSuelo.dispose(), [geometriaDelSuelo])
  return (
    <group>
      <mesh receiveShadow geometry={geometriaDelSuelo} material={materialDe('suelo', doc.estancia.colorSuelo)} />
      {[...muros, ...huecos].map((p, k) => (ocultas.has(p.pared) ? null : <Pieza key={k} pieza={p} eventos={OCLUSOR} />))}
      {estructura.map((p, k) => <Pieza key={`e${k}`} pieza={p} eventos={OCLUSOR} />)}
    </group>
  )
}
