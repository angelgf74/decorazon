import { lazy, Suspense, useCallback, useEffect, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ErrorDeApi } from '../../api/cliente'
import { empezarAnonimoCon, sustituiriaDisenoAnonimo } from '../../cuenta/disenosLocales'
import { mensajeDeError } from '../../cuenta/errores'
import { useSesion } from '../../cuenta/sesion'
import Confirmar from '../../editor/comunes/Confirmar'
import SinFallos from '../../editor/comunes/SinFallos'
import { hayWebgl } from '../../editor/comunes/webgl'
import PlanoDelDiseno from '../../editor/hoja/PlanoDelDiseno'
import TablaDeMuebles from '../../editor/hoja/TablaDeMuebles'
import { cajaPlanta } from '../../nucleo'
import { textos } from '../../textos'
import { crearDiseno, obtenerCompartido, type DisenoCompartido } from '../servidor'
import './compartido.css'

const t = textos.compartir

// Con three (~1 MB): solo se carga cuando se pide verla.
const Vista3DSoloVer = lazy(() => import('../../editor/vista3d/Vista3DSoloVer'))

const LONGITUD_MAXIMA_NOMBRE = 100
const SUFIJO_COPIA = ' (copia)'

/** «Nombre (copia)», recortando el nombre (sin partir caracteres) si no cabe. */
function nombreDeCopia(nombre: string): string {
  let base = nombre
  while ((base + SUFIJO_COPIA).length > LONGITUD_MAXIMA_NOMBRE) base = Array.from(base).slice(0, -1).join('')
  return base + SUFIJO_COPIA
}

function fechaLarga(iso: string): string | null {
  const instante = Date.parse(iso)
  return Number.isNaN(instante) ? null : new Date(instante).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; diseno: DisenoCompartido }
  | { tipo: 'noFunciona' }
  | { tipo: 'error'; mensaje: string }

/** Un diseño compartido, para verlo sin sesión: plano, 3D y lista de muebles, y hacer una copia. */
export default function VistaCompartida() {
  const { enlace = '' } = useParams()
  const navegar = useNavigate()
  const haySesion = useSesion((s) => s.haySesion())
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  // Un id por visita: si la respuesta del alta se pierde y se reintenta, no se crea otra copia.
  const [idDeCopia] = useState(() => crypto.randomUUID())
  const [conWebgl] = useState(hayWebgl)
  // La 3D no se monta hasta pedirla: en el móvil, sus controles se quedarían el gesto de desplazar la página.
  const [ver3d, setVer3d] = useState(false)
  const idPlano = useId()
  const id3d = useId()
  const idMuebles = useId()

  const cargar = useCallback(async () => {
    try {
      setEstado({ tipo: 'listo', diseno: await obtenerCompartido(enlace) })
    } catch (e) {
      if (e instanceof ErrorDeApi && e.estado === 404) setEstado({ tipo: 'noFunciona' })
      // Sin conexión, el mensaje de comprobarla; otro rechazo de la API (429), el suyo.
      else setEstado({ tipo: 'error', mensaje: e instanceof ErrorDeApi && e.estado !== 0 ? mensajeDeError(e) : t.noCarga })
    }
  }, [enlace])

  useEffect(() => {
    // El diseño viene del servidor: se pide al montar la página.
    // oxlint-disable-next-line react/set-state-in-effect
    void cargar()
  }, [cargar])

  if (estado.tipo === 'cargando') return <main className="compartido"><p role="status">{t.cargando}</p></main>

  if (estado.tipo !== 'listo') {
    return (
      <main className="compartido compartido--mensaje">
        {estado.tipo === 'noFunciona' ? (
          <>
            <h1>{t.noFunciona}</h1>
            <p>{t.noFuncionaDetalle}</p>
          </>
        ) : (
          <>
            <h1>{t.noSeVe}</h1>
            <p role="alert">{estado.mensaje}</p>
            <button type="button" className="primario" onClick={() => { setEstado({ tipo: 'cargando' }); void cargar() }}>{t.reintentar}</button>
          </>
        )}
        <Link to="/">{t.irAlInicio}</Link>
      </main>
    )
  }

  const { diseno } = estado
  const doc = diseno.contenido
  const { estancia } = doc
  const caja = cajaPlanta(estancia.planta)
  const fecha = fechaLarga(diseno.fechaDeModificacion)

  const copiarEnElNavegador = () => {
    empezarAnonimoCon(doc)
    navegar('/disenar')
  }

  const hacerCopia = async () => {
    setAviso(null)
    if (!haySesion) {
      // Sin sesión, la copia es el diseño del navegador: si ya hay uno con algo, se pregunta antes de sustituirlo.
      if (sustituiriaDisenoAnonimo()) setConfirmando(true)
      else copiarEnElNavegador()
      return
    }
    setOcupado(true)
    try {
      const copia = await crearDiseno(nombreDeCopia(diseno.nombre), doc, idDeCopia)
      navegar(`/disenos/${copia.id}`)
    } catch (e) {
      setAviso(mensajeDeError(e))
      setOcupado(false)
    }
  }

  return (
    <main className="compartido">
      <header className="compartido__portada">
        <Link to="/" className="compartido__marca"><img src="/favicon.svg" alt="" width="28" height="28" />Decorazon</Link>
        <h1>{diseno.nombre}</h1>
        <p className="compartido__datos">
          {`${textos.nuevaEstancia.tipos[estancia.tipo]} · ${textos.hoja.dimensiones(Math.round(caja.maxX - caja.minX), Math.round(caja.maxY - caja.minY), estancia.alto)}`}
        </p>
        {fecha && <p className="compartido__datos">{t.actualizado(fecha)}</p>}
        <div className="compartido__copia">
          <button type="button" className="primario" disabled={ocupado} aria-busy={ocupado} onClick={() => void hacerCopia()}>{t.hacerCopia}</button>
          <p>{t.explicacionCopia}</p>
        </div>
        {aviso && <p className="compartido__aviso" role="alert">{aviso}</p>}
      </header>

      <section className="compartido__seccion" aria-labelledby={idPlano}>
        <h2 id={idPlano}>{textos.hoja.plano}</h2>
        <PlanoDelDiseno doc={doc} rayado="compartido-rayado" className="compartido__plano" />
      </section>

      <section className="compartido__seccion" aria-labelledby={id3d}>
        <h2 id={id3d}>{textos.hoja.vista3d}</h2>
        <div className={`compartido__3d${ver3d ? ' compartido__3d--abierta' : ''}`}>
          {!conWebgl ? <p>{textos.hoja.sin3d}</p> : !ver3d ? (
            <div className="compartido__ver3d">
              <button type="button" className="primario" onClick={() => setVer3d(true)}>{t.ver3d}</button>
              <p>{t.ver3dDetalle}</p>
            </div>
          ) : (
            <SinFallos alternativa={<p>{textos.hoja.sin3d}</p>}>
              <Suspense fallback={<p>{textos.hoja.preparando3d}</p>}>
                <Vista3DSoloVer doc={doc} />
              </Suspense>
            </SinFallos>
          )}
        </div>
      </section>

      <section className="compartido__seccion" aria-labelledby={idMuebles}>
        <h2 id={idMuebles}>{textos.hoja.muebles}</h2>
        <TablaDeMuebles doc={doc} />
      </section>

      <footer className="compartido__pie">
        {t.hechoCon} · <Link to="/">{t.disenaElTuyo}</Link>
      </footer>

      <Confirmar
        abierto={confirmando}
        mensaje={t.confirmarSustituir}
        textoAceptar={t.sustituir}
        alAceptar={() => { setConfirmando(false); copiarEnElNavegador() }}
        alCancelar={() => setConfirmando(false)}
      />
    </main>
  )
}
