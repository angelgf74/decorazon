import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Object3D } from 'three'
import { cajaPlanta, camaraAPlano, camaraInicial, paredesQueTapan, direccionSol, type DocumentoDiseno, type Vec3 } from '../../nucleo'
import { textos } from '../../textos'
import { useEditor } from '../estado/almacen'
import Estancia3D from './Estancia3D'
import Mueble3D from './Mueble3D'
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

const SIN_OCULTAS: ReadonlySet<number> = new Set()

function mismoConjunto(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  return a.size === b.size && [...a].every((i) => b.has(i))
}

/** Coloca la cámara una sola vez; luego la mueve el usuario con OrbitControls. */
function CamaraInicial({ posicion }: { posicion: Vec3 }) {
  const camara = useThree((e) => e.camera)
  useLayoutEffect(() => {
    camara.position.set(...posicion)
  }, [camara, posicion])
  return null
}

function Escena({ doc, ocultar, encuadres }: { doc: DocumentoDiseno; ocultar: boolean; encuadres: number }) {
  const [inicial] = useState(() => camaraInicial(doc))
  const camara = useThree((e) => e.camera)
  const controles = useRef<ComponentRef<typeof OrbitControls>>(null)
  const [ocultas, setOcultas] = useState(SIN_OCULTAS)
  const planta = doc.estancia.planta

  // Paredes entre la cámara y la estancia; solo cambia el estado si cambia el conjunto.
  const actualizarOcultas = useCallback(() => {
    const nuevas = ocultar ? new Set(paredesQueTapan(planta, camaraAPlano(camara.position.toArray()))) : SIN_OCULTAS
    setOcultas((previas) => (mismoConjunto(previas, nuevas) ? previas : nuevas))
  }, [ocultar, planta, camara])
  // Sincroniza con la cámara, que vive fuera de React.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(actualizarOcultas, [actualizarOcultas])

  // "Encuadrar": la cámara vuelve a su posición inicial.
  const primero = useRef(true)
  // Solo debe reaccionar a `encuadres`, no a los cambios del documento.
  useEffect(() => {
    if (primero.current) {
      primero.current = false
      return
    }
    const c = camaraInicial(doc)
    camara.position.set(...c.posicion)
    controles.current?.target.set(...c.objetivo)
    controles.current?.update()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [encuadres])
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
        ref={controles}
        makeDefault
        onChange={actualizarOcultas}
        target={inicial.objetivo}
        minDistance={distanciaMin}
        maxDistance={distanciaMax}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
      <Estancia3D doc={doc} ocultas={ocultas} />
      {doc.elementos.map((e) => <Mueble3D key={e.id} elemento={e} />)}
    </>
  )
}

export default function Vista3D() {
  const doc = useEditor((e) => e.documento)
  const cambiarVista = useEditor((e) => e.cambiarVista)
  const seleccionar = useEditor((e) => e.seleccionar)
  const [conWebgl] = useState(hayWebgl)
  const [ocultar, setOcultar] = useState(true)
  const [encuadres, setEncuadres] = useState(0)
  if (doc === null) return null

  const aviso = (
    <div className="vista3d__aviso" role="alert">
      <p>{t.sinWebgl}</p>
      <button type="button" onClick={() => cambiarVista('2d')}>{t.volver2d}</button>
    </div>
  )

  return (
    <div className="vista3d">
      {conWebgl && (
        <div className="vista3d__barra">
          <button type="button" aria-pressed={ocultar} onClick={() => setOcultar(!ocultar)}>{t.ocultarParedes}</button>
          <button type="button" onClick={() => setEncuadres(encuadres + 1)}>{t.encuadrar}</button>
        </div>
      )}
      {conWebgl ? (
        <SinFallos alternativa={aviso}>
          <Canvas shadows frameloop="demand" dpr={[1, 2]} camera={{ fov: 45 }} onPointerMissed={() => seleccionar(null)}>
            <Escena doc={doc} ocultar={ocultar} encuadres={encuadres} />
          </Canvas>
        </SinFallos>
      ) : aviso}
    </div>
  )
}
