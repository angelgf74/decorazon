import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { DocumentoDiseno } from '../../nucleo'
import SinFallos from '../comunes/SinFallos'
import { hayWebgl } from '../comunes/webgl'

// Con three: solo se carga al pedir una captura.
const Captura3D = lazy(() => import('../vista3d/Captura3D'))

/**
 * Tope del arranque: cargar el fragmento con three, compilar los shaders y hornear las sombras suaves antes del primer
 * fotograma. Sin GPU (SwiftShader, un móvil lento) y con la CPU ocupada pasaba de 8 s, y la hoja decía «no disponible»
 * cuando el 3D solo iba lento.
 */
const ESPERA_ARRANQUE_MS = 20_000

/** Desde el primer fotograma, si la vista 3D no llega a capturarse en este tiempo, se sigue sin ella. */
const ESPERA_3D_MS = 8000

interface Props {
  doc: DocumentoDiseno
  /** La imagen (PNG como URL de datos), una sola vez. */
  alCapturar(url: string): void
  /** Sin WebGL, si el 3D no carga o si tarda demasiado, una sola vez. */
  alFallar(): void
}

/**
 * Captura la vista 3D del diseño fuera de la pantalla (1200 × 800 a dpr 2: un PNG de 2400 × 1600, `.hoja-impresion__lienzo3d`)
 * y la entrega, o avisa de que no se puede. La usan la hoja para imprimir y «Descargar imagen 3D». Se desmonta en cuanto termina.
 */
export default function CapturaFueraDePantalla({ doc, alCapturar, alFallar }: Props) {
  // Sin WebGL no se monta la captura: montarla pediría el fragmento con three (~1 MB) para nada.
  const [conWebgl] = useState(hayWebgl)
  const hecho = useRef(false)
  const avisos = useRef({ alCapturar, alFallar })
  useEffect(() => {
    avisos.current = { alCapturar, alFallar }
  })
  const terminar = (url: string | null) => {
    if (hecho.current) return
    hecho.current = true
    if (url === null) avisos.current.alFallar()
    else avisos.current.alCapturar(url)
  }

  const tope = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reiniciarTope = (ms: number) => {
    clearTimeout(tope.current)
    tope.current = setTimeout(() => terminar(null), ms)
  }
  const primerFotograma = useRef(false)
  const alPrimerFotograma = () => {
    if (primerFotograma.current || hecho.current) return
    primerFotograma.current = true
    reiniciarTope(ESPERA_3D_MS)
  }

  useEffect(() => {
    if (!conWebgl) {
      terminar(null)
      return
    }
    reiniciarTope(ESPERA_ARRANQUE_MS)
    return () => clearTimeout(tope.current)
  }, [conWebgl])

  if (!conWebgl) return null
  return (
    <SinFallos alternativa={null} alFallar={() => terminar(null)}>
      <Suspense fallback={null}>
        <Captura3D doc={doc} alCapturar={terminar} alPrimerFotograma={alPrimerFotograma} dpr={2} />
      </Suspense>
    </SinFallos>
  )
}
