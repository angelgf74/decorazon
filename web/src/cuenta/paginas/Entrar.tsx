import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import Confirmar from '../../editor/comunes/Confirmar'
import type { DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import { descartarDisenoAnonimo, disenoAnonimo, subirDisenoAnonimo, yaEstaEnLaCuenta } from '../disenosLocales'
import { mensajeDeError } from '../errores'
import { rutaInterna, useSesion } from '../sesion'
import '../cuenta.css'

const t = textos.cuenta

/** Tras entrar con un diseño anónimo: se pregunta si guardarlo o se avisa de que no se pudo. */
type DisenoPendiente =
  | { tipo: 'pregunta'; doc: DocumentoDiseno; destino: string }
  | { tipo: 'subiendo'; destino: string }
  | { tipo: 'aviso'; mensaje: string; destino: string }

function mensajeTraido(estado: unknown): string | null {
  if (typeof estado !== 'object' || estado === null) return null
  const { mensaje } = estado as { mensaje?: unknown }
  return typeof mensaje === 'string' ? mensaje : null
}

export default function Entrar() {
  const [busqueda] = useSearchParams()
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const iniciarSesion = useSesion((s) => s.iniciarSesion)
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [pendiente, setPendiente] = useState<DisenoPendiente | null>(null)
  const aviso = busqueda.get('motivo') === 'caducada' ? t.entrar.caducada : mensajeTraido(ubicacion.state)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await iniciarSesion(correo, contrasena)
    } catch (err) {
      setError(mensajeDeError(err))
      setEnviando(false)
      return
    }
    const destino = rutaInterna(busqueda.get('volver')) ?? '/disenos'
    const doc = disenoAnonimo()
    if (doc === null) {
      navegar(destino, { replace: true })
    } else if (await yaEstaEnLaCuenta(doc)) {
      // Ya está en la cuenta desde el registro.
      descartarDisenoAnonimo()
      navegar(destino, { replace: true })
    } else {
      setPendiente({ tipo: 'pregunta', doc, destino })
    }
  }

  const guardar = async () => {
    if (pendiente?.tipo !== 'pregunta') return
    const { doc, destino } = pendiente
    setPendiente({ tipo: 'subiendo', destino })
    const r = await subirDisenoAnonimo(doc)
    if ('id' in r) navegar(`/disenos/${r.id}`, { replace: true })
    else setPendiente({ tipo: 'aviso', mensaje: r.error, destino })
  }

  const descartar = () => {
    if (pendiente === null) return
    descartarDisenoAnonimo()
    navegar(pendiente.destino, { replace: true })
  }

  if (pendiente?.tipo === 'aviso') {
    return (
      <main className="cuenta">
        <div className="cuenta__tarjeta">
          <h1>{t.entrar.titulo}</h1>
          <p className="cuenta__error" role="alert">{pendiente.mensaje}</p>
          <Link to={pendiente.destino} replace className="boton primario">{t.entrar.continuar}</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="cuenta">
      <form className="cuenta__tarjeta" method="post" noValidate onSubmit={enviar}>
        <h1>{t.entrar.titulo}</h1>
        {aviso && <p className="cuenta__aviso" role="status">{aviso}</p>}
        <label className="cuenta__campo">
          {t.correo}
          <input type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label className="cuenta__campo">
          {t.contrasena}
          <input type="password" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
        </label>
        {error && <p className="cuenta__error" role="alert">{error}</p>}
        <button type="submit" className="primario" disabled={enviando}>{enviando ? t.enviando : t.entrar.boton}</button>
        <p className="cuenta__enlaces">
          <Link to="/contrasena/olvido">{t.entrar.olvido}</Link>
          <Link to="/registro">{t.entrar.crearCuenta}</Link>
        </p>
      </form>
      <Confirmar
        abierto={pendiente?.tipo === 'pregunta'}
        mensaje={t.entrar.guardarAnonimo}
        textoAceptar={t.entrar.siGuardar}
        textoCancelar={t.entrar.noGuardar}
        alAceptar={() => void guardar()}
        alCancelar={descartar}
        // Escape no descarta: hay que elegir.
        alEscapar={() => {}}
      />
    </main>
  )
}
