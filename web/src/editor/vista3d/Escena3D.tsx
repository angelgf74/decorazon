import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Object3D, Vector3, type DirectionalLight } from 'three'
import { cajaPlanta, camaraAPlano, camaraDesdeDentro, camaraInicial, direccionSol, paredesQueTapan, type DocumentoDiseno, type Vec3 } from '../../nucleo'
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

/** Desde dentro se mira alrededor de un punto a un metro: sin zoom ni desplazamiento, y del suelo al techo. */
const DISTANCIA_DENTRO_M = 1
const POLAR_DENTRO = 0.3

interface Props {
  doc: DocumentoDiseno
  ocultar: boolean
  encuadres: number
  sinResaltes?: boolean
  /** La cámara dentro de la estancia, como al entrar por la puerta (M-09). */
  desdeDentro?: boolean
}

export default function Escena3D({ doc, ocultar, encuadres, sinResaltes = false, desdeDentro = false }: Props) {
  const [inicial] = useState(() => camaraInicial(doc))
  const camara = useThree((e) => e.camera)
  const invalidate = useThree((e) => e.invalidate)
  const controles = useRef<ComponentRef<typeof OrbitControls>>(null)
  const [ocultas, setOcultas] = useState(SIN_OCULTAS)
  const planta = doc.estancia.planta
  useContextoRestaurado()

  // Paredes entre la cámara y la estancia; solo cambia el estado si cambia el conjunto. Desde dentro, ninguna.
  const actualizarOcultas = useCallback(() => {
    const nuevas = ocultar && !desdeDentro ? new Set(paredesQueTapan(planta, camaraAPlano(camara.position.toArray()))) : SIN_OCULTAS
    // oxlint-disable-next-line react/set-state-in-effect
    setOcultas((previas) => (mismoConjunto(previas, nuevas) ? previas : nuevas))
  }, [ocultar, desdeDentro, planta, camara])
  // Sincroniza con la cámara, que vive fuera de React.
  useEffect(actualizarOcultas, [actualizarOcultas])

  // "Encuadrar" y entrar o salir: la cámara va a la posición inicial del modo (fuera, la de siempre; dentro, la puerta).
  const anterior = useRef({ encuadres, desdeDentro })
  useEffect(() => {
    if (anterior.current.encuadres === encuadres && anterior.current.desdeDentro === desdeDentro) return
    anterior.current = { encuadres, desdeDentro }
    const c = desdeDentro ? camaraDesdeDentro(doc) : camaraInicial(doc)
    camara.position.set(...c.posicion)
    controles.current?.target.set(...c.objetivo)
    controles.current?.update()
    invalidate()
  }, [encuadres, desdeDentro, doc, camara, invalidate])
  const [objetivoSol] = useState(() => new Object3D())
  const { distanciaMin, distanciaMax, objetivo } = camaraInicial(doc)
  const c = cajaPlanta(doc.estancia.planta)
  const centro: Vec3 = [(c.minX + c.maxX) / 200, 0, (c.minY + c.maxY) / 200]
  // Esfera que envuelve la estancia: la cámara de sombras la abarca entera.
  const ancho = (c.maxX - c.minX) / 100, fondo = (c.maxY - c.minY) / 100
  const radio = Math.hypot(ancho / 2 + MARGEN_SOMBRA_M, fondo / 2 + MARGEN_SOMBRA_M, doc.estancia.alto / 100)
  const sol = direccionSol(doc)
  const posicionSol = centro.map((v, k) => v + sol[k] * DISTANCIA_SOL_M) as Vec3

  // R3F asigna los límites de la cámara de sombras pero no recalcula su proyección: sin esto la sombra se quedaba con el tamaño viejo.
  const luz = useRef<DirectionalLight>(null)
  const [cx, , cz] = centro
  useLayoutEffect(() => {
    const l = luz.current
    if (!l) return
    l.shadow.camera.updateProjectionMatrix()
    l.shadow.needsUpdate = true
    invalidate()
  }, [radio, cx, cz, invalidate])

  // Si cambia la caja de la planta (no al editar muebles), el objetivo va al nuevo centro y la cámara lo acompaña.
  const [ox, oy, oz] = objetivo
  const objetivoPrevio = useRef(inicial.objetivo)
  useEffect(() => {
    const [px, py, pz] = objetivoPrevio.current
    if (px === ox && py === oy && pz === oz) return
    objetivoPrevio.current = [ox, oy, oz]
    const c = controles.current
    if (!c) return
    const desplazamiento = new Vector3(ox, oy, oz).sub(c.target)
    c.target.add(desplazamiento)
    camara.position.add(desplazamiento)
    c.update()
    invalidate()
  }, [ox, oy, oz, camara, invalidate])

  return (
    <>
      {/* Relleno (ambiente y entorno) moderado frente al sol: con más, la sombra de los muebles apenas se distinguía del suelo. */}
      <ambientLight intensity={0.25} />
      <primitive object={objetivoSol} position={centro} />
      <directionalLight
        ref={luz}
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
      {/* drei pinta los Lightformer una sola vez: la key lo vuelve a montar cuando las ventanas cambian la dirección del sol. */}
      <Environment key={sol.map((v) => v.toFixed(3)).join(',')} resolution={64} environmentIntensity={0.7}>
        <Lightformer name="techo" form="rect" intensity={1.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer name="ventana" form="rect" intensity={2} position={[sol[0] * 5, sol[1] * 5, sol[2] * 5]} scale={[4, 3, 1]} target={[0, 0, 0]} />
        <Lightformer name="relleno" form="rect" intensity={0.5} position={[-sol[0] * 5, 1, -sol[2] * 5]} scale={[6, 3, 1]} target={[0, 0, 0]} />
      </Environment>
      <CamaraInicial posicion={inicial.posicion} />
      {desdeDentro ? (
        // Girar la cabeza: orbitar a 1 m fijo alrededor del punto que se mira. Con el objetivo delante, el sentido por
        // defecto ya es el natural (arrastrar a la derecha mira a la derecha); más lento para que un giro sea fino.
        <OrbitControls
          ref={controles}
          makeDefault
          onChange={actualizarOcultas}
          target={inicial.objetivo}
          enableZoom={false}
          enablePan={false}
          minDistance={DISTANCIA_DENTRO_M}
          maxDistance={DISTANCIA_DENTRO_M}
          minPolarAngle={POLAR_DENTRO}
          maxPolarAngle={Math.PI - POLAR_DENTRO}
          rotateSpeed={0.5}
        />
      ) : (
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
      )}
      <Estancia3D doc={doc} ocultas={ocultas} />
      {doc.elementos.map((e) => <Mueble3D key={e.id} elemento={e} sinResaltes={sinResaltes} />)}
    </>
  )
}

