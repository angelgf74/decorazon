import { Component, useLayoutEffect, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Object3D } from 'three'
import { cajaPlanta, camaraInicial, direccionSol, type DocumentoDiseno, type Vec3 } from '../../nucleo'
import { textos } from '../../textos'
import { useEditor } from '../estado/almacen'
import Estancia3D from './Estancia3D'
import './vista3d.css'

const t = textos.vista3d
const DISTANCIA_SOL_M = 15
const MARGEN_SOMBRA_M = 1

function hayWebgl(): boolean {
  try {
    const lienzo = document.createElement('canvas')
    const contexto = lienzo.getContext('webgl2') ?? lienzo.getContext('webgl')
    contexto?.getExtension('WEBGL_lose_context')?.loseContext()
    return contexto !== null
  } catch {
    return false
  }
}

class SinFallos extends Component<{ alternativa: ReactNode; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() {
    return { fallo: true }
  }
  render() {
    return this.state.fallo ? this.props.alternativa : this.props.children
  }
}

/** Coloca la cámara una sola vez; luego la mueve el usuario con OrbitControls. */
function CamaraInicial({ posicion }: { posicion: Vec3 }) {
  const camara = useThree((e) => e.camera)
  useLayoutEffect(() => {
    camara.position.set(...posicion)
  }, [camara, posicion])
  return null
}

function Escena({ doc }: { doc: DocumentoDiseno }) {
  const [inicial] = useState(() => camaraInicial(doc))
  const [objetivoSol] = useState(() => new Object3D())
  const { distanciaMin, distanciaMax } = camaraInicial(doc)
  const c = cajaPlanta(doc.estancia.planta)
  const centro: Vec3 = [(c.minX + c.maxX) / 200, 0, (c.minY + c.maxY) / 200]
  // Esfera que envuelve la estancia: la cámara de sombras la abarca entera.
  const ancho = (c.maxX - c.minX) / 100, fondo = (c.maxY - c.minY) / 100
  const radio = Math.hypot(ancho / 2 + MARGEN_SOMBRA_M, fondo / 2 + MARGEN_SOMBRA_M, doc.estancia.alto / 100)
  const sol = direccionSol(doc)
  const posicionSol = centro.map((v, k) => v + sol[k] * DISTANCIA_SOL_M) as Vec3

  return (
    <>
      <ambientLight intensity={0.35} />
      <primitive object={objetivoSol} position={centro} />
      <directionalLight
        intensity={1.6}
        position={posicionSol}
        target={objetivoSol}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-radio}
        shadow-camera-right={radio}
        shadow-camera-top={radio}
        shadow-camera-bottom={-radio}
        shadow-camera-near={Math.max(0.1, DISTANCIA_SOL_M - radio)}
        shadow-camera-far={DISTANCIA_SOL_M + radio}
      />
      <Environment resolution={64}>
        <Lightformer name="techo" form="rect" intensity={1.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer name="ventana" form="rect" intensity={2} position={[sol[0] * 5, sol[1] * 5, sol[2] * 5]} scale={[4, 3, 1]} target={[0, 0, 0]} />
        <Lightformer name="relleno" form="rect" intensity={0.5} position={[-sol[0] * 5, 1, -sol[2] * 5]} scale={[6, 3, 1]} target={[0, 0, 0]} />
      </Environment>
      <CamaraInicial posicion={inicial.posicion} />
      <OrbitControls
        makeDefault
        target={inicial.objetivo}
        minDistance={distanciaMin}
        maxDistance={distanciaMax}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
      <Estancia3D doc={doc} />
    </>
  )
}

export default function Vista3D() {
  const doc = useEditor((e) => e.documento)
  const cambiarVista = useEditor((e) => e.cambiarVista)
  const [conWebgl] = useState(hayWebgl)
  if (doc === null) return null

  const aviso = (
    <div className="vista3d__aviso" role="alert">
      <p>{t.sinWebgl}</p>
      <button type="button" onClick={() => cambiarVista('2d')}>{t.volver2d}</button>
    </div>
  )

  return (
    <div className="vista3d">
      {conWebgl ? (
        <SinFallos alternativa={aviso}>
          <Canvas shadows frameloop="demand" dpr={[1, 2]} camera={{ fov: 45 }}>
            <Escena doc={doc} />
          </Canvas>
        </SinFallos>
      ) : aviso}
    </div>
  )
}
