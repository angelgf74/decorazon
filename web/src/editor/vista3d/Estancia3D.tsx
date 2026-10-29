import { useEffect, useMemo } from 'react'
import { escenaEstancia, type DocumentoDiseno } from '../../nucleo'
import { geometriaSuelo } from './geometrias'
import { materialDe } from './materiales3d'
import Pieza from './Pieza'

interface Props {
  doc: DocumentoDiseno
  /** Paredes que no se pintan (ni sus huecos). */
  ocultas: ReadonlySet<number>
}

export default function Estancia3D({ doc, ocultas }: Props) {
  const { suelo, muros, huecos, estructura } = useMemo(() => escenaEstancia(doc), [doc])
  const geometriaDelSuelo = useMemo(() => geometriaSuelo(suelo), [suelo])
  useEffect(() => () => geometriaDelSuelo.dispose(), [geometriaDelSuelo])
  return (
    <group>
      <mesh receiveShadow geometry={geometriaDelSuelo} material={materialDe('suelo', doc.estancia.colorSuelo)} />
      {[...muros, ...huecos].map((p, k) => (ocultas.has(p.pared) ? null : <Pieza key={k} pieza={p} />))}
      {estructura.map((p, k) => <Pieza key={`e${k}`} pieza={p} />)}
    </group>
  )
}
