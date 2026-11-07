import { useEffect, useRef, useState } from 'react'
import { almacen, useEditor } from '../../editor/estado/almacen'
import type { DocumentoDiseno } from '../../nucleo'
import { subirVistaPrevia } from '../servidor'
import { apuntarVistaPrevia, msHastaRehacer } from './frecuencia'
import GeneradorDeVistaPrevia from './GeneradorDeVistaPrevia'

/**
 * En el editor de un diseño de la cuenta: los guardados rehacen su imagen (la miniatura de «Mis diseños» y, si se
 * comparte, la tarjeta de su enlace), en segundo plano y como mucho una vez cada 5 minutos. Los que caen dentro de la
 * espera se juntan en una al vencer, con lo último guardado. Un fallo no se enseña: queda la imagen anterior.
 */
export default function RefrescoDeVistaPrevia({ id }: { id: string }) {
  const version = useEditor((e) => (e.origen.tipo === 'servidor' && e.origen.id === id ? e.origen.version : null))
  // La última versión ya tratada: al empezar, la de apertura (abrir no es guardar).
  const tratada = useRef(version)
  const [despertador, setDespertador] = useState(0)
  const [doc, setDoc] = useState<DocumentoDiseno | null>(null)

  useEffect(() => {
    if (version === null || version === tratada.current || doc !== null) return
    const espera = msHastaRehacer(id)
    if (espera > 0) {
      // Dentro de la espera: se vuelve a mirar al vencer, con lo que se haya guardado para entonces.
      const temporizador = setTimeout(() => setDespertador((n) => n + 1), espera)
      return () => clearTimeout(temporizador)
    }
    tratada.current = version
    apuntarVistaPrevia(id)
    // La imagen sale del documento recién guardado.
    // oxlint-disable-next-line react/set-state-in-effect
    setDoc(almacen.getState().documento)
  }, [id, version, doc, despertador])

  if (doc === null) return null
  return (
    <GeneradorDeVistaPrevia
      doc={doc}
      alTerminar={(imagen) => {
        setDoc(null)
        if (imagen) subirVistaPrevia(id, imagen).catch(() => {})
      }}
    />
  )
}
