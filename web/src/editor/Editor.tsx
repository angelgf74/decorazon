import { useEffect, useState } from 'react'
import { almacen, useEditor } from './estado/almacen'
import BarraSuperior, { type Hoja } from './paneles/BarraSuperior'
import NuevaEstancia from './paneles/NuevaEstancia'
import ListaAvisos from './paneles/ListaAvisos'
import PanelCatalogo from './paneles/PanelCatalogo'
import PanelEstancia from './paneles/PanelEstancia'
import PanelPropiedades from './paneles/PanelPropiedades'
import Lienzo from './lienzo/Lienzo'
import { useAtajos } from './usarAtajos'
import './editor.css'

const MS_AVISO = 4000

export default function Editor() {
  useAtajos()
  const hayDocumento = useEditor((e) => e.documento !== null)
  const paso = useEditor((e) => e.paso)
  const aviso = useEditor((e) => e.aviso)
  const [hoja, setHoja] = useState<Hoja | null>(null)

  useEffect(() => {
    if (aviso === null) return
    const id = setTimeout(() => almacen.setState({ aviso: null }), MS_AVISO)
    return () => clearTimeout(id)
  }, [aviso])

  if (!hayDocumento) return <NuevaEstancia />

  const alternar = (h: Hoja) => setHoja((actual) => (actual === h ? null : h))

  return (
    <div className="editor">
      <BarraSuperior hojaAbierta={hoja} alAlternarHoja={alternar} />
      <div className="editor__cuerpo">
        <aside className={`editor__izquierda hoja${hoja === 'izquierda' ? ' hoja--abierta' : ''}`}>
          {paso === 1 ? <PanelEstancia /> : <PanelCatalogo />}
        </aside>
        <div className="editor__lienzo"><Lienzo /></div>
        <aside className={`editor__derecha hoja${hoja === 'derecha' ? ' hoja--abierta' : ''}`}>
          <PanelPropiedades />
          <ListaAvisos />
        </aside>
      </div>
      {aviso !== null && <p className="editor__aviso" role="status">{aviso}</p>}
    </div>
  )
}
