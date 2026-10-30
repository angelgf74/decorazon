import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { alCaducarLaSesion } from './sesion'

const PAGINAS_DE_CUENTA = ['/entrar', '/registro', '/contrasena']

function esPaginaDeCuenta(ruta: string): boolean {
  return PAGINAS_DE_CUENTA.some((p) => ruta === p || ruta.startsWith(`${p}/`))
}

// Al caducar la sesión lleva a Entrar con el aviso y la ruta donde estaba para volver tras entrar.
export default function NavegacionDeSesion() {
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const actual = useRef(ubicacion)

  useEffect(() => {
    actual.current = ubicacion
  }, [ubicacion])

  useEffect(() => {
    alCaducarLaSesion(() => {
      const { pathname, search } = actual.current
      const volver = esPaginaDeCuenta(pathname) ? '' : `&volver=${encodeURIComponent(pathname + search)}`
      navegar(`/entrar?motivo=caducada${volver}`)
    })
    return () => alCaducarLaSesion(() => {})
  }, [navegar])

  return null
}
