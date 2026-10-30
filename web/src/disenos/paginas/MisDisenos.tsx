import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ErrorDeApi } from '../../api/cliente'
import { mensajeDeError } from '../../cuenta/errores'
import { copiasDeLaCuenta } from '../../cuenta/disenosLocales'
import { sesion, useSesion } from '../../cuenta/sesion'
import Confirmar from '../../editor/comunes/Confirmar'
import NuevaEstancia from '../../editor/paneles/NuevaEstancia'
import type { CopiaListada } from '../../editor/persistencia/local'
import { documentoNuevo, type TipoEstancia } from '../../nucleo'
import { textos } from '../../textos'
import { borrarDiseno, crearDiseno, duplicarDiseno, guardarDiseno, listarDisenos, obtenerDiseno, type ResumenDiseno } from '../servidor'
import '../disenos.css'

const t = textos.disenos

function tipoEnTexto(tipo: string): string {
  return tipo in textos.nuevaEstancia.tipos ? textos.nuevaEstancia.tipos[tipo as TipoEstancia] : tipo
}

function fechaRelativa(iso: string): string {
  const minutos = Math.floor((Date.now() - Date.parse(iso)) / 60_000)
  if (minutos < 1) return t.ahora
  if (minutos < 60) return t.haceMinutos(minutos)
  if (minutos < 24 * 60) return t.haceHoras(Math.floor(minutos / 60))
  return new Date(iso).toLocaleDateString('es-ES')
}

function porFechaDescendente(lista: ResumenDiseno[]): ResumenDiseno[] {
  return [...lista].sort((a, b) => Date.parse(b.fechaDeModificacion) - Date.parse(a.fechaDeModificacion))
}

interface PropsDialogo {
  alCrear(tipo: TipoEstancia, ancho: number, largo: number, alto: number): void
  alCerrar(): void
}

function DialogoNuevo({ alCrear, alCerrar }: PropsDialogo) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d === null) return
    if (typeof d.showModal === 'function') d.showModal()
    if (!d.open) d.setAttribute('open', '')
    return () => d.close?.()
  }, [])
  return (
    <dialog ref={ref} className="confirmar" onCancel={(e) => { e.preventDefault(); alCerrar() }}>
      <NuevaEstancia alCrear={alCrear} />
      <button type="button" onClick={alCerrar}>{textos.comun.cancelar}</button>
    </dialog>
  )
}

export default function MisDisenos() {
  const haySesion = useSesion((s) => s.haySesion())
  const navegar = useNavigate()
  const [lista, setLista] = useState<ResumenDiseno[] | null>(null)
  // Sin conexión: las copias de este navegador, solo para abrirlas.
  const [locales, setLocales] = useState<CopiaListada[] | null>(null)
  const [falloLaCarga, setFalloLaCarga] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<{ id: string; nombre: string } | null>(null)
  const [borrando, setBorrando] = useState<ResumenDiseno | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const recargar = useCallback(async () => {
    try {
      setLista(porFechaDescendente(await listarDisenos()))
      setLocales(null)
      setFalloLaCarga(false)
    } catch (e) {
      if (e instanceof ErrorDeApi && e.estado === 0) {
        setLocales(copiasDeLaCuenta(sesion.getState().usuario?.correo ?? null))
        setAviso(t.sinConexionLocales)
      } else setAviso(mensajeDeError(e))
      setFalloLaCarga(true)
    }
  }, [])

  useEffect(() => {
    // La lista viene del servidor: se pide al montar la página.
    // oxlint-disable-next-line react/set-state-in-effect
    if (haySesion) void recargar()
  }, [haySesion, recargar])

  if (!haySesion) return <Navigate to="/entrar?volver=/disenos" replace />

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

  const crear = (tipo: TipoEstancia, ancho: number, largo: number, alto: number) =>
    intentar(async () => {
      setCreando(false)
      const d = await crearDiseno(t.nombrePorDefecto, documentoNuevo(tipo, ancho, largo, alto))
      navegar(`/disenos/${d.id}`)
    })

  const duplicar = (id: string) =>
    intentar(async () => {
      await duplicarDiseno(id)
      await recargar()
    })

  const borrar = (d: ResumenDiseno) =>
    intentar(async () => {
      setBorrando(null)
      await borrarDiseno(d.id)
      setLista((actual) => actual?.filter((x) => x.id !== d.id) ?? null)
    })

  const renombrar = (e: FormEvent, d: ResumenDiseno) => {
    e.preventDefault()
    const nombre = editando?.nombre.trim() ?? ''
    if (nombre === '') return
    void intentar(async () => {
      try {
        // PUT reemplaza el diseño entero: con el contenido guardado y la versión de la lista, que delata otro cambio.
        const { diseno } = await obtenerDiseno(d.id)
        await guardarDiseno(d.id, d.version, { nombre, doc: diseno.contenido })
        setEditando(null)
        await recargar()
      } catch (err) {
        if (err instanceof ErrorDeApi && err.estado === 412) {
          setEditando(null)
          await recargar()
          setAviso(t.cambiadoEnOtroSitio)
        } else throw err
      }
    })
  }

  return (
    <main className="disenos">
      <header className="disenos__cabecera">
        <h1>{t.titulo}</h1>
        <button type="button" className="primario" disabled={ocupado} onClick={() => setCreando(true)}>{t.nuevo}</button>
      </header>
      {aviso && <p className="disenos__aviso" role="alert">{aviso}</p>}
      {locales !== null ? (
        <ul className="disenos__lista">
          {locales.map((c) => (
            <li key={c.id} className="disenos__fila">
              <div className="disenos__datos">
                <strong>{c.nombre ?? t.nombrePorDefecto}</strong>
                {c.guardadaEn !== undefined && <span>{fechaRelativa(c.guardadaEn)}</span>}
              </div>
              <div className="disenos__acciones">
                <button type="button" className="primario" onClick={() => navegar(`/disenos/${c.id}`)}>{t.abrir}</button>
              </div>
            </li>
          ))}
        </ul>
      ) : lista === null ? (
        !falloLaCarga && <p>{t.cargando}</p>
      ) : lista.length === 0 ? (
        <p className="disenos__vacio">{t.vacio}</p>
      ) : (
        <ul className="disenos__lista">
          {lista.map((d) => (
            <li key={d.id} className="disenos__fila">
              {editando?.id === d.id ? (
                <form className="disenos__renombrar" onSubmit={(e) => renombrar(e, d)}>
                  <label>
                    {t.nombre}
                    <input
                      value={editando.nombre}
                      maxLength={100}
                      autoFocus
                      onChange={(e) => setEditando({ id: d.id, nombre: e.target.value })}
                    />
                  </label>
                  <button type="submit" className="primario" disabled={ocupado}>{t.guardarNombre}</button>
                  <button type="button" onClick={() => setEditando(null)}>{textos.comun.cancelar}</button>
                </form>
              ) : (
                <>
                  <div className="disenos__datos">
                    <strong>{d.nombre}</strong>
                    <span>{tipoEnTexto(d.tipoEstancia)}</span>
                    <span>{fechaRelativa(d.fechaDeModificacion)}</span>
                  </div>
                  <div className="disenos__acciones">
                    <button type="button" className="primario" onClick={() => navegar(`/disenos/${d.id}`)}>{t.abrir}</button>
                    <button type="button" onClick={() => setEditando({ id: d.id, nombre: d.nombre })}>{t.renombrar}</button>
                    <button type="button" disabled={ocupado} onClick={() => void duplicar(d.id)}>{t.duplicar}</button>
                    <button type="button" disabled={ocupado} onClick={() => setBorrando(d)}>{t.borrar}</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {creando && <DialogoNuevo alCrear={(...m) => void crear(...m)} alCerrar={() => setCreando(false)} />}
      <Confirmar
        abierto={borrando !== null}
        mensaje={borrando ? t.confirmarBorrar(borrando.nombre) : ''}
        textoAceptar={t.borrar}
        alAceptar={() => { if (borrando) void borrar(borrando) }}
        alCancelar={() => setBorrando(null)}
      />
    </main>
  )
}
