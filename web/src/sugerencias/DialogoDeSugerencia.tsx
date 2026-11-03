import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { api, exigir } from '../api/cliente'
import { mensajeDeError } from '../cuenta/errores'
import { useSesion } from '../cuenta/sesion'
import { useDialogoModal } from '../editor/comunes/usarDialogoModal'
import { textos } from '../textos'
import './sugerencias.css'

const t = textos.sugerencias

// Los nombres del contrato de POST /sugerencias, en el orden del desplegable.
const TIPOS = ['mejora', 'funcionalidad', 'error', 'pregunta', 'otra'] as const
type Tipo = (typeof TIPOS)[number]

// Los mismos límites que el buzón de sugerencias.
const LONGITUD_MAXIMA_DEL_TEXTO = 2000
const LONGITUD_MAXIMA_DEL_CORREO = 200

/**
 * Escribir una sugerencia y mandarla al autor. Con sesión se responde al correo de la cuenta (lo decide el servidor
 * a partir del token); sin ella, al que se escriba aquí.
 */
export default function DialogoDeSugerencia({ alCerrar }: { alCerrar(): void }) {
  const [enviando, setEnviando] = useState(false)
  // Con el envío en marcha no se cierra (el navegador puede cerrarlo con dos Escape seguidos).
  const { ref, alCerrar: alCerrarlo } = useDialogoModal(true, () => { if (!enviando) alCerrar() })
  const haySesion = useSesion((s) => s.haySesion())
  const correoDeLaCuenta = useSesion((s) => s.usuario?.correo ?? null)
  const [tipo, setTipo] = useState<Tipo>('mejora')
  const [texto, setTexto] = useState('')
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviada, setEnviada] = useState(false)
  // Guard síncrono: dos clics antes del re-render no mandan dos sugerencias.
  const enCurso = useRef(false)
  const botonCerrar = useRef<HTMLButtonElement>(null)
  const idTitulo = useId()
  const idAyudaTexto = useId()
  const idAyudaCorreo = useId()

  // El botón pulsado desaparece con el formulario: el foco no se pierde en el body.
  useEffect(() => {
    if (enviada) botonCerrar.current?.focus()
  }, [enviada])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (enCurso.current) return
    if (texto.trim() === '') {
      setError(t.sinTexto)
      return
    }
    if (!haySesion && correo.trim() === '') {
      setError(t.sinCorreo)
      return
    }
    enCurso.current = true
    setEnviando(true)
    setError(null)
    try {
      exigir(await api.POST('/sugerencias', { body: haySesion ? { texto, tipo } : { texto, tipo, correo: correo.trim() } }))
      setEnviada(true)
    } catch (err) {
      // Lo escrito se queda: Decorazon no guarda la sugerencia, así que reintentar es la única forma de que llegue.
      setError(mensajeDeError(err))
    }
    enCurso.current = false
    setEnviando(false)
  }

  return (
    <dialog ref={ref} className="confirmar dialogo-sugerencia" aria-labelledby={idTitulo}
      onCancel={(e) => { e.preventDefault(); if (!enviando) alCerrar() }} onClose={alCerrarlo}>
      <h2 id={idTitulo}>{t.titulo}</h2>
      {/* Siempre en la página: una región viva que aparece de golpe no siempre se anuncia. */}
      <p className="dialogo-sugerencia__estado" role="status">{enviada ? t.enviada : ''}</p>
      {enviada ? (
        <div className="dialogo-sugerencia__acciones">
          <button ref={botonCerrar} type="button" className="primario" onClick={alCerrar}>{t.cerrar}</button>
        </div>
      ) : (
        <form className="dialogo-sugerencia__formulario" noValidate onSubmit={(e) => void enviar(e)}>
          <p>{t.explicacion}</p>
          <div className="dialogo-sugerencia__campo">
            <label>
              {t.tipo}
              <select value={tipo} disabled={enviando} onChange={(e) => setTipo(e.target.value as Tipo)}>
                {TIPOS.map((valor) => <option key={valor} value={valor}>{t.tipos[valor]}</option>)}
              </select>
            </label>
          </div>
          {/* La ayuda va fuera del label y enlazada con aria-describedby: dentro, pasaría a formar parte del nombre. */}
          <div className="dialogo-sugerencia__campo">
            <label>
              {t.texto}
              <textarea rows={6} maxLength={LONGITUD_MAXIMA_DEL_TEXTO} required readOnly={enviando} aria-describedby={idAyudaTexto} value={texto} onChange={(e) => setTexto(e.target.value)} />
            </label>
            <span id={idAyudaTexto} className="dialogo-sugerencia__ayuda">{t.ayudaTexto}</span>
          </div>
          {haySesion ? (
            correoDeLaCuenta && <p className="dialogo-sugerencia__ayuda">{t.respuestaA(correoDeLaCuenta)}</p>
          ) : (
            <div className="dialogo-sugerencia__campo">
              <label>
                {t.correo}
                <input type="email" autoComplete="email" maxLength={LONGITUD_MAXIMA_DEL_CORREO} required readOnly={enviando} aria-describedby={idAyudaCorreo} value={correo} onChange={(e) => setCorreo(e.target.value)} />
              </label>
              <span id={idAyudaCorreo} className="dialogo-sugerencia__ayuda">{t.ayudaCorreo}</span>
            </div>
          )}
          <p className="dialogo-sugerencia__ayuda"><Link to="/privacidad">{t.privacidad}</Link></p>
          {error && <p className="dialogo-sugerencia__error" role="alert">{error}</p>}
          <div className="dialogo-sugerencia__acciones">
            <button type="button" disabled={enviando} onClick={alCerrar}>{textos.comun.cancelar}</button>
            <button type="submit" className="primario" disabled={enviando} aria-busy={enviando}>{enviando ? t.enviando : t.enviar}</button>
          </div>
        </form>
      )}
    </dialog>
  )
}
