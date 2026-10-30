import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { ErrorDeApi } from '../../api/cliente'
import { mensajeDeError } from '../../cuenta/errores'
import { useSesion } from '../../cuenta/sesion'
import Editor from '../../editor/Editor'
import { almacen } from '../../editor/estado/almacen'
import ConflictoDeVersion from '../../editor/paneles/ConflictoDeVersion'
import { almacenamientoSeguro, leerCopiaLocal } from '../../editor/persistencia/local'
import { abrirDiseno, elegirApertura } from '../../editor/persistencia/sincronizacion'
import { textos } from '../../textos'
import { obtenerDiseno } from '../servidor'

const t = textos.editorDeDiseno

type Carga = { id: string; estado: 'abierto' } | { id: string; estado: 'fallo'; mensaje: string }

export default function EditorDeDiseno() {
  const { id = '' } = useParams()
  const haySesion = useSesion((s) => s.haySesion())
  const [carga, setCarga] = useState<Carga | null>(null)

  useEffect(() => {
    if (!haySesion) return
    let vigente = true
    const st = almacenamientoSeguro()
    const copia = leerCopiaLocal(st, id)
    obtenerDiseno(id)
      .then((remoto) => elegirApertura(id, copia, remoto))
      .catch((e: unknown) => {
        if (e instanceof ErrorDeApi && e.estado === 0 && copia !== null) return elegirApertura(id, copia, null)
        throw e
      })
      .then((apertura) => {
        if (!vigente || apertura === null) return
        abrirDiseno(almacen, apertura)
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
  return (
    <>
      <Editor />
      <ConflictoDeVersion />
    </>
  )
}
