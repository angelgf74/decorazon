import { Ray, Vector3 } from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import { bloquearElemento, catalogoBase, elementoNuevo } from '../../nucleo'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import { moverEn3D, puntoDelSuelo, sePuedeArrastrarEn3D } from './arrastre3d'

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 500, 400, 250)
  almacen.getState().irAPaso(2)
  almacen.getState().cambiar((d) => ({ ...d, elementos: [elementoNuevo(catalogoBase.get('mesita')!, { x: 250, y: 200 }, 'm')] }))
})
const pos = () => almacen.getState().documento!.elementos[0]!.posicion

describe('mover muebles en 3D (M-10)', () => {
  it('puntoDelSuelo: donde el rayo corta el suelo (y = 0), en cm del plano (x → x, z → y)', () => {
    const rayo = new Ray(new Vector3(2, 5, 1.5), new Vector3(0, -1, 0))
    expect(puntoDelSuelo(rayo)).toEqual({ x: 200, y: 150 })
    // Un rayo que mira al cielo no corta el suelo.
    expect(puntoDelSuelo(new Ray(new Vector3(0, 1, 0), new Vector3(0, 1, 0)))).toBeNull()
  })

  it('moverEn3D lleva el mueble lo que se movió el punto del suelo, con imán y en un solo paso de deshacer', () => {
    const pasos = almacen.getState().pasado.length
    moverEn3D('m', { x: 250, y: 200 }, { x: 250, y: 200 }, { x: 290, y: 230 })
    moverEn3D('m', { x: 250, y: 200 }, { x: 250, y: 200 }, { x: 300, y: 240 })
    almacen.getState().terminarGrupo()
    expect(pos()).toEqual({ x: 300, y: 240 })
    expect(almacen.getState().pasado.length).toBe(pasos + 1)
    // El imán actúa como en 2D: cerca de la pared de la izquierda se pega a ella.
    moverEn3D('m', { x: 300, y: 240 }, { x: 300, y: 240 }, { x: 30, y: 240 })
    expect(pos().x).toBeLessThan(30)
  })

  it('solo se arrastra en 3D el mueble ya seleccionado, libre y en el paso 2', () => {
    expect(sePuedeArrastrarEn3D('m')).toBe(false)
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'm' })
    expect(sePuedeArrastrarEn3D('m')).toBe(true)
    almacen.getState().cambiar((d) => bloquearElemento(d, 'm', true))
    expect(sePuedeArrastrarEn3D('m')).toBe(false)
  })
})
