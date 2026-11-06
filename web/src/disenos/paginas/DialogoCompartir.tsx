import { useEffect, useId, useRef, useState } from 'react'
import { mensajeDeError } from '../../cuenta/errores'
import { useDialogoModal } from '../../editor/comunes/usarDialogoModal'
import { textos } from '../../textos'
import type { DocumentoDiseno } from '../../nucleo'
import { compartirDiseno, dejarDeCompartir, direccionCompartida, obtenerDiseno, subirVistaPrevia, type ResumenDiseno } from '../servidor'
import { apuntarVistaPrevia } from '../vistaPrevia/frecuencia'
import GeneradorDeVistaPrevia from '../vistaPrevia/GeneradorDeVistaPrevia'

const t = textos.compartir

/** A qué botón pasa el foco cuando el que se acaba de pulsar desaparece. */
type Foco = 'copiar' | 'crear' | 'dejar' | 'cancelar'

interface Props {
  diseno: ResumenDiseno
  /** Tras crear o retirar el enlace: el nuevo, o null. */
  alCambiar(enlace: string | null): void
  alCerrar(): void
}

/** Crear el enlace de un diseño, copiarlo o dejar de compartirlo. */
export default function DialogoCompartir({ diseno, alCambiar, alCerrar }: Props) {
  const [ocupado, setOcupado] = useState(false)
  // Con una petición en marcha no se cierra (el navegador puede cerrarlo con dos Escape seguidos).
  const { ref, alCerrar: alCerrarlo } = useDialogoModal(true, () => { if (!ocupado) alCerrar() })
  const idTitulo = useId()
  const idCampo = useId()
  const campo = useRef<HTMLInputElement>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  // La vista previa que se está haciendo, y a quién entregarla.
  const [generando, setGenerando] = useState<DocumentoDiseno | null>(null)
  const entregar = useRef<((imagen: Blob | null) => void) | null>(null)
  const enlace = diseno.enlace ?? null
  const botones = useRef<Partial<Record<Foco, HTMLButtonElement | null>>>({})
  const foco = useRef<Foco | null>(null)

  // Tras pintar el estado nuevo: el foco no se pierde en el body cuando el botón pulsado desaparece.
  // Si el destino sigue desactivado (la petición aún no ha terminado de pintarse), se espera al siguiente.
  useEffect(() => {
    const boton = foco.current === null ? null : botones.current[foco.current]
    if (!boton || boton.disabled) return
    boton.focus()
    foco.current = null
  })
  const enfocar = (destino: Foco) => (boton: HTMLButtonElement | null) => { botones.current[destino] = boton }

  const intentar = async (accion: () => Promise<void>) => {
    setOcupado(true)
    setAviso(null)
    try {
      await accion()
    } catch (e) {
      setAviso(mensajeDeError(e))
    }
    setOcupado(false)
  }

  const hacerVistaPrevia = (doc: DocumentoDiseno) => new Promise<Blob | null>((ok) => {
    entregar.current = ok
    setGenerando(doc)
  })

  /**
   * Primero la imagen de la tarjeta y después el enlace: lo normal es pegarlo enseguida en un chat, que lee la tarjeta
   * en ese momento y la guarda días. Si la imagen falla, el enlace se crea igual y la tarjeta lleva el icono.
   */
  const subirLaVistaPrevia = async () => {
    try {
      const { diseno: actual } = await obtenerDiseno(diseno.id)
      const imagen = await hacerVistaPrevia(actual.contenido)
      if (imagen) {
        await subirVistaPrevia(diseno.id, imagen)
        apuntarVistaPrevia(diseno.id)
      }
    } catch {
      // sin vista previa: la tarjeta saldrá con el icono
    }
  }

  const crear = () => intentar(async () => {
    await subirLaVistaPrevia()
    const nuevo = await compartirDiseno(diseno.id)
    foco.current = 'copiar'
    alCambiar(nuevo)
  })

  const dejar = () => intentar(async () => {
    await dejarDeCompartir(diseno.id)
    setConfirmando(false)
    setCopiado(false)
    foco.current = 'crear'
    alCambiar(null)
  })

  const copiar = async () => {
    if (enlace === null) return
    try {
      await navigator.clipboard.writeText(direccionCompartida(enlace))
      setCopiado(true)
    } catch {
      // Sin portapapeles (o sin permiso): queda seleccionado para copiarlo a mano.
      campo.current?.select()
    }
  }

  // La hoja de compartir del sistema (el móvil, sobre todo): solo donde existe.
  const puedeEnviar = typeof navigator.share === 'function'
  const enviar = async () => {
    if (enlace === null) return
    setAviso(null)
    try {
      await navigator.share({ title: diseno.nombre, url: direccionCompartida(enlace) })
    } catch (e) {
      // Cerrar la hoja sin elegir nada es AbortError: no es un fallo.
      if (!(e instanceof DOMException && e.name === 'AbortError')) setAviso(t.noEnviado)
    }
  }

  return (
    <dialog ref={ref} className="confirmar dialogo-compartir" aria-labelledby={idTitulo}
      onCancel={(e) => { e.preventDefault(); if (!ocupado) alCerrar() }} onClose={alCerrarlo}>
      <h2 id={idTitulo}>{t.titulo(diseno.nombre)}</h2>
      <p>{t.explicacion}</p>
      {enlace === null ? (
        <div className="dialogo-compartir__acciones">
          <button ref={enfocar('crear')} type="button" className="primario" disabled={ocupado} aria-busy={ocupado} onClick={() => void crear()}>{t.crear}</button>
          <button type="button" disabled={ocupado} onClick={alCerrar}>{t.cerrar}</button>
        </div>
      ) : (
        <>
          <label className="dialogo-compartir__campo" htmlFor={idCampo}>{t.enlace}</label>
          <input ref={campo} id={idCampo} readOnly value={direccionCompartida(enlace)} onFocus={(e) => e.currentTarget.select()} />
          <p className="dialogo-compartir__nota">{t.siempreUltima}</p>
          {confirmando ? (
            <div className="dialogo-compartir__confirmar" role="group" aria-label={t.dejar}>
              <p>{t.confirmarDejar}</p>
              <div className="dialogo-compartir__acciones">
                <button type="button" className="peligro" disabled={ocupado} onClick={() => void dejar()}>{t.siDejar}</button>
                <button ref={enfocar('cancelar')} type="button" disabled={ocupado} onClick={() => { foco.current = 'dejar'; setConfirmando(false) }}>{textos.comun.cancelar}</button>
              </div>
            </div>
          ) : (
            <div className="dialogo-compartir__acciones">
              {/* Siempre en la página: una región viva que aparece de golpe no siempre se anuncia. */}
              <span className="dialogo-compartir__estado" role="status">{copiado ? t.copiado : ''}</span>
              <button ref={enfocar('copiar')} type="button" className="primario" onClick={() => void copiar()}>{t.copiar}</button>
              {puedeEnviar && <button type="button" onClick={() => void enviar()}>{t.enviar}</button>}
              <button ref={enfocar('dejar')} type="button" className="peligro" disabled={ocupado} onClick={() => { foco.current = 'cancelar'; setConfirmando(true) }}>{t.dejar}</button>
              <button type="button" disabled={ocupado} onClick={alCerrar}>{t.cerrar}</button>
            </div>
          )}
        </>
      )}
      {enlace === null && <p className="dialogo-compartir__nota" role="status">{generando ? t.preparando : ''}</p>}
      {aviso && <p className="disenos__aviso" role="alert">{aviso}</p>}
      {generando && (
        <GeneradorDeVistaPrevia
          doc={generando}
          alTerminar={(imagen) => {
            setGenerando(null)
            entregar.current?.(imagen)
          }}
        />
      )}
    </dialog>
  )
}
