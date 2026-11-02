import { useId, useRef, useState } from 'react'
import { mensajeDeError } from '../../cuenta/errores'
import { useDialogoModal } from '../../editor/comunes/usarDialogoModal'
import { textos } from '../../textos'
import { compartirDiseno, dejarDeCompartir, direccionCompartida, type ResumenDiseno } from '../servidor'

const t = textos.compartir

interface Props {
  diseno: ResumenDiseno
  /** Tras crear o retirar el enlace: el nuevo, o null. */
  alCambiar(enlace: string | null): void
  alCerrar(): void
}

/** Crear el enlace de un diseño, copiarlo o dejar de compartirlo. */
export default function DialogoCompartir({ diseno, alCambiar, alCerrar }: Props) {
  const { ref, alCerrar: alCerrarlo } = useDialogoModal(true, alCerrar)
  const idTitulo = useId()
  const idCampo = useId()
  const campo = useRef<HTMLInputElement>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const enlace = diseno.enlace ?? null

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

  const crear = () => intentar(async () => alCambiar(await compartirDiseno(diseno.id)))

  const dejar = () => intentar(async () => {
    await dejarDeCompartir(diseno.id)
    setConfirmando(false)
    setCopiado(false)
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

  return (
    <dialog ref={ref} className="confirmar dialogo-compartir" aria-labelledby={idTitulo}
      onCancel={(e) => { e.preventDefault(); if (!ocupado) alCerrar() }} onClose={alCerrarlo}>
      <h2 id={idTitulo}>{t.titulo(diseno.nombre)}</h2>
      <p>{t.explicacion}</p>
      {enlace === null ? (
        <div className="dialogo-compartir__acciones">
          <button type="button" className="primario" disabled={ocupado} onClick={() => void crear()}>{t.crear}</button>
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
                <button type="button" disabled={ocupado} onClick={() => setConfirmando(false)}>{textos.comun.cancelar}</button>
              </div>
            </div>
          ) : (
            <div className="dialogo-compartir__acciones">
              <button type="button" className="primario" onClick={() => void copiar()}>{t.copiar}</button>
              <button type="button" className="peligro" disabled={ocupado} onClick={() => setConfirmando(true)}>{t.dejar}</button>
              <button type="button" disabled={ocupado} onClick={alCerrar}>{t.cerrar}</button>
            </div>
          )}
          <p className="dialogo-compartir__estado" role="status">{copiado ? t.copiado : ''}</p>
        </>
      )}
      {aviso && <p className="disenos__aviso" role="alert">{aviso}</p>}
    </dialog>
  )
}
