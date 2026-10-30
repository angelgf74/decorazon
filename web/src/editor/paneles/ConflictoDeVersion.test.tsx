// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../../nucleo'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import ConflictoDeVersion from './ConflictoDeVersion'

const sincronizacion = vi.hoisted(() => ({ resolverConflicto: vi.fn(async () => {}) }))
vi.mock('../persistencia/sincronizacion', () => sincronizacion)

beforeEach(() => {
  reiniciarAlmacen()
  sincronizacion.resolverConflicto.mockClear()
  almacen.getState().abrirDelServidor('d1', 4, 'Cocina', documentoNuevo('cocina', 400, 300, 250))
})

describe('ConflictoDeVersion', () => {
  it('sin conflicto no se muestra', () => {
    render(<ConflictoDeVersion />)
    expect(screen.queryByText(/se ha guardado desde otro sitio/)).toBeNull()
  })

  it.each([
    ['Recargar la versión guardada', 'recargar'],
    ['Sobrescribir con la mía', 'sobrescribir'],
  ])('"%s" llama a resolverConflicto con "%s"', async (boton, eleccion) => {
    almacen.getState().marcarGuardado('conflicto')
    render(<ConflictoDeVersion />)
    expect(screen.getByText('Este diseño se ha guardado desde otro sitio después de que lo abrieras.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: boton }))
    expect(sincronizacion.resolverConflicto).toHaveBeenCalledWith(almacen, eleccion)
  })
})
