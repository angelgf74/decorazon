import { describe, expect, it } from 'vitest'
import { cajones, puertaAbatibleAbajo, puertasAbatibles } from './aperturas'
import { elementoDe } from './definiciones/ayuda.test-util'

// Salida de armario.zonasApertura (1 módulo) antes de refactorizarlo: elemento de 100x60x220 en (137, 82), girado 33°, a 10 de altura.
const HUELLAS_ARMARIO_1_MODULO: [number, number][][] = [
  [
    [78.72730055227798, 79.92816528761136],
    [120.70077839989892, 107.18606051476391],
    [118.16537454028898, 110.74056563155281],
    [115.32982312427009, 114.0605697766883],
    [112.21570441027097, 117.12080571395259],
    [108.84671872206141, 119.89798320004213],
    [105.24850607497785, 122.37096623738216],
    [101.44845103992483, 124.52093393183054],
    [97.47547433025505, 126.33152373104652],
    [93.35981269767802, 127.78895595339405],
    [89.1327888123221, 128.88213865963945],
    [84.82657287830165, 129.6027520693064],
    [80.47393779903882, 129.9453118792291],
    [76.10800975567975, 129.90721100241075],
    [71.76201609685381, 129.48873940952984],
    [67.4690324584874, 128.69308192208834],
    [63.26173103824287, 127.5262939739967],
    [59.17213194036634, 125.99725552606579],
    [55.23135948336011, 124.117603484143],
    [51.46940532512545, 121.9016431352323],
  ],
  [
    [162.5943573468204, 134.3920687891141],
    [135.33646211966786, 176.36554663673502],
    [131.78195700287895, 173.83014277712505],
    [128.46195285774346, 170.9945913611062],
    [125.40171692047915, 167.88047264710707],
    [122.62453943438962, 164.51148695889748],
    [120.15155639704959, 160.91327431181395],
    [118.00158870260123, 157.11321927676093],
    [116.19099890338524, 153.14024256709115],
    [114.7335666810377, 149.02458093451412],
    [113.64038397479231, 144.79755704915817],
    [112.91977056512533, 140.49134111513774],
    [112.57721075520264, 136.13870603587492],
    [112.615311632021, 131.77277799251584],
    [113.0337832249019, 127.42678433368991],
    [113.82944071234343, 123.13380069532352],
    [114.99622866043505, 118.92649927507898],
    [116.52526710836597, 114.83690017720244],
    [118.40491915028873, 110.89612772019622],
    [120.62087949919945, 107.13417356196155],
  ],
]

describe('puertasAbatibles', () => {
  it('2 hojas dan las mismas huellas que el armario de 1 módulo previo', () => {
    const e = { ...elementoDe('armario', 137, 82, 33, 100, 60, 220), alturaSuelo: 10 }
    const zonas = puertasAbatibles(e, 2)
    expect(zonas).toHaveLength(2)
    zonas.forEach((z, k) => {
      expect(z.nombre).toBe('la puerta')
      expect(z.zMin).toBe(10)
      expect(z.zMax).toBe(230)
      expect(z.huella).toHaveLength(HUELLAS_ARMARIO_1_MODULO[k].length)
      z.huella.forEach((p, i) => {
        expect(p.x).toBeCloseTo(HUELLAS_ARMARIO_1_MODULO[k][i][0], 9)
        expect(p.y).toBeCloseTo(HUELLAS_ARMARIO_1_MODULO[k][i][1], 9)
      })
    })
  })
  it('1 hoja: un solo sector con la bisagra en x = -ancho/2', () => {
    const e = elementoDe('mueble-tv', 100, 100, 0, 80, 40, 50)
    const zonas = puertasAbatibles(e, 1)
    expect(zonas).toHaveLength(1)
    const xs = zonas[0].huella.map((p) => p.x)
    expect(zonas[0].huella.some((p) => Math.hypot(p.x - 60, p.y - 120) < 1e-9)).toBe(true)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(60 - 1e-9)
    expect(Math.max(...xs)).toBeLessThan(140.5)
  })
  it('respeta zDesde y zHasta', () => {
    const e = { ...elementoDe('aparador', 0, 0, 0, 160, 45, 80), alturaSuelo: 5 }
    const [z] = puertasAbatibles(e, 2, 20, 70)
    expect(z.zMin).toBe(25)
    expect(z.zMax).toBe(75)
  })
})

describe('cajones', () => {
  it('girado 90° la caja queda a la izquierda del elemento en pantalla (-x del mundo)', () => {
    const e = elementoDe('comoda', 100, 100, 90, 100, 50, 85)
    const [z] = cajones(e, 45)
    expect(z.nombre).toBe('el cajón')
    const xs = z.huella.map((p) => p.x)
    expect(Math.max(...xs)).toBeCloseTo(75, 9)
    expect(Math.min(...xs)).toBeCloseTo(30, 9)
  })
})

describe('puertaAbatibleAbajo', () => {
  it('zMin y zMax relativos a la altura sobre el suelo', () => {
    const e = { ...elementoDe('mueble-tv', 0, 0, 0, 100, 40, 50), alturaSuelo: 20 }
    const [z] = puertaAbatibleAbajo(e, 60, 85)
    expect(z.nombre).toBe('la puerta')
    expect(z.zMin).toBe(105)
    expect(z.zMax).toBe(165)
  })
})
