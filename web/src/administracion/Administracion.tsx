import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { api, ErrorDeApi, exigir } from '../api/cliente'
import type { components } from '../api/esquema'
import { mensajeDeError } from '../cuenta/errores'
import { useSesion } from '../cuenta/sesion'
import { textos } from '../textos'
import { formatoDeTamano } from './tamano'
import './administracion.css'

const t = textos.administracion

type Listado = components['schemas']['RespuestaDeListadoDeUsuarios']

function fecha(iso: string): string {
  const instante = Date.parse(iso)
  return Number.isNaN(instante) ? '' : new Date(instante).toLocaleDateString('es-ES')
}

/**
 * Las cuentas con sus diseños y su espacio. El enlace solo se enseña a quien
 * administra, pero quien decide es la API: un 403 (el correo salió de la
 * configuración) también lleva al inicio.
 */
export default function Administracion() {
  const haySesion = useSesion((s) => s.haySesion())
  const usuario = useSesion((s) => s.usuario)
  const [listado, setListado] = useState<Listado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [prohibido, setProhibido] = useState(false)
  // Con el usuario aún sin cargar se pide igual: la API sabe si administra.
  const noAdministra = usuario !== null && !usuario.esAdministrador

  useEffect(() => {
    if (!haySesion || noAdministra) return
    let vigente = true
    void (async () => {
      try {
        const datos = exigir(await api.GET('/administracion/usuarios'))
        if (vigente) setListado(datos)
      } catch (e) {
        if (!vigente) return
        if (e instanceof ErrorDeApi && e.estado === 403) setProhibido(true)
        else setError(mensajeDeError(e))
      }
    })()
    return () => {
      vigente = false
    }
  }, [haySesion, noAdministra])

  if (!haySesion) return <Navigate to="/entrar?volver=/administracion" replace />
  if (noAdministra || prohibido) return <Navigate to="/" replace />

  return (
    <main className="administracion">
      <h1>{t.titulo}</h1>
      <p className="administracion__resumen">{t.resumen}</p>
      {error && <p className="administracion__aviso" role="alert">{error}</p>}
      {listado === null ? (
        !error && <p>{t.cargando}</p>
      ) : listado.usuarios.length === 0 ? (
        <p>{t.vacio}</p>
      ) : (
        <div className="administracion__tabla">
          <table>
            <thead>
              <tr>
                <th scope="col">{t.columnas.correo}</th>
                <th scope="col">{t.columnas.nombre}</th>
                <th scope="col">{t.columnas.alta}</th>
                <th scope="col" className="administracion__numero">{t.columnas.disenos}</th>
                <th scope="col" className="administracion__numero">{t.columnas.espacio}</th>
              </tr>
            </thead>
            <tbody>
              {listado.usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="administracion__correo">{u.correo}</td>
                  <td>{u.nombre}</td>
                  <td>{fecha(u.fechaDeAlta)}</td>
                  <td className="administracion__numero">{u.disenos}</td>
                  <td className="administracion__numero">{formatoDeTamano(u.bytes)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3}>{t.total(listado.usuarios.length)}</th>
                <td className="administracion__numero">{listado.totalDeDisenos}</td>
                <td className="administracion__numero">{formatoDeTamano(listado.totalDeBytes)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  )
}
