import { subirVistaPrevia } from '../servidor'
import { quitarVistaPendiente, useVistaPendiente } from './colaDeVistasPrevias'
import GeneradorDeVistaPrevia from './GeneradorDeVistaPrevia'

/**
 * Vive en App, fuera de las rutas: hace y sube las vistas previas que quedaron pendientes al salir de un editor
 * (`RefrescoDeVistaPrevia` las encola). Una cada vez; un fallo se descarta sin avisar, como las demás subidas.
 */
export default function AnfitrionDeVistasPrevias() {
  const pendiente = useVistaPendiente()
  if (pendiente === null) return null
  return (
    <GeneradorDeVistaPrevia
      key={`${pendiente.id}:${pendiente.doc.formato}:${pendiente.doc.elementos.length}`}
      doc={pendiente.doc}
      alTerminar={(imagen) => {
        quitarVistaPendiente(pendiente)
        if (imagen) subirVistaPrevia(pendiente.id, imagen).catch(() => {})
      }}
    />
  )
}
