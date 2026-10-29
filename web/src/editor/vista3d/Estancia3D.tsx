import { useEffect, useMemo } from 'react'
import { escenaEstancia, type DocumentoDiseno } from '../../nucleo'
import { geometriaSuelo } from './geometrias'
import { materialDe } from './materiales3d'
import Pieza from './Pieza'

export default function Estancia3D({ doc }: { doc: DocumentoDiseno }) {
  const { suelo, muros, huecos, estructura } = useMemo(() => escenaEstancia(doc), [doc])
  const geometriaDelSuelo = useMemo(() => geometriaSuelo(suelo), [suelo])
  useEffect(() => () => geometriaDelSuelo.dispose(), [geometriaDelSuelo])
  return (
    <group>
      <mesh receiveShadow geometry={geometriaDelSuelo} material={materialDe('suelo', doc.estancia.colorSuelo)} />
      {[...muros, ...huecos, ...estructura].map((p, k) => <Pieza key={k} pieza={p} />)}
    </group>
  )
}
