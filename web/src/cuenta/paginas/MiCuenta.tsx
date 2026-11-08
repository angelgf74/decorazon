import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { api, exigir } from '../../api/cliente'
import Confirmar from '../../editor/comunes/Confirmar'
import { textos } from '../../textos'
import { hayCambiosSinSubir } from '../disenosLocales'
import { mensajeDeError } from '../errores'
import { longitudDeContrasenaValida } from '../reglas'
import { sesion, useSesion } from '../sesion'
import '../cuenta.css'

const t = textos.cuenta
const m = t.miCuenta

export default function MiCuenta() {
  const navegar = useNavigate()
  const haySesion = useSesion((s) => s.haySesion())
  const usuario = useSesion((s) => s.usuario)
  const [saliendo, setSaliendo] = useState(false)
  // Guard síncrono: dos clics antes del re-render no mandan dos peticiones.
  const enCurso = useRef(false)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmandoSalir, setConfirmandoSalir] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [contrasenaBorrar, setContrasenaBorrar] = useState('')
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null)
  const [borrandoEnCurso, setBorrandoEnCurso] = useState(false)

  if (!haySesion && !saliendo) return <Navigate to="/entrar?volver=/cuenta" replace />

  const cambiar = async (e: FormEvent) => {
    e.preventDefault()
    if (!longitudDeContrasenaValida(nueva)) {
      setError(t.restablecer.longitud)
      return
    }
    if (nueva !== repetida) {
      setError(t.restablecer.noCoinciden)
      return
    }
    if (enCurso.current) return
    enCurso.current = true
    setEnviando(true)
    setError(null)
    try {
      exigir(await api.POST('/cuentas/contrasena', { body: { actual, nueva } }))
      setSaliendo(true)
      sesion.getState().cerrarSesion({ conservarLocales: true })
      navegar('/entrar', { replace: true, state: { mensaje: m.cambiada } })
    } catch (err) {
      setError(mensajeDeError(err))
      enCurso.current = false
      setEnviando(false)
    }
  }

  const salir = () => {
    if (enCurso.current) return
    enCurso.current = true
    setConfirmandoSalir(false)
    setSaliendo(true)
    sesion.getState().cerrarSesion()
  }

  const borrar = async () => {
    if (enCurso.current) return
    if (contrasenaBorrar === '') {
      setErrorBorrar(m.sinContrasena)
      return
    }
    enCurso.current = true
    setBorrandoEnCurso(true)
    setErrorBorrar(null)
    try {
      exigir(await api.DELETE('/cuentas/yo', { body: { contrasena: contrasenaBorrar } }))
      setSaliendo(true)
      sesion.getState().cerrarSesion()
      navegar('/', { replace: true, state: { mensaje: textos.inicio.cuentaBorrada } })
    } catch (err) {
      setErrorBorrar(mensajeDeError(err))
      enCurso.current = false
      setBorrandoEnCurso(false)
    }
  }

  const cerrarBorrado = () => {
    setBorrando(false)
    setContrasenaBorrar('')
    setErrorBorrar(null)
  }

  return (
    <main className="cuenta">
      <div className="cuenta__tarjeta">
        <h1>{m.titulo}</h1>
        {usuario && (
          <p>
            <strong>{usuario.nombre}</strong>
            <br />
            {usuario.correo}
          </p>
        )}
        <form className="cuenta__seccion" method="post" noValidate onSubmit={cambiar}>
          <h2>{m.cambiarTitulo}</h2>
          <label className="cuenta__campo">
            {m.actual}
            <input type="password" autoComplete="current-password" required value={actual} onChange={(e) => setActual(e.target.value)} />
          </label>
          <label className="cuenta__campo">
            {m.nueva}
            <input type="password" autoComplete="new-password" required value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </label>
          <label className="cuenta__campo">
            {m.repetir}
            <input type="password" autoComplete="new-password" required value={repetida} onChange={(e) => setRepetida(e.target.value)} />
          </label>
          <p className="cuenta__ayuda">{t.restablecer.ayuda}</p>
          {error && <p className="cuenta__error" role="alert">{error}</p>}
          <button type="submit" className="primario" disabled={enviando}>{enviando ? t.enviando : m.cambiar}</button>
        </form>
        <div className="cuenta__seccion">
          <button type="button" onClick={() => (hayCambiosSinSubir() ? setConfirmandoSalir(true) : salir())}>{m.cerrar}</button>
          <button type="button" onClick={() => setBorrando(true)}>{m.borrar}</button>
          {usuario?.esAdministrador && <Link to="/administracion" className="boton">{textos.administracion.enlace}</Link>}
        </div>
      </div>
      <Confirmar
        abierto={confirmandoSalir}
        mensaje={m.cambiosSinGuardar}
        textoAceptar={m.cerrar}
        alAceptar={salir}
        alCancelar={() => setConfirmandoSalir(false)}
      />
      <Confirmar
        abierto={borrando}
        mensaje={m.confirmarBorrar}
        textoAceptar={m.borrarDefinitivo}
        alAceptar={() => void borrar()}
        alCancelar={cerrarBorrado}
        ocupado={borrandoEnCurso}
      >
        <form method="post" onSubmit={(e) => { e.preventDefault(); void borrar() }}>
          <label className="cuenta__campo">
            {m.contrasenaBorrar}
            <input type="password" autoComplete="current-password" value={contrasenaBorrar} onChange={(e) => setContrasenaBorrar(e.target.value)} />
          </label>
        </form>
        {errorBorrar && <p className="cuenta__error" role="alert">{errorBorrar}</p>}
      </Confirmar>
    </main>
  )
}
