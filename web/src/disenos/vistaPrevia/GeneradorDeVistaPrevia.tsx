import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import SinFallos from '../../editor/comunes/SinFallos'
import { hayWebgl } from '../../editor/comunes/webgl'
import './vistaPrevia.css'
import type { DocumentoDiseno } from '../../nucleo'

// Con three: solo se carga al hacer una vista previa.
const Captura3D = lazy(() => import('../../editor/vista3d/Captura3D'))

/** El tamaño de las tarjetas grandes de WhatsApp, Facebook o X, y el fondo de la web bajo la escena. */
const ANCHO = 1200
const ALTO = 630
const FONDO = '#fbf5ee'
const CALIDAD = 0.85
/** Si la captura no llega en este tiempo, se deja sin vista previa. */
const ESPERA_MS = 10_000

/** La captura (PNG, ya de 1200×630) en JPEG sobre el fondo de la web; null si el navegador no puede. */
async function aJpeg(dataUrl: string): Promise<Blob | null> {
  const imagen = new Image()
  imagen.src = dataUrl
  await imagen.decode()
  const lienzo = document.createElement('canvas')
  lienzo.width = ANCHO
  lienzo.height = ALTO
  const ctx = lienzo.getContext('2d')
  if (!ctx) return null
  // El lienzo 3D es transparente fuera de la escena: sin fondo, en JPEG saldría negro.
  ctx.fillStyle = FONDO
  ctx.fillRect(0, 0, ANCHO, ALTO)
  const k = Math.max(ANCHO / imagen.width, ALTO / imagen.height)
  const w = imagen.width * k, h = imagen.height * k
  ctx.drawImage(imagen, (ANCHO - w) / 2, (ALTO - h) / 2, w, h)
  return new Promise((ok) => lienzo.toBlob(ok, 'image/jpeg', CALIDAD))
}

/**
 * Hace, fuera de la pantalla, la vista previa del diseño para la tarjeta de su enlace: la escena 3D desde la cámara
 * inicial, como en la hoja para imprimir. Entrega la imagen una sola vez, o null sin WebGL, si falla o si tarda.
 */
export default function GeneradorDeVistaPrevia({ doc, alTerminar }: { doc: DocumentoDiseno; alTerminar(imagen: Blob | null): void }) {
  const [conWebgl] = useState(hayWebgl)
  const hecho = useRef(false)
  const aviso = useRef(alTerminar)
  useEffect(() => {
    aviso.current = alTerminar
  })
  const terminar = useCallback((imagen: Blob | null) => {
    if (hecho.current) return
    hecho.current = true
    aviso.current(imagen)
  }, [])

  useEffect(() => {
    if (!conWebgl) {
      terminar(null)
      return
    }
    const id = setTimeout(() => terminar(null), ESPERA_MS)
    return () => clearTimeout(id)
  }, [conWebgl, terminar])

  if (!conWebgl) return null
  return (
    <SinFallos alternativa={null} alFallar={() => terminar(null)}>
      <Suspense fallback={null}>
        {/* Sombras duras: es una miniatura, y el horneado de las suaves rozaba los 10 s en el CI (SwiftShader, tres trabajos a la vez). */}
        <Captura3D doc={doc} className="vista-previa__lienzo3d" sombras="duras" alCapturar={(url) => { aJpeg(url).then(terminar, () => terminar(null)) }} />
      </Suspense>
    </SinFallos>
  )
}
