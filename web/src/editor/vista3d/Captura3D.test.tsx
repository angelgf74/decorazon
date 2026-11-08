// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../../nucleo'
import Captura3D from './Captura3D'

// El Canvas de fiber vuelca sus props en el lienzo; los hooks no hacen nada fuera de un árbol de three.
vi.mock('@react-three/fiber', async (original) => {
  const real = await original<typeof import('@react-three/fiber')>()
  return {
    ...real,
    Canvas: ({ children, dpr, gl, shadows }: { children?: unknown; dpr?: unknown; gl?: unknown; shadows?: unknown }) => (
      <canvas data-dpr={JSON.stringify(dpr)} data-gl={JSON.stringify(gl)} data-shadows={String(shadows)}>{children as never}</canvas>
    ),
    useFrame: () => {},
    useThree: () => () => {},
  }
})
vi.mock('./Escena3D', () => ({ default: ({ doc: _doc, ...props }: Record<string, unknown>) => <p data-escena={JSON.stringify(props)} /> }))

const doc = documentoNuevo('salon', 400, 330, 250)

describe('Captura3D', () => {
  it('el lienzo arranca a dpr 1 aunque se pida 2 (Disparar lo sube al final), con antialias y el búfer conservado', () => {
    const { container } = render(<Captura3D doc={doc} alCapturar={() => {}} dpr={2} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.dataset.dpr).toBe('1')
    expect(JSON.parse(canvas.dataset.gl!)).toEqual({ preserveDrawingBuffer: true, antialias: true })
    expect(canvas.dataset.shadows).toBe('true')
  })

  it('la escena va con sombras suaves, sin resaltes, con las paredes de delante ocultas y sin encuadres', () => {
    const { container } = render(<Captura3D doc={doc} alCapturar={() => {}} />)
    const escena = JSON.parse(container.querySelector('[data-escena]')!.getAttribute('data-escena')!)
    expect(escena).toEqual({ ocultar: true, encuadres: 0, sinResaltes: true, sombras: 'suaves' })
  })

  it('con sombras="duras" (la vista previa) la escena va sin el horneado de sombras suaves', () => {
    const { container } = render(<Captura3D doc={doc} alCapturar={() => {}} sombras="duras" />)
    const escena = JSON.parse(container.querySelector('[data-escena]')!.getAttribute('data-escena')!)
    expect(escena.sombras).toBe('duras')
  })

  it('el contenedor es la clase de la hoja por defecto y no se anuncia al lector de pantalla', () => {
    const { container } = render(<Captura3D doc={doc} alCapturar={() => {}} />)
    const envoltorio = container.firstElementChild!
    expect(envoltorio.className).toBe('hoja-impresion__lienzo3d')
    expect(envoltorio.getAttribute('aria-hidden')).toBe('true')
  })
})
