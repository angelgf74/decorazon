import type { Catalogo } from './tipos'
import { cama } from './definiciones/cama'
import { armario } from './definiciones/armario'
import { comoda } from './definiciones/comoda'
import { alfombra } from './definiciones/alfombra'

export const catalogoBase: Catalogo = new Map([cama, armario, comoda, alfombra].map((d) => [d.id, d]))
