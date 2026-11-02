import { useEffect, useRef, useState } from 'react'
import { almacen, useEditor } from '../../editor/estado/almacen'
import type { DocumentoDiseno } from '../../nucleo'
import { subirVistaPrevia } from '../servidor'
import { apuntarVistaPrevia, tocaRehacer } from './frecuencia'
import GeneradorDeVistaPrevia from './GeneradorDeVistaPrevia'

/**
 * En el editor de un diseño de la cuenta: si se comparte, cada guardado rehace la imagen de la tarjeta de su enlace
 * (como mucho una vez cada 5 minutos), en segundo plano. Un fallo no se enseña: la tarjeta seguirá con la anterior.
 */
export default function RefrescoDeVistaPrevia({ id, compartido }: { id: string; compartido: boolean }) {
  const version = useEditor((e) => (e.origen.tipo === 'servidor' && e.origen.id === id ? e.origen.version : null))
  // La versión con que se abrió no es un guardado.
  const alAbrir = useRef(version)
  const [doc, setDoc] = useState<DocumentoDiseno | null>(null)

  useEffect(() => {
    if (!compartido || version === null || version === alAbrir.current || doc !== null || !tocaRehacer(id)) return
    // Se apunta al empezar: otro guardado mientras se hace no lanza otra.
    apuntarVistaPrevia(id)
    // La imagen sale del documento recién guardado.
    // oxlint-disable-next-line react/set-state-in-effect
    setDoc(almacen.getState().documento)
  }, [id, compartido, version, doc])

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
