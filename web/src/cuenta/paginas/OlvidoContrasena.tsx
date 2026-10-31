import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { api, exigir } from '../../api/cliente'
import { textos } from '../../textos'
import { mensajeDeError } from '../errores'
import '../cuenta.css'

const t = textos.cuenta

export default function OlvidoContrasena() {
  const [correo, setCorreo] = useState('')
  const [enviado, setEnviado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const r = exigir(await api.POST('/cuentas/contrasena/olvido', { body: { correo } }))
      setEnviado(r.mensaje)
    } catch (err) {
      setError(mensajeDeError(err))
    }
    setEnviando(false)
  }

  return (
    <main className="cuenta">
      <form className="cuenta__tarjeta" method="post" noValidate onSubmit={enviar}>
        <h1>{t.olvido.titulo}</h1>
        {enviado !== null ? (
          <p className="cuenta__aviso" role="status">{enviado}</p>
        ) : (
          <>
            <p>{t.olvido.explicacion}</p>
            <label className="cuenta__campo">
              {t.correo}
              <input type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </label>
            {error && <p className="cuenta__error" role="alert">{error}</p>}
            <button type="submit" className="primario" disabled={enviando}>{enviando ? t.enviando : t.olvido.boton}</button>
          </>
        )}
        <p className="cuenta__enlaces">
          <Link to="/entrar">{t.olvido.volver}</Link>
        </p>
      </form>
    </main>
  )
}
