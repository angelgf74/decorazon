import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Box3, Vector3, type Group, type OrthographicCamera } from 'three'
import { catalogoBase, elementoNuevo, piezasDeElemento, type DefinicionTipo } from '../nucleo'
import Pieza from '../editor/vista3d/Pieza'
import { firmaDelModelo } from './firma'

/**
 * Página de desarrollo que pinta la miniatura 3D de cada tipo del catálogo. La maneja `npm run miniaturas`
 * (scripts/generar-miniaturas.mjs) con `window.miniaturas`; no entra en el build (solo se construye index.html).
 * Lo que cambie aquí cómo se ve una miniatura (luces, cámara) pide subir `VERSION_DEL_DIBUJO` en `firma.ts`.
 */

interface ApiMiniaturas {
  tipos(): { id: string; firma: string }[]
  /** PNG de `LADO_PX` × `LADO_PX` con fondo transparente, como URL de datos. */
  dibujar(id: string): Promise<string>
}

declare global {
  interface Window { miniaturas?: ApiMiniaturas }
}

const LADO_PX = 768
/** Tres cuartos desde delante a la izquierda y algo por encima: el frente del mueble mira a +z en la escena. */
const DIRECCION = new Vector3(-0.6, 0.65, 1).normalize()
/** Aire alrededor del mueble, en fracción de lo que ocupa; el script recorta después. */
const MARGEN = 0.04
/** Fotogramas antes de capturar: el entorno de drei se pinta en los primeros. */
const FOTOGRAMAS = 8
/** Dirección fija del «sol» de los Lightformer, como la de `Escena3D` con una ventana arriba a la izquierda. */
const SOL: [number, number, number] = [-0.45, 0.75, 0.5]

/** `vez` cuenta las peticiones: dibujar dos veces seguidas el mismo tipo vuelve a montar el mueble y su cuenta de fotogramas. */
interface Peticion { def: DefinicionTipo; vez: number; resolver(url: string): void }

/** Encuadra la cámara ortográfica a la caja del mueble vista desde `DIRECCION`, con el mismo ancho que alto. */
function encuadrar(camara: OrthographicCamera, grupo: Group) {
  grupo.updateWorldMatrix(true, true)
  const caja = new Box3().setFromObject(grupo)
  const centro = caja.getCenter(new Vector3())
  const radio = caja.getSize(new Vector3()).length() / 2 || 1
  camara.position.copy(centro).addScaledVector(DIRECCION, radio * 4)
  camara.up.set(0, 1, 0)
  camara.lookAt(centro)
  camara.updateMatrixWorld()
  const vista = camara.matrixWorldInverse
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const x of [caja.min.x, caja.max.x]) for (const y of [caja.min.y, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) {
    const p = new Vector3(x, y, z).applyMatrix4(vista)
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  const medio = (Math.max(maxX - minX, maxY - minY) / 2) * (1 + MARGEN)
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  camara.left = cx - medio; camara.right = cx + medio; camara.top = cy + medio; camara.bottom = cy - medio
  camara.near = 0.01; camara.far = radio * 8
  camara.zoom = 1
  camara.updateProjectionMatrix()
}

function Mueble({ peticion }: { peticion: Peticion }) {
  const { def } = peticion
  const piezas = useMemo(() => piezasDeElemento(elementoNuevo(def, { x: 0, y: 0 }, 'miniatura'), def), [def])
  const grupo = useRef<Group>(null)
  const camara = useThree((e) => e.camera) as OrthographicCamera
  const n = useRef(0)
  useLayoutEffect(() => {
    if (grupo.current) encuadrar(camara, grupo.current)
  }, [camara, piezas])
  useFrame(({ gl }) => {
    n.current += 1
    if (n.current === FOTOGRAMAS) peticion.resolver(gl.domElement.toDataURL('image/png'))
  })
  return (
    <group ref={grupo}>
      {piezas.map((p, k) => <Pieza key={k} pieza={p} proyecta={false} />)}
    </group>
  )
}

export default function Generador() {
  const [peticion, setPeticion] = useState<Peticion | null>(null)
  const veces = useRef(0)
  useEffect(() => {
    window.miniaturas = {
      tipos: () => [...catalogoBase.values()].map((def) => ({ id: def.id, firma: firmaDelModelo(def) })),
      dibujar: (id) => new Promise((resolver, rechazar) => {
        const def = catalogoBase.get(id)
        if (!def) rechazar(new Error(`No existe el tipo ${id}`))
        else setPeticion({ def, vez: ++veces.current, resolver })
      }),
    }
  }, [])
  return (
    <div style={{ width: LADO_PX, height: LADO_PX }}>
      <Canvas orthographic dpr={1} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}>
        {/* Como en Escena3D, pero sin sombras: en 112 px de alto no se verían y el mueble va sin suelo. */}
        <ambientLight intensity={0.35} />
        {/* Desde delante a la derecha: arriba, frente y lado izquierdo quedan con tres tonos y un mueble blanco no sale plano. */}
        <directionalLight intensity={2} position={[1.5, 4, 3]} />
        <Environment resolution={64} environmentIntensity={0.7}>
          <Lightformer name="techo" form="rect" intensity={1.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer name="ventana" form="rect" intensity={2} position={[SOL[0] * 5, SOL[1] * 5, SOL[2] * 5]} scale={[4, 3, 1]} target={[0, 0, 0]} />
          <Lightformer name="relleno" form="rect" intensity={0.5} position={[-SOL[0] * 5, 1, -SOL[2] * 5]} scale={[6, 3, 1]} target={[0, 0, 0]} />
        </Environment>
        {peticion && <Mueble key={peticion.vez} peticion={peticion} />}
      </Canvas>
    </div>
  )
}
