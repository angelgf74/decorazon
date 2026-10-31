import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { api, ErrorDeApi, exigir } from '../../api/cliente'
import { textos } from '../../textos'
import { mensajeDeError } from '../errores'
import { longitudDeContrasenaValida } from '../reglas'
import '../cuenta.css'

const t = textos.cuenta

export default function RestablecerContrasena() {
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const [token] = useState(() => new URLSearchParams(ubicacion.search).get('token'))
  const [contrasena, setContrasena] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enlaceCaducado, setEnlaceCaducado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // El token del correo sale de la barra de direcciones y del historial nada más leerlo.
  useEffect(() => {
    if (new URLSearchParams(ubicacion.search).has('token')) navegar(ubicacion.pathname, { replace: true })
  }, [ubicacion.pathname, ubicacion.search, navegar])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (token === null) return
    if (!longitudDeContrasenaValida(contrasena)) {
      setError(t.restablecer.longitud)
      return
    }
    if (contrasena !== repetida) {
      setError(t.restablecer.noCoinciden)
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const r = exigir(await api.POST('/cuentas/contrasena/restablecer', { body: { token, contrasena } }))
      navegar('/entrar', { replace: true, state: { mensaje: r.mensaje } })
    } catch (err) {
      setError(mensajeDeError(err))
      setEnlaceCaducado(err instanceof ErrorDeApi && err.estado === 400)
      setEnviando(false)
    }
  }

  const pedirOtro = <Link to="/contrasena/olvido">{t.restablecer.pedirOtro}</Link>

  if (token === null) {
    return (
      <main className="cuenta">
        <div className="cuenta__tarjeta">
          <h1>{t.restablecer.titulo}</h1>
          <p className="cuenta__error" role="alert">{t.restablecer.sinToken}</p>
          <p className="cuenta__enlaces">{pedirOtro}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="cuenta">
      <form className="cuenta__tarjeta" method="post" noValidate onSubmit={enviar}>
        <h1>{t.restablecer.titulo}</h1>
        <label className="cuenta__campo">
          {t.restablecer.nueva}
          <input type="password" autoComplete="new-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
        </label>
        <label className="cuenta__campo">
          {t.restablecer.repetir}
          <input type="password" autoComplete="new-password" required value={repetida} onChange={(e) => setRepetida(e.target.value)} />
        </label>
        <p className="cuenta__ayuda">{t.restablecer.ayuda}</p>
        {error && <p className="cuenta__error" role="alert">{error}</p>}
        {enlaceCaducado && <p className="cuenta__enlaces">{pedirOtro}</p>}
        <button type="submit" className="primario" disabled={enviando}>{enviando ? t.enviando : t.restablecer.boton}</button>
      </form>
    </main>
  )
}
