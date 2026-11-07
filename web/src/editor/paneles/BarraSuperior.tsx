import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { empezarDeNuevo, subirDisenoAnonimo } from '../../cuenta/disenosLocales'
import { useSesion } from '../../cuenta/sesion'
import DialogoDeSugerencia from '../../sugerencias/DialogoDeSugerencia'
import { textos } from '../../textos'
import { instalar, useEstadoDeInstalacion } from '../../instalacion'
import Confirmar from '../comunes/Confirmar'
import Icono from '../comunes/Icono'
import type { NombreIcono } from '../comunes/iconos'
import { useDesplegable } from '../comunes/usarDesplegable'
import { almacen, useEditor, type EstadoGuardado } from '../estado/almacen'
import { renombrar } from '../persistencia/sincronizacion'

const t = textos.barra

function textoDeGuardado(g: EstadoGuardado, delServidor: boolean): string {
  switch (g) {
    case 'guardado': return delServidor ? t.guardadoServidor : t.guardado
    case 'pendiente': return t.pendiente
    case 'sinConexion': return t.sinConexion
    case 'conflicto': return t.conflicto
    case 'error': return delServidor ? t.errorServidor : t.error
  }
}

function NombreDelDiseno({ nombre }: { nombre: string }) {
  const [valor, setValor] = useState(nombre)
  const cancelado = useRef(false)

  const confirmar = () => {
    if (cancelado.current) {
      cancelado.current = false
      return
    }
    if (valor.trim() === '') setValor(nombre)
    else renombrar(almacen, valor)
  }

  return (
    <input
      className="barra__nombre"
      aria-label={t.nombreDiseno}
      value={valor}
      maxLength={100}
      onChange={(e) => setValor(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') {
          cancelado.current = true
          setValor(nombre)
          e.currentTarget.blur()
        }
      }}
    />
  )
}

interface Opcion {
  icono: NombreIcono
  texto: string
  title?: string
  className?: string
  /** Una acción en marcha (preparar la imagen 3D): la opción se enseña pero no se puede volver a pulsar. */
  disabled?: boolean
  alElegir(): void
}

/**
 * Menú "Más acciones": lo que no es del diseño ni del paso. Al elegir una opción, el menú se cierra y el foco vuelve al
 * botón que lo abrió ANTES de ejecutar la acción, para que quien guarde `document.activeElement` (la hoja para imprimir)
 * tenga un sitio al que volver: la opción deja de existir al cerrarse el menú.
 */
function MenuMas({ opciones }: { opciones: Opcion[] }) {
  const { abierto, alternar, cerrar, raiz, disparador, alTeclear } = useDesplegable()

  // Al abrirse, el foco va a la primera opción.
  useEffect(() => {
    if (abierto) raiz.current?.querySelector<HTMLElement>('.menu__opcion')?.focus()
  }, [abierto, raiz])

  const alTeclearEnMenu = (e: KeyboardEvent<HTMLDivElement>) => {
    alTeclear(e)
    if (!abierto || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    e.preventDefault()
    const botones = [...(raiz.current?.querySelectorAll<HTMLElement>('.menu__opcion') ?? [])]
    const i = botones.indexOf(document.activeElement as HTMLElement)
    const paso = e.key === 'ArrowDown' ? 1 : -1
    botones[(i + paso + botones.length) % botones.length]?.focus()
  }

  return (
    <div ref={raiz} className="menu" onKeyDown={alTeclearEnMenu}>
      <button ref={disparador} type="button" className="boton-icono barra__mas" aria-label={t.mas} title={t.mas}
        aria-haspopup="true" aria-expanded={abierto} onClick={alternar}>
        <Icono nombre="puntos" />
      </button>
      {abierto && (
        <div className="menu__lista" role="group" aria-label={t.mas}>
          {opciones.map((o) => (
            <button key={o.texto} type="button" className={`menu__opcion${o.className ? ` ${o.className}` : ''}`} title={o.title}
              disabled={o.disabled} onClick={() => { cerrar(); o.alElegir() }}>
              <Icono nombre={o.icono} />{o.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  /** Abre la hoja para imprimir o guardar como PDF. */
  alImprimir?: () => void
  /** Descargas del menú; cada una existe solo si se pasa su función. */
  alDescargarImagen?: () => void
  /** Mientras se captura la imagen 3D: la opción lo dice y no se puede repetir. */
  preparandoImagen?: boolean
  alDescargarPlano?: () => void
  alDescargarDiseno?: () => void
}

export default function BarraSuperior({ alImprimir, alDescargarImagen, preparandoImagen = false, alDescargarPlano, alDescargarDiseno }: Props) {
  const paso = useEditor((e) => e.paso)
  const guardado = useEditor((e) => e.guardado)
  const nombreDiseno = useEditor((e) => (e.origen.tipo === 'servidor' ? e.origen.nombre : null))
  const hayPasado = useEditor((e) => e.pasado.length > 0)
  const hayFuturo = useEditor((e) => e.futuro.length > 0)
  const irAPaso = useEditor((e) => e.irAPaso)
  const deshacer = useEditor((e) => e.deshacer)
  const rehacer = useEditor((e) => e.rehacer)
  const haySesion = useSesion((s) => s.haySesion())
  const nombre = useSesion((s) => s.usuario?.nombre)
  const [confirmando, setConfirmando] = useState(false)
  const [sugiriendo, setSugiriendo] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  // «Instalar Decorazon» solo existe si el navegador lo permite ('aviso') o hay que explicar los pasos ('ios').
  const instalable = useEstadoDeInstalacion()
  const [explicandoIos, setExplicandoIos] = useState(false)
  const navegar = useNavigate()
  const puedeGuardarEnCuenta = useEditor((e) => e.origen.tipo === 'anonimo' && e.documento !== null) && haySesion

  const guardarEnCuenta = async () => {
    const doc = almacen.getState().documento
    if (doc === null) return
    setSubiendo(true)
    const r = await subirDisenoAnonimo(doc)
    if ('id' in r) {
      navegar(`/disenos/${r.id}`)
      return
    }
    setSubiendo(false)
    almacen.setState({ aviso: r.error })
  }

  const opciones: Opcion[] = [
    ...(nombreDiseno === null ? [{ icono: 'nuevo', texto: t.nuevoDiseno, alElegir: () => setConfirmando(true) } satisfies Opcion] : []),
    ...(alImprimir ? [{ icono: 'imprimir', texto: textos.hoja.imprimir, alElegir: alImprimir } satisfies Opcion] : []),
    ...(alDescargarImagen
      ? [{ icono: 'descargar', texto: preparandoImagen ? t.preparandoImagen : t.descargarImagen, disabled: preparandoImagen, alElegir: alDescargarImagen } satisfies Opcion]
      : []),
    ...(alDescargarPlano ? [{ icono: 'descargar', texto: t.descargarPlano, alElegir: alDescargarPlano } satisfies Opcion] : []),
    ...(alDescargarDiseno ? [{ icono: 'descargar', texto: t.descargarDiseno, alElegir: alDescargarDiseno } satisfies Opcion] : []),
    ...(instalable !== 'no'
      ? [{ icono: 'instalar', texto: t.instalar, alElegir: () => { if (instalable === 'ios') setExplicandoIos(true); else void instalar() } } satisfies Opcion]
      : []),
    // En móvil la sugerencia va en las pestañas de abajo (al alcance del pulgar): aquí se oculta por CSS.
    { icono: 'sugerencia', texto: textos.sugerencias.abrir, title: textos.sugerencias.pista, className: 'menu__sugerencia', alElegir: () => setSugiriendo(true) },
  ]
  const inicial = nombre?.trim().charAt(0).toUpperCase() ?? ''

  return (
    <header className="barra">
      <div className="barra__diseno">
        <Link to="/" className="barra__marca" aria-label={t.inicio} title={t.inicio}>
          <img src="/favicon.svg" alt="" width="28" height="28" />
        </Link>
        {nombreDiseno !== null && <NombreDelDiseno key={nombreDiseno} nombre={nombreDiseno} />}
        <p className={`barra__guardado barra__guardado--${guardado}`} role="status">
          {textoDeGuardado(guardado, nombreDiseno !== null)}
        </p>
      </div>

      <div className="barra__centro">
        <nav className="segmentado pasos" aria-label={t.pasos}>
          <button type="button" className="pasos__paso" aria-current={paso === 1 ? 'step' : undefined} onClick={() => irAPaso(1)}>
            <span className="pasos__numero">1</span> <span>{t.estancia}</span>
          </button>
          <button type="button" className="pasos__paso" aria-current={paso === 2 ? 'step' : undefined} onClick={() => irAPaso(2)}>
            <span className="pasos__numero">2</span> <span>{t.amueblar}</span>
          </button>
        </nav>
      </div>

      <div className="barra__acciones">
        <div className="barra__historial">
          <button type="button" className="boton-icono barra__plano" aria-label={t.deshacer} title={t.pistaDeshacer} disabled={!hayPasado} onClick={deshacer}>
            <Icono nombre="deshacer" />
          </button>
          <button type="button" className="boton-icono barra__plano" aria-label={t.rehacer} title={t.pistaRehacer} disabled={!hayFuturo} onClick={rehacer}>
            <Icono nombre="rehacer" />
          </button>
        </div>

        <MenuMas opciones={opciones} />

        <nav className="barra__cuenta" aria-label="Cuenta">
          {haySesion ? (
            <>
              {puedeGuardarEnCuenta && (
                <button type="button" className="primario" title={t.guardarEnCuenta} disabled={subiendo} onClick={() => void guardarEnCuenta()}>
                  <Icono nombre="guardar" /><span className="barra__texto">{t.guardarEnCuenta}</span>
                </button>
              )}
              <Link to="/disenos" className="boton barra__plano" title={t.misDisenos}><Icono nombre="disenos" /><span className="barra__texto">{t.misDisenos}</span></Link>
              <Link to="/cuenta" className="avatar" aria-label={nombre ?? t.miCuenta} title={nombre ?? t.miCuenta}>
                {inicial !== '' ? <span className="avatar__inicial" aria-hidden="true">{inicial}</span> : <Icono nombre="cuenta" />}
              </Link>
            </>
          ) : (
            <>
              <Link to="/registro" className="boton primario" title={t.guardar}><Icono nombre="guardar" /><span className="barra__texto">{t.guardar}</span></Link>
              <Link to="/entrar" className="boton barra__plano" title={t.entrar}><Icono nombre="cuenta" /><span className="barra__texto">{t.entrar}</span></Link>
            </>
          )}
        </nav>
      </div>

      <Confirmar
        abierto={confirmando}
        mensaje={t.confirmarNuevo}
        textoAceptar={textos.comun.aceptar}
        alAceptar={() => { setConfirmando(false); empezarDeNuevo() }}
        alCancelar={() => setConfirmando(false)}
      />
      {sugiriendo && <DialogoDeSugerencia alCerrar={() => setSugiriendo(false)} />}
      <Confirmar abierto={explicandoIos} mensaje={t.instalarIos} textoAceptar={textos.comun.entendido} soloAceptar
        alAceptar={() => setExplicandoIos(false)} alCancelar={() => setExplicandoIos(false)} />
    </header>
  )
}
