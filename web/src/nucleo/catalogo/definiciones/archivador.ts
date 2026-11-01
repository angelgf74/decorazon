import { valorVariante, type DefinicionTipo } from '../tipos'
import type { Elemento } from '../../modelo/documento'
import { cajaEntera, cajones, puertasAbatibles } from '../aperturas'
import { caja, cajonesApilados, frentes, tiradores, yFrenteCuerpo } from '../modelos'

/** Un cajón por cada 33 cm de alto, al menos dos. */
const numeroDeCajones = (e: Elemento) => Math.max(2, Math.round(e.medidas.alto / 33))
/** Dos puertas desde 80 cm de ancho. */
const numeroDePuertas = (e: Elemento) => (e.medidas.ancho >= 80 ? 2 : 1)
const conCajones = (e: Elemento) => valorVariante(archivador, e, 'frente') === 'cajones'

export const archivador: DefinicionTipo = {
  id: 'archivador', nombre: 'archivador', genero: 'm', categoria: 'mueble', estancias: ['despacho'],
  medidas: { ancho: { min: 40, max: 100, defecto: 47 }, fondo: { min: 40, max: 70, defecto: 62 }, alto: { min: 70, max: 200, defecto: 132 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'frente', etiqueta: 'Frente', valores: ['cajones', 'puertas'], defecto: 'cajones' }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'metal', defecto: '#9aa0a6' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const cuerpo = caja(-ancho / 2, -fondo / 2, 0, ancho / 2, yFrenteCuerpo(e, true), alto, 'cuerpo')
    if (conCajones(e)) return [cuerpo, ...cajonesApilados(e, numeroDeCajones(e), 1, alto - 1, 'cuerpo')]
    const n = numeroDePuertas(e)
    return [cuerpo, ...frentes(e, n, 1, alto - 1, 'cuerpo'), ...tiradores(e, n, alto / 2 - 0.75, 'cuerpo')]
  },
  zonasApertura: (e) => (conCajones(e) ? cajones(e, e.medidas.fondo - 5) : puertasAbatibles(e, numeroDePuertas(e))),
}
