import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { api, ErrorDeApi, exigir } from '../../api/cliente'
import { textos } from '../../textos'
import { mensajeDeError } from '../errores'
import { longitudDeContrasenaValida, nombreValido } from '../reglas'
import '../cuenta.css'

const t = textos.cuenta

export default function ConfirmarRegistro() {
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const [token] = useState(() => new URLSearchParams(ubicacion.search).get('token'))
  const [nombre, setNombre] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmacionRechazada, setConfirmacionRechazada] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // El token del correo sale de la barra de direcciones y del historial nada más leerlo.
  useEffect(() => {
    if (new URLSearchParams(ubicacion.search).has('token')) navegar(ubicacion.pathname, { replace: true })
  }, [ubicacion.pathname, ubicacion.search, navegar])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (token === null) return
    if (!nombreValido(nombre)) {
      setError(t.confirmar.nombreInvalido)
      return
    }
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
      exigir(await api.POST('/cuentas/registro/confirmar', { body: { token, nombre: nombre.trim(), contrasena } }))
      navegar('/entrar', { replace: true, state: { mensaje: t.confirmar.creada } })
    } catch (err) {
      setError(mensajeDeError(err))
      setConfirmacionRechazada(err instanceof ErrorDeApi && err.estado === 400)
      setEnviando(false)
    }
  }

  const volver = <Link to="/registro">{t.confirmar.volver}</Link>

  if (token === null) {
    return (
      <main className="cuenta">
        <div className="cuenta__tarjeta">
          <h1>{t.confirmar.titulo}</h1>
          <p className="cuenta__error" role="alert">{t.confirmar.sinToken}</p>
          <p className="cuenta__enlaces">{volver}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="cuenta">
      <form className="cuenta__tarjeta" method="post" noValidate onSubmit={enviar}>
        <h1>{t.confirmar.titulo}</h1>
        <label className="cuenta__campo">
          {t.confirmar.nombre}
          <input type="text" autoComplete="name" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="cuenta__campo">
          {t.contrasena}
          <input type="password" autoComplete="new-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
        </label>
        <label className="cuenta__campo">
          {t.confirmar.repetir}
          <input type="password" autoComplete="new-password" required value={repetida} onChange={(e) => setRepetida(e.target.value)} />
        </label>
        <p className="cuenta__ayuda">{t.confirmar.ayuda}</p>
        {error && <p className="cuenta__error" role="alert">{error}</p>}
        {confirmacionRechazada && <p className="cuenta__enlaces">{volver}</p>}
        <button type="submit" className="primario" disabled={enviando}>{enviando ? t.enviando : t.confirmar.boton}</button>
      </form>
    </main>
  )
}
