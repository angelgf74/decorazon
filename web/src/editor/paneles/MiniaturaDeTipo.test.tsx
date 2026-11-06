// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { catalogoBase, elementoNuevo, huellasEnPlanta } from '../../nucleo'
import MiniaturaDeTipo from './MiniaturaDeTipo'

function cajaDelViewBox(svg: SVGSVGElement) {
  const [x, y, w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number) as [number, number, number, number]
  return { minX: x, minY: y, maxX: x + w, maxY: y + h }
}

describe('MiniaturaDeTipo', () => {
  const armario = catalogoBase.get('armario')!

  it('es un svg decorativo cuyo viewBox contiene todas las huellas y aperturas del tipo por defecto', () => {
    const { container } = render(<MiniaturaDeTipo def={armario} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveClass('panel-catalogo__miniatura')
    const caja = cajaDelViewBox(svg)
    const e = elementoNuevo(armario, { x: 0, y: 0 })
    const puntos = [...huellasEnPlanta(armario, e), ...armario.zonasApertura(e).map((z) => z.huella)].flat()
    expect(puntos.length).toBeGreaterThan(0)
    for (const p of puntos) {
      expect(p.x).toBeGreaterThanOrEqual(caja.minX)
      expect(p.x).toBeLessThanOrEqual(caja.maxX)
      expect(p.y).toBeGreaterThanOrEqual(caja.minY)
      expect(p.y).toBeLessThanOrEqual(caja.maxY)
    }
  })

  it('pinta un polígono por huella y las aperturas con trazo discontinuo, sin halo de selección', () => {
    const { container } = render(<MiniaturaDeTipo def={armario} />)
    const e = elementoNuevo(armario, { x: 0, y: 0 })
    expect(container.querySelectorAll('.capa-elementos__huella')).toHaveLength(huellasEnPlanta(armario, e).length)
    const aperturas = container.querySelectorAll('.capa-elementos__apertura')
    expect(aperturas.length).toBe(armario.zonasApertura(e).length)
    expect(aperturas.length).toBeGreaterThan(0)
    for (const a of aperturas) expect(a.getAttribute('stroke-dasharray')).toBeTruthy()
    expect(container.querySelector('.capa-elementos__halo')).toBeNull()
  })

  it('la huella lleva el color por defecto de su zona, como en el plano', () => {
    const { container } = render(<MiniaturaDeTipo def={armario} />)
    expect(container.querySelector('.capa-elementos__huella')).toHaveAttribute('fill', armario.zonasColor[0]!.defecto)
  })
})
