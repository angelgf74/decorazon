import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { api, exigir } from '../../api/cliente'
import { contenidoParaEnviar } from '../../disenos/servidor'
import { useEditor } from '../../editor/estado/almacen'
import { almacenamientoSeguro, CLAVE_REGISTRO_ENVIADO, disenoNoVacio } from '../../editor/persistencia/local'
import { serializarDocumento } from '../../nucleo'
import { textos } from '../../textos'
import { mensajeDeError } from '../errores'
import '../cuenta.css'

const t = textos.cuenta

export default function Registro() {
  const documento = useEditor((e) => e.documento)
  const [correo, setCorreo] = useState('')
  const [enviado, setEnviado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const diseno = disenoNoVacio(documento) ? documento : null

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      const cuerpo = diseno
        ? {
            correo,
            diseno: {
              nombre: t.registro.nombrePorDefecto,
              tipoEstancia: diseno.estancia.tipo,
              contenido: contenidoParaEnviar(diseno),
            },
          }
        : { correo }
      const r = exigir(await api.POST('/cuentas/registro', { body: cuerpo }))
      try {
        const st = almacenamientoSeguro()
        if (diseno) st?.setItem(CLAVE_REGISTRO_ENVIADO, serializarDocumento(diseno))
        else st?.removeItem(CLAVE_REGISTRO_ENVIADO)
      } catch {
        // sin acceso al almacenamiento: el diseño ya viajó con la solicitud
      }
      setEnviado(r.mensaje)
    } catch (err) {
      setError(mensajeDeError(err))
    }
    setEnviando(false)
  }

  return (
    <main className="cuenta">
      <form className="cuenta__tarjeta" method="post" noValidate onSubmit={enviar}>
        <h1>{t.registro.titulo}</h1>
        {enviado !== null ? (
          <p className="cuenta__aviso" role="status">{enviado}</p>
        ) : (
          <>
            <p>{t.registro.explicacion}</p>
            {diseno && <p className="cuenta__aviso">{t.registro.conDiseno}</p>}
            <label className="cuenta__campo">
              {t.correo}
              <input type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </label>
            {error && <p className="cuenta__error" role="alert">{error}</p>}
            <button type="submit" className="primario" disabled={enviando}>{enviando ? t.enviando : t.registro.boton}</button>
          </>
        )}
        <p className="cuenta__enlaces">
          <Link to="/entrar">{t.registro.yaTengo}</Link>
        </p>
      </form>
    </main>
  )
}
