// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { evento } from '../../analitica'
import { almacen, reiniciarAlmacen } from './almacen'
import { anadirTipo } from './elementos'

vi.mock('../../analitica', () => ({ evento: vi.fn() }))

beforeEach(() => {
  vi.mocked(evento).mockClear()
  reiniciarAlmacen()
})

describe('eventos de uso del editor', () => {
  it('crear una estancia cuenta el tipo y la forma, nada más', () => {
    almacen.getState().crear('cocina', 400, 300, 250, { forma: 'ele', entranteAncho: 100, entranteLargo: 100, esquina: 'abajo-derecha' })
    expect(evento).toHaveBeenCalledWith('estancia-creada', { tipo: 'cocina', forma: 'ele' })
    almacen.getState().crear('salon', 400, 300, 250)
    expect(evento).toHaveBeenLastCalledWith('estancia-creada', { tipo: 'salon', forma: 'rectangulo' })
  })

  it('añadir un tipo del catálogo cuenta el tipo', () => {
    almacen.getState().crear('dormitorio', 400, 300, 250)
    anadirTipo('cama', { x: 200, y: 150 })
    expect(evento).toHaveBeenCalledWith('mueble-anadido', { tipo: 'cama' })
  })

  it('un tipo que no existe no cuenta nada', () => {
    almacen.getState().crear('dormitorio', 400, 300, 250)
    vi.mocked(evento).mockClear()
    anadirTipo('no-existe', { x: 200, y: 150 })
    expect(evento).not.toHaveBeenCalled()
  })

  it('entrar en 3D cuenta; volver a 2D no', () => {
    almacen.getState().crear('dormitorio', 400, 300, 250)
    vi.mocked(evento).mockClear()
    almacen.getState().cambiarVista('3d')
    expect(evento).toHaveBeenCalledExactlyOnceWith('vista-3d')
    almacen.getState().cambiarVista('2d')
    expect(evento).toHaveBeenCalledTimes(1)
  })
})
