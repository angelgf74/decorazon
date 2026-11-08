import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'
import { frentes, caja, tiradores, yFrenteCuerpo } from '../modelos'

export const armario: DefinicionTipo = {
  id: 'armario', nombre: 'armario', genero: 'm', categoria: 'mueble', estancias: ['dormitorio'],
  medidas: { ancho: { min: 40, max: 400, defecto: 100 }, fondo: { min: 35, max: 70, defecto: 60 }, alto: { min: 60, max: 260, defecto: 220 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [
    { clave: 'puertas', etiqueta: 'Puertas', valores: ['abatibles', 'correderas'], defecto: 'abatibles' },
    { clave: 'modulos', etiqueta: 'Módulos', valores: [1, 2, 3, 4], defecto: 1 },
  ],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', materiales: ['lacado', 'madera'], defecto: '#e8e4dc' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const corredera = valorVariante(armario, e, 'puertas') === 'correderas'
    const cuerpo = caja(-ancho / 2, -fondo / 2, 0, ancho / 2, yFrenteCuerpo(e, true), alto, 'cuerpo')
    if (corredera) {
      const y = yFrenteCuerpo(e, true)
      return [
        cuerpo,
        caja(-ancho / 2, y, 1, 2, y + 1, alto - 1, 'cuerpo'),
        caja(-2, y + 1, 1, ancho / 2, y + 2, alto - 1, 'cuerpo'),
      ]
    }
    const n = 2 * Number(valorVariante(armario, e, 'modulos'))
    return [cuerpo, ...frentes(e, n, 1, alto - 1, 'cuerpo'), ...tiradores(e, n, alto / 2 - 0.75, 'cuerpo')]
  },
  zonasApertura(e) {
    if (valorVariante(armario, e, 'puertas') !== 'abatibles') return []
    // valorVariante garantiza uno de los valores numéricos de la definición (1–4).
    return puertasAbatibles(e, 2 * Number(valorVariante(armario, e, 'modulos')))
  },
}
