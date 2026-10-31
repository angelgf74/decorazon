import { lazy, Suspense, useEffect, useState } from 'react'
import { versionCargada } from '../recargaPorVersion'
import { textos } from '../textos'
import { almacen, useEditor } from './estado/almacen'
import BarraSuperior from './paneles/BarraSuperior'
import NuevaEstancia from './paneles/NuevaEstancia'
import ListaAvisos from './paneles/ListaAvisos'
import PanelCatalogo from './paneles/PanelCatalogo'
import PanelEstancia from './paneles/PanelEstancia'
import PanelPropiedades from './paneles/PanelPropiedades'
import Lienzo from './lienzo/Lienzo'
import AvisoVista3D from './comunes/AvisoVista3D'
import Icono from './comunes/Icono'
import SinFallos from './comunes/SinFallos'
import { useConflictos } from './estado/conflictos'
import { useAtajos } from './usarAtajos'
import './editor.css'

const MS_AVISO = 4000

type Hoja = 'izquierda' | 'derecha'

const vista3dPerezosa = () =>
  lazy(() =>
    import('./vista3d/Vista3D').then((modulo) => {
      versionCargada()
      return modulo
    }),
  )

export default function Editor() {
  useAtajos()
  const hayDocumento = useEditor((e) => e.documento !== null)
  const paso = useEditor((e) => e.paso)
  const aviso = useEditor((e) => e.aviso)
  const vista = useEditor((e) => e.vista)
  const [hoja, setHoja] = useState<Hoja | null>(null)
  // lazy guarda el import rechazado: tras un fallo se crea otro para que volver a pulsar 3D reintente la carga.
  const [Vista3D, setVista3D] = useState(vista3dPerezosa)

  useEffect(() => {
    if (aviso === null) return
    const id = setTimeout(() => almacen.setState({ aviso: null }), MS_AVISO)
    return () => clearTimeout(id)
  }, [aviso])

  if (!hayDocumento) return <NuevaEstancia />

  const alternar = (h: Hoja) => setHoja((actual) => (actual === h ? null : h))

  return (
    <div className="editor">
      <BarraSuperior />
      <div className="editor__cuerpo">
        <aside className={`editor__izquierda hoja${hoja === 'izquierda' ? ' hoja--abierta' : ''}`}>
          {paso === 1 ? <PanelEstancia /> : <PanelCatalogo />}
        </aside>
        <div className="editor__lienzo">
          {vista === '3d' ? (
            <SinFallos alternativa={<AvisoVista3D texto={textos.vista3d.sinCarga} />} alFallar={() => setVista3D(vista3dPerezosa)}>
              <Suspense fallback={textos.vista3d.cargando}><Vista3D /></Suspense>
            </SinFallos>
          ) : <Lienzo />}
        </div>
        <aside className={`editor__derecha hoja${hoja === 'derecha' ? ' hoja--abierta' : ''}`}>
          <PanelPropiedades />
          <ListaAvisos />
        </aside>
      </div>
      <PestanasDeHojas paso={paso} hoja={hoja} alAlternar={alternar} />
      {aviso !== null && <p className="editor__aviso" role="status">{aviso}</p>}
    </div>
  )
}

/** En móvil los paneles son hojas que suben desde abajo; estas pestañas, al alcance del pulgar, las abren. */
function PestanasDeHojas({ paso, hoja, alAlternar }: { paso: number; hoja: Hoja | null; alAlternar(h: Hoja): void }) {
  const avisos = useConflictos().length
  const t = textos.barra
  return (
    <nav className="editor__pestanas" aria-label={t.paneles}>
      <button type="button" aria-expanded={hoja === 'izquierda'} onClick={() => alAlternar('izquierda')}>
        <Icono nombre={paso === 1 ? 'estancia' : 'catalogo'} />
        <span>{paso === 1 ? t.estancia : t.catalogo}</span>
      </button>
      <button type="button" aria-expanded={hoja === 'derecha'} onClick={() => alAlternar('derecha')}>
        <Icono nombre="propiedades" />
        <span>{t.propiedades}</span>
        {avisos > 0 && (
          <span className="insignia">
            <span aria-hidden="true">{avisos}</span>
            <span className="solo-lectores">{`, ${t.avisos(avisos)}`}</span>
          </span>
        )}
      </button>
    </nav>
  )
}
