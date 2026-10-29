import type { Catalogo } from './tipos'
import { cama } from './definiciones/cama'
import { armario } from './definiciones/armario'
import { comoda } from './definiciones/comoda'
import { alfombra } from './definiciones/alfombra'
import { mesita } from './definiciones/mesita'
import { escritorio } from './definiciones/escritorio'
import { silla } from './definiciones/silla'
import { estanteria } from './definiciones/estanteria'
import { sofa } from './definiciones/sofa'
import { sillon } from './definiciones/sillon'
import { mesaCentro } from './definiciones/mesaCentro'
import { muebleTv } from './definiciones/muebleTv'
import { mesa } from './definiciones/mesa'
import { aparador } from './definiciones/aparador'

const tipos = [cama, armario, comoda, alfombra, mesita, escritorio, silla, estanteria, sofa, sillon, mesaCentro, muebleTv, mesa, aparador]

export const catalogoBase: Catalogo = new Map(tipos.map((d) => [d.id, d]))
