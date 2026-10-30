import { textos } from '../../textos'
import { useEditor } from '../estado/almacen'

/** La vista 3D no está disponible: el texto y "Volver al 2D". */
export default function AvisoVista3D({ texto }: { texto: string }) {
  const cambiarVista = useEditor((e) => e.cambiarVista)
  return (
    <div className="vista3d__aviso" role="alert">
      <p>{texto}</p>
      <button type="button" onClick={() => cambiarVista('2d')}>{textos.vista3d.volver2d}</button>
    </div>
  )
}
