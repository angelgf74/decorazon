import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja, cilindro } from '../modelos'

export const placa: DefinicionTipo = {
  id: 'placa', nombre: 'placa', genero: 'f', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 30, max: 90, defecto: 60 }, fondo: { min: 40, max: 55, defecto: 52 }, alto: { min: 1, max: 10, defecto: 5 } },
  alturaSuelo: 85, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'superficie', etiqueta: 'Superficie', material: 'vidrio', defecto: '#1f1f1f' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const r = (Math.min(ancho, fondo) / 4) * 0.8
    const circulos = [-1, 1].flatMap((i) => [-1, 1].map((j) => ({ ...cilindro((i * ancho) / 4, (j * fondo) / 4, r, alto - 0.1, alto, 'superficie'), material: 'metal' as const, color: '#3a3a3a' })))
    return [caja(-ancho / 2, -fondo / 2, 0, ancho / 2, fondo / 2, alto - 0.1, 'superficie'), ...circulos]
  },
  zonasApertura: () => [],
}
