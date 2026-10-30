import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { textos } from '../../textos'
import { mensajeDeError } from '../errores'
import { rutaInterna, useSesion } from '../sesion'
import '../cuenta.css'

const t = textos.cuenta

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
  const aviso = busqueda.get('motivo') === 'caducada' ? t.entrar.caducada : mensajeTraido(ubicacion.state)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await iniciarSesion(correo, contrasena)
      navegar(rutaInterna(busqueda.get('volver')) ?? '/disenos', { replace: true })
    } catch (err) {
      setError(mensajeDeError(err))
      setEnviando(false)
    }
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
    </main>
  )
}
