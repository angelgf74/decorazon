import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ErrorDeApi } from '../../api/cliente'
import { mensajeDeError } from '../../cuenta/errores'
import { useSesion } from '../../cuenta/sesion'
import Editor from '../../editor/Editor'
import { almacen } from '../../editor/estado/almacen'
import ConflictoDeVersion from '../../editor/paneles/ConflictoDeVersion'
import { almacenamientoSeguro, borrarCopiaLocal, leerCopiaLocal, type CopiaLocal } from '../../editor/persistencia/local'
import { abrirDiseno, elegirApertura, esperarGuardados, type Apertura } from '../../editor/persistencia/sincronizacion'
import { textos } from '../../textos'
import { crearDiseno, obtenerDiseno } from '../servidor'

const t = textos.editorDeDiseno

type Carga =
  | { id: string; estado: 'abierto' }
  | { id: string; estado: 'fallo'; mensaje: string }
  /** Borrado en el servidor con cambios sin subir en este navegador: decide el usuario. */
  | { id: string; estado: 'huerfano'; copia: CopiaLocal; aviso: string | null; ocupado: boolean }

type Resultado = { apertura: Apertura | null } | { huerfano: CopiaLocal } | { fallo: string }

export default function EditorDeDiseno() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const haySesion = useSesion((s) => s.haySesion())
  const [carga, setCarga] = useState<Carga | null>(null)

  useEffect(() => {
    if (!haySesion) return
    let vigente = true
    const abrir = async (): Promise<Resultado> => {
      // Si al salir de este diseño quedó un guardado en marcha, su resultado cambia la copia y la versión.
      await esperarGuardados(id)
      const st = almacenamientoSeguro()
      const copia = leerCopiaLocal(st, id)
      try {
        return { apertura: elegirApertura(id, copia, await obtenerDiseno(id)) }
      } catch (e) {
        if (e instanceof ErrorDeApi && e.estado === 0 && copia !== null) return { apertura: elegirApertura(id, copia, null) }
        if (e instanceof ErrorDeApi && e.estado === 404) {
          if (copia?.pendiente) return { huerfano: copia }
          borrarCopiaLocal(st, id)
          return { fallo: t.noExiste }
        }
        throw e
      }
    }
    abrir()
      .then((r) => {
        if (!vigente) return
        if ('fallo' in r) {
          setCarga({ id, estado: 'fallo', mensaje: r.fallo })
          return
        }
        if ('huerfano' in r) {
          setCarga({ id, estado: 'huerfano', copia: r.huerfano, aviso: null, ocupado: false })
          return
        }
        if (r.apertura === null) return
        abrirDiseno(almacen, r.apertura)
        setCarga({ id, estado: 'abierto' })
      })
      .catch((e: unknown) => {
        if (vigente) setCarga({ id, estado: 'fallo', mensaje: mensajeDeError(e) })
      })
    return () => {
      vigente = false
      almacen.getState().volverAAnonimo()
    }
  }, [id, haySesion])

  if (!haySesion) return <Navigate to={`/entrar?volver=${encodeURIComponent(`/disenos/${id}`)}`} replace />

  if (carga?.id !== id) return <main className="disenos"><p>{t.cargando}</p></main>
  if (carga.estado === 'fallo') {
    return (
      <main className="disenos">
        <p className="disenos__aviso" role="alert">{carga.mensaje}</p>
        <Link to="/disenos" className="boton">{t.volver}</Link>
      </main>
    )
  }
  if (carga.estado === 'huerfano') {
    const { copia } = carga
    const guardarComoNuevo = async () => {
      setCarga({ ...carga, aviso: null, ocupado: true })
      try {
        const nuevo = await crearDiseno(copia.nombre ?? textos.disenos.nombrePorDefecto, copia.documento)
        borrarCopiaLocal(almacenamientoSeguro(), id)
        navegar(`/disenos/${nuevo.id}`, { replace: true })
      } catch (e) {
        setCarga({ ...carga, aviso: mensajeDeError(e), ocupado: false })
      }
    }
    const descartar = () => {
      borrarCopiaLocal(almacenamientoSeguro(), id)
      navegar('/disenos', { replace: true })
    }
    return (
      <main className="disenos">
        <p className="disenos__aviso" role="alert">{t.noExisteConCambios}</p>
        {carga.aviso && <p className="disenos__aviso">{carga.aviso}</p>}
        <div className="disenos__acciones">
          <button type="button" className="primario" disabled={carga.ocupado} onClick={() => void guardarComoNuevo()}>{t.guardarComoNuevo}</button>
          <button type="button" disabled={carga.ocupado} onClick={descartar}>{t.descartar}</button>
        </div>
      </main>
    )
  }
  return (
    <>
      <Editor />
      <ConflictoDeVersion />
    </>
  )
}
