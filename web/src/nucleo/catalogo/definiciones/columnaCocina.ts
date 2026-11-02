import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, puertaAbatibleAbajo, puertasAbatibles } from '../aperturas'
import { caja, desplazadasY, frentes, tiradores, yFrenteCuerpo } from '../modelos'

/** Altura del microondas sobre el horno, de su borde inferior al superior, en cm. */
const MICROONDAS: [number, number] = [147, 177]

export const columnaCocina: DefinicionTipo = {
  id: 'columna-cocina', nombre: 'columna de cocina', genero: 'f', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 45, max: 70, defecto: 60 }, fondo: { min: 55, max: 70, defecto: 60 }, alto: { min: 180, max: 240, defecto: 215 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'integrado', etiqueta: 'Integrado', valores: ['horno', 'frigorifico', 'horno y microondas'], defecto: 'horno' }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#f2efe8' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const base = [
      caja(-ancho / 2 + 3, -fondo / 2 + 3 + 2, 0, ancho / 2 - 3, yFrenteCuerpo(e, true), 8, 'cuerpo'),
      caja(-ancho / 2, -fondo / 2 + 2, 8, ancho / 2, yFrenteCuerpo(e, true), alto, 'cuerpo'),
    ]
    // 2 cm por detrás, como el módulo bajo, para que los frentes de la hilera queden en un plano.
    if (valorVariante(columnaCocina, e, 'integrado') === 'frigorifico') {
      return desplazadasY([...base, ...frentes(e, 1, 9, alto - 1, 'cuerpo'), ...tiradores(e, 1, alto - 60, 'cuerpo')], -2)
    }
    const [horno] = frentes(e, 1, 85, 145, 'cuerpo')
    if (valorVariante(columnaCocina, e, 'integrado') === 'horno y microondas') {
      const [microondas] = frentes(e, 1, MICROONDAS[0], MICROONDAS[1], 'cuerpo')
      return desplazadasY([
        ...base,
        ...frentes(e, 1, 9, 84.8, 'cuerpo'),
        { ...horno, material: 'vidrio', color: '#1f1f1f' },
        { ...microondas, material: 'vidrio', color: '#2b2b2b' },
        ...frentes(e, 1, MICROONDAS[1] + 0.2, alto - 1, 'cuerpo'),
        ...tiradores(e, 1, 78, 'cuerpo'),
        ...tiradores(e, 1, 148, 'cuerpo'),
      ], -2)
    }
    return desplazadasY([
      ...base,
      ...frentes(e, 1, 9, 84.8, 'cuerpo'),
      { ...horno, material: 'vidrio', color: '#1f1f1f' },
      ...frentes(e, 1, 145.2, alto - 1, 'cuerpo'),
      ...tiradores(e, 1, 78, 'cuerpo'),
      ...tiradores(e, 1, 148, 'cuerpo'),
    ], -2)
  },
  zonasApertura(e) {
    const integrado = valorVariante(columnaCocina, e, 'integrado')
    if (integrado === 'frigorifico') return puertasAbatibles(e, 1)
    if (integrado === 'horno') return puertaAbatibleAbajo(e, 60, 85)
    // La puerta del microondas abre de lado, con la bisagra a la izquierda.
    return [...puertaAbatibleAbajo(e, 60, 85), ...puertasAbatibles(e, 1, MICROONDAS[0], MICROONDAS[1]).map((z) => ({ ...z, nombre: 'la puerta del microondas' }))]
  },
}
