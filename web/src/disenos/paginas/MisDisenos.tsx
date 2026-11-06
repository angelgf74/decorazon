import { useCallback, useEffect, useId, useState, type ChangeEvent, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ErrorDeApi } from '../../api/cliente'
import { mensajeDeError } from '../../cuenta/errores'
import { copiasDeLaCuenta } from '../../cuenta/disenosLocales'
import { sesion, useSesion } from '../../cuenta/sesion'
import Confirmar from '../../editor/comunes/Confirmar'
import { useDialogoModal } from '../../editor/comunes/usarDialogoModal'
import NuevaEstancia from '../../editor/paneles/NuevaEstancia'
import { importarDiseno } from '../../editor/persistencia/fichero'
import { almacenamientoSeguro, borrarCopiaLocal, type CopiaListada } from '../../editor/persistencia/local'
import { documentoNuevo, type TipoEstancia } from '../../nucleo'
import { textos } from '../../textos'
import { borrarDiseno, crearDiseno, duplicarDiseno, guardarDiseno, listarDisenos, obtenerDiseno, type ResumenDiseno } from '../servidor'
import DialogoCompartir from './DialogoCompartir'
import '../disenos.css'

const t = textos.disenos

function tipoEnTexto(tipo: string): string {
  return Object.hasOwn(textos.nuevaEstancia.tipos, tipo) ? textos.nuevaEstancia.tipos[tipo as TipoEstancia] : tipo
}

function fechaRelativa(iso: string): string {
  const instante = Date.parse(iso)
  if (Number.isNaN(instante)) return t.sinFecha
  const minutos = Math.floor((Date.now() - instante) / 60_000)
  if (minutos < 1) return t.ahora
  if (minutos < 60) return t.haceMinutos(minutos)
  if (minutos < 24 * 60) return t.haceHoras(Math.floor(minutos / 60))
  return new Date(iso).toLocaleDateString('es-ES')
}

function porFechaDescendente(lista: ResumenDiseno[]): ResumenDiseno[] {
  // Una fecha inválida (NaN) rompería el orden del sort: se trata como la más antigua.
  const instante = (d: ResumenDiseno) => Date.parse(d.fechaDeModificacion) || 0
  const valida = (d: ResumenDiseno) => !Number.isNaN(Date.parse(d.fechaDeModificacion))
  return [...lista].sort((a, b) => Number(valida(b)) - Number(valida(a)) || instante(b) - instante(a))
}

interface PropsDialogo {
  alCrear(tipo: TipoEstancia, ancho: number, largo: number, alto: number): void
  alCerrar(): void
}

function DialogoNuevo({ alCrear, alCerrar }: PropsDialogo) {
  // Si el navegador lo cierra por su cuenta, la página deja de crear: así "Nuevo diseño" lo vuelve a abrir.
  const { ref, alCerrar: alCerrarlo } = useDialogoModal(true, alCerrar)
  return (
    <dialog ref={ref} className="confirmar" onCancel={(e) => { e.preventDefault(); alCerrar() }} onClose={alCerrarlo}>
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
  const [compartiendo, setCompartiendo] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const idFichero = useId()

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

  /** «Importar»: un fichero descargado con «Descargar diseño» pasa a ser un diseño de la cuenta, con el nombre del fichero. */
  const importar = async (ev: ChangeEvent<HTMLInputElement>) => {
    const fichero = ev.target.files?.[0]
    ev.target.value = ''
    if (!fichero) return
    const r = await importarDiseno(fichero)
    if (!r.ok) {
      setAviso(textos.importar.noValido)
      return
    }
    await intentar(async () => {
      const d = await crearDiseno(r.nombre === '' ? t.nombrePorDefecto : r.nombre, r.documento)
      navegar(`/disenos/${d.id}`)
    })
  }

  const duplicar = (id: string) =>
    intentar(async () => {
      try {
        await duplicarDiseno(id)
        await recargar()
      } catch (e) {
        // El diseño ya no existe: se recarga la lista y, tras ella, se avisa.
        if (e instanceof ErrorDeApi && e.estado === 404) await recargar()
        throw e
      }
    })

  const borrar = (d: ResumenDiseno) =>
    intentar(async () => {
      setBorrando(null)
      try {
        await borrarDiseno(d.id)
      } catch (e) {
        // Si ya no existe en el servidor, el borrado cuenta como hecho.
        if (!(e instanceof ErrorDeApi && e.estado === 404)) throw e
      }
      borrarCopiaLocal(almacenamientoSeguro(), d.id)
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
        <div className="disenos__cabecera-acciones">
          <button type="button" className="primario" disabled={ocupado} onClick={() => setCreando(true)}>{t.nuevo}</button>
          {/* El campo de fichero va oculto tras la etiqueta, que se ve como un botón (base.css). */}
          <label htmlFor={idFichero} className="boton">{textos.importar.importar}</label>
          <input id={idFichero} type="file" accept=".json,application/json" className="solo-lectores" disabled={ocupado} onChange={(ev) => void importar(ev)} />
        </div>
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
                    {d.enlace && <span className="disenos__compartido">{textos.compartir.marca}</span>}
                  </div>
                  <div className="disenos__acciones">
                    <button type="button" className="primario" onClick={() => navegar(`/disenos/${d.id}`)}>{t.abrir}</button>
                    <button type="button" onClick={() => setCompartiendo(d.id)}>{textos.compartir.boton}</button>
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
      {(() => {
        const d = lista?.find((x) => x.id === compartiendo)
        return d && (
          <DialogoCompartir
            diseno={d}
            alCambiar={(enlace) => setLista((actual) => actual?.map((x) => (x.id === d.id ? { ...x, enlace } : x)) ?? null)}
            alCerrar={() => setCompartiendo(null)}
          />
        )
      })()}
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
