import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Object3D } from 'three'
import { cajaPlanta, camaraAPlano, camaraInicial, direccionSol, paredesQueTapan, type DocumentoDiseno, type Vec3 } from '../../nucleo'
import Estancia3D from './Estancia3D'
import Mueble3D from './Mueble3D'
import { useContextoRestaurado } from './usarContextoRestaurado'

const DISTANCIA_SOL_M = 15
const MARGEN_SOMBRA_M = 1

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

export default function Escena3D({ doc, ocultar, encuadres }: { doc: DocumentoDiseno; ocultar: boolean; encuadres: number }) {
  const [inicial] = useState(() => camaraInicial(doc))
  const camara = useThree((e) => e.camera)
  const controles = useRef<ComponentRef<typeof OrbitControls>>(null)
  const [ocultas, setOcultas] = useState(SIN_OCULTAS)
  const planta = doc.estancia.planta
  useContextoRestaurado()

  // Paredes entre la cámara y la estancia; solo cambia el estado si cambia el conjunto.
  const actualizarOcultas = useCallback(() => {
    const nuevas = ocultar ? new Set(paredesQueTapan(planta, camaraAPlano(camara.position.toArray()))) : SIN_OCULTAS
    // oxlint-disable-next-line react/set-state-in-effect
    setOcultas((previas) => (mismoConjunto(previas, nuevas) ? previas : nuevas))
  }, [ocultar, planta, camara])
  // Sincroniza con la cámara, que vive fuera de React.
  useEffect(actualizarOcultas, [actualizarOcultas])

  // "Encuadrar": la cámara vuelve a su posición inicial.
  const anterior = useRef(encuadres)
  useEffect(() => {
    if (anterior.current === encuadres) return
    anterior.current = encuadres
    const c = camaraInicial(doc)
    camara.position.set(...c.posicion)
    controles.current?.target.set(...c.objetivo)
    controles.current?.update()
  }, [encuadres, doc, camara])
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
      {/* Relleno (ambiente y entorno) moderado frente al sol: con más, la sombra de los muebles apenas se distinguía del suelo. */}
      <ambientLight intensity={0.25} />
      <primitive object={objetivoSol} position={centro} />
      <directionalLight
        intensity={2}
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
      <Environment resolution={64} environmentIntensity={0.7}>
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

