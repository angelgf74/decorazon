import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { extrusion, tubo } from '../modelos'
import { onda } from '../perfiles'

/** Radio de la barra y grueso de la tela, en cm; un pliegue de la tela cada ANCHO_PLIEGUE cm. */
const BARRA = 1.25
const TELA = 1
const ANCHO_PLIEGUE = 12

export const cortina: DefinicionTipo = {
  id: 'cortina', nombre: 'cortina', genero: 'f', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina', 'despacho', 'bano'],
  medidas: { ancho: { min: 60, max: 400, defecto: 160 }, fondo: { min: 5, max: 20, defecto: 10 }, alto: { min: 100, max: 300, defecto: 240 } },
  alturaSuelo: 0, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'tejido', etiqueta: 'Tejido', material: 'tela', defecto: '#e9e1d3' }],
  pisable: true, bloqueaPaso: false, sobreVentana: true,
  volumenes: cajaEntera,
  // Dos paños recogidos a los lados (un cuarto del ancho cada uno), ondulados en planta, bajo una barra de tubo de lado a lado.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const pano = ancho / 4
    const pliegues = Math.max(2, Math.round(pano / ANCHO_PLIEGUE))
    const amplitud = fondo / 2 - 1.5
    return [
      ...[-ancho / 2, ancho / 4].map((x0) => extrusion('planta', onda(x0, x0 + pano, 0, amplitud, pliegues, TELA), 0, alto - 3, 'tejido')),
      { ...tubo([[-ancho / 2, 0, alto - BARRA], [ancho / 2, 0, alto - BARRA]], BARRA, 'tejido'), material: 'metal' as const, color: '#8a8a8a' },
    ]
  },
  zonasApertura: () => [],
}
