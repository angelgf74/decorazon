import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import { versionCargada } from '../recargaPorVersion'
import BotonDeSugerencia from '../sugerencias/BotonDeSugerencia'
import { textos } from '../textos'
import { almacen, seleccionDelPaso, useEditor } from './estado/almacen'
import { descargar, nombreDeFichero } from './comunes/descargar'
import CapturaFueraDePantalla from './hoja/CapturaFueraDePantalla'
import HojaImpresion from './hoja/HojaImpresion'
import type { DocumentoDiseno } from '../nucleo'
import { exportarDiseno } from './persistencia/fichero'
import BarraSuperior from './paneles/BarraSuperior'
import NuevaEstancia from './paneles/NuevaEstancia'
import AvisosDelPlano from './paneles/AvisosDelPlano'
import PanelCatalogo from './paneles/PanelCatalogo'
import PanelEstancia from './paneles/PanelEstancia'
import PanelPropiedades from './paneles/PanelPropiedades'
import Lienzo from './lienzo/Lienzo'
import AvisoVista3D from './comunes/AvisoVista3D'
import Icono from './comunes/Icono'
import SinFallos from './comunes/SinFallos'
import { useAtajos } from './usarAtajos'
import { precargarVista3D } from './vista3d/precargar'
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
  // En escritorio el panel derecho solo ocupa sitio cuando tiene algo que enseñar.
  const hayPanel = useEditor((e) => seleccionDelPaso(e.seleccion, e.paso))
  const [hoja, setHoja] = useState<Hoja | null>(null)
  const [imprimiendo, setImprimiendo] = useState(false)
  // «Descargar imagen 3D»: el diseño que se está capturando fuera de la pantalla, tal como estaba al pedirlo.
  const [docCaptura, setDocCaptura] = useState<DocumentoDiseno | null>(null)
  // Al cerrar la hoja para imprimir, el foco vuelve a donde estaba (el botón Imprimir).
  const focoAntes = useRef<HTMLElement | null>(null)
  // lazy guarda el import rechazado: tras un fallo se crea otro para que volver a pulsar 3D reintente la carga.
  const [Vista3D, setVista3D] = useState<ComponentType>(vista3dPerezosa)

  useEffect(() => {
    if (aviso === null) return
    const id = setTimeout(() => almacen.setState({ aviso: null }), MS_AVISO)
    return () => clearTimeout(id)
  }, [aviso])

  // Con el editor ya en pantalla, el 3D se carga en segundo plano y se usa tal cual: pulsar 3D no pasa por Suspense.
  // Si el 3D ya está abierto (se pulsó antes de que llegara), se deja el lazy: cambiar de componente lo remontaría entero.
  useEffect(() => precargarVista3D({
    alCargar: (modulo) => {
      versionCargada()
      if (almacen.getState().vista !== '3d') setVista3D(() => modulo.default)
    },
  }), [])

  // «Nuevo diseño» a mitad de una captura la anula: la estancia siguiente no descarga una imagen que nadie pidió.
  useEffect(() => almacen.subscribe((e, antes) => {
    if (e.documento === null && antes.documento !== null) setDocCaptura(null)
  }), [])

  if (!hayDocumento) return <NuevaEstancia />

  const alternar = (h: Hoja) => setHoja((actual) => (actual === h ? null : h))
  const abrirImpresion = () => {
    focoAntes.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setImprimiendo(true)
  }
  const cerrarImpresion = () => {
    setImprimiendo(false)
    focoAntes.current?.focus()
  }
  // Las descargas llevan el nombre del diseño (o «Mi diseño»), limpio para un fichero.
  const nombreDeDescarga = () => {
    const e = almacen.getState()
    return nombreDeFichero(e.origen.tipo === 'servidor' ? e.origen.nombre : textos.hoja.sinNombre)
  }
  const documento = () => almacen.getState().documento
  const descargarDiseno = () => {
    const doc = documento()
    if (doc) exportarDiseno(doc, nombreDeDescarga())
  }
  const descargarPlano = () => {
    const doc = documento()
    if (!doc) return
    // react-dom/server pesa: solo se carga al pedir el plano.
    void import('./hoja/exportarPlano')
      .then(({ exportarPlano }) => exportarPlano(doc))
      .then(({ blob, extension }) => descargar(`${nombreDeDescarga()} - plano.${extension}`, blob))
      .catch(() => almacen.setState({ aviso: textos.barra.noDescargado }))
  }

  return (
    <div className="editor">
      <BarraSuperior alImprimir={abrirImpresion} alDescargarImagen={() => setDocCaptura(documento())} preparandoImagen={docCaptura !== null}
        alDescargarPlano={descargarPlano} alDescargarDiseno={descargarDiseno} />
      <div className={`editor__cuerpo${hayPanel ? '' : ' editor__cuerpo--sin-panel'}`}>
        <aside className={`editor__izquierda hoja${hoja === 'izquierda' ? ' hoja--abierta' : ''}`}>
          {paso === 1 ? <PanelEstancia /> : <PanelCatalogo alEmpezarArrastre={() => setHoja(null)} />}
        </aside>
        <div className="editor__lienzo">
          {vista === '3d' ? (
            <SinFallos alternativa={<AvisoVista3D texto={textos.vista3d.sinCarga} />} alFallar={() => setVista3D(vista3dPerezosa)}>
              <Suspense fallback={textos.vista3d.cargando}><Vista3D /></Suspense>
            </SinFallos>
          ) : <Lienzo />}
          <div className="editor__avisos"><AvisosDelPlano /></div>
          <SelectorDeVista />
        </div>
        <aside className={`editor__derecha hoja${hoja === 'derecha' ? ' hoja--abierta' : ''}${hayPanel ? '' : ' editor__derecha--oculta'}`}>
          <PanelPropiedades />
        </aside>
      </div>
      <PestanasDeHojas paso={paso} hoja={hoja} alAlternar={alternar} />
      {aviso !== null && <p className="editor__aviso" role="status">{aviso}</p>}
      {imprimiendo && <HojaImpresion alCerrar={cerrarImpresion} />}
      {docCaptura && (
        <CapturaFueraDePantalla
          doc={docCaptura}
          alCapturar={(url) => { setDocCaptura(null); descargar(`${nombreDeDescarga()}.png`, url) }}
          alFallar={() => { setDocCaptura(null); almacen.setState({ aviso: textos.hoja.sin3d }) }}
        />
      )}
    </div>
  )
}

/** 2D/3D flota sobre el plano y sobre la vista 3D: está junto a lo que cambia, y el Lienzo se desmonta al pasar a 3D. */
function SelectorDeVista() {
  const vista = useEditor((e) => e.vista)
  const cambiarVista = useEditor((e) => e.cambiarVista)
  const t = textos.barra
  return (
    <div className="segmentado editor__vista" role="group" aria-label={t.vista}>
      <button type="button" aria-pressed={vista === '2d'} onClick={() => cambiarVista('2d')}>{t.vista2d}</button>
      <button type="button" aria-pressed={vista === '3d'} onClick={() => cambiarVista('3d')}>{t.vista3d}</button>
    </div>
  )
}

/** En móvil los paneles son hojas que suben desde abajo; estas pestañas, al alcance del pulgar, las abren. */
function PestanasDeHojas({ paso, hoja, alAlternar }: { paso: number; hoja: Hoja | null; alAlternar(h: Hoja): void }) {
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
      </button>
      {/* En móvil no cabe en la barra de arriba: va aquí, que solo existe en móvil. */}
      <BotonDeSugerencia className="pestanas__sugerencia" title={textos.sugerencias.pista}>
        <Icono nombre="sugerencia" />
        <span>{textos.sugerencias.abrir}</span>
      </BotonDeSugerencia>
    </nav>
  )
}
