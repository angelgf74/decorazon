import { useEffect, useRef, useState } from 'react'
import { almacen, useEditor } from '../../editor/estado/almacen'
import type { DocumentoDiseno } from '../../nucleo'
import { obtenerDiseno, subirVistaPrevia } from '../servidor'
import { apuntarVistaPrevia, msHastaRehacer } from './frecuencia'
import GeneradorDeVistaPrevia from './GeneradorDeVistaPrevia'

/**
 * En el editor de un diseño de la cuenta: si se comparte, los guardados rehacen la imagen de la tarjeta de su enlace,
 * en segundo plano y como mucho una vez cada 5 minutos. Los que caen dentro de la espera se juntan en una al vencer,
 * con lo último guardado. Un fallo no se enseña: la tarjeta seguirá con la imagen anterior.
 *
 * `compartido`: null si no se sabe (se abrió sin conexión); el primer guardado lo pregunta. Compartir desde otra
 * pestaña con el editor abierto no se ve hasta volver a abrirlo.
 */
export default function RefrescoDeVistaPrevia({ id, compartido }: { id: string; compartido: boolean | null }) {
  const version = useEditor((e) => (e.origen.tipo === 'servidor' && e.origen.id === id ? e.origen.version : null))
  // La última versión ya tratada: al empezar, la de apertura (abrir no es guardar).
  const tratada = useRef(version)
  const [averiguado, setAveriguado] = useState<boolean | null>(null)
  const preguntando = useRef(false)
  const [despertador, setDespertador] = useState(0)
  const [doc, setDoc] = useState<DocumentoDiseno | null>(null)
  const seComparte = compartido ?? averiguado

  useEffect(() => {
    if (version === null || version === tratada.current || doc !== null || seComparte === false) return
    if (seComparte === null) {
      if (!preguntando.current) {
        preguntando.current = true
        obtenerDiseno(id).then((r) => setAveriguado(r.diseno.enlace != null), () => { preguntando.current = false })
      }
      return
    }
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
  }, [id, version, doc, seComparte, despertador])

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
