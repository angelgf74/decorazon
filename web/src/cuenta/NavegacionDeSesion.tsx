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
      // En Entrar, olvido o restablecer no se interrumpe lo que se está haciendo.
      if (esPaginaDeCuenta(pathname)) return
      navegar(`/entrar?motivo=caducada&volver=${encodeURIComponent(pathname + search)}`)
    })
    return () => alCaducarLaSesion(() => {})
  }, [navegar])

  return null
}
