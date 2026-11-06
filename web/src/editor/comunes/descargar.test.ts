// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { descargar, nombreDeFichero } from './descargar'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('nombreDeFichero', () => {
  it('cambia lo que un sistema de ficheros no admite por un guion y recorta los espacios', () => {
    expect(nombreDeFichero('Dormitorio de Ana / 2')).toBe('Dormitorio de Ana - 2')
    expect(nombreDeFichero('  Cocina: ¿norte? <sur> | "este" \\ oeste*  ')).toBe('Cocina- ¿norte- -sur- - -este- - oeste-')
  })

  it('sin nada que valga, «diseno»; y nunca más de 100 caracteres', () => {
    expect(nombreDeFichero('   ')).toBe('diseno')
    expect(nombreDeFichero('a'.repeat(150))).toHaveLength(100)
  })
})

describe('descargar', () => {
  it('con una URL de datos crea un <a download>, lo pulsa y lo quita', () => {
    const pulsado = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.isConnected).toBe(true)
      expect(this.download).toBe('Mi diseño.png')
      expect(this.href).toBe('data:image/png;base64,AAAA')
    })
    descargar('Mi diseño.png', 'data:image/png;base64,AAAA')
    expect(pulsado).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('con un Blob crea la URL del objeto y la revoca después de pulsar', () => {
    vi.useFakeTimers()
    const crear = vi.fn(() => 'blob:decorazon/1')
    const revocar = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar }))
    const pulsado = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe('blob:decorazon/1')
    })
    const blob = new Blob(['{}'], { type: 'application/json' })
    descargar('Mi diseño.decorazon.json', blob)
    expect(crear).toHaveBeenCalledWith(blob)
    expect(pulsado).toHaveBeenCalledOnce()
    expect(revocar).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revocar).toHaveBeenCalledWith('blob:decorazon/1')
  })
})
