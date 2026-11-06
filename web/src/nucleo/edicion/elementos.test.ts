import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogo/catalogoBase'
import { documentoNuevo } from '../modelo/crear'
import { elementoNuevo } from '../catalogo/elemento'
import type { DocumentoDiseno } from '../modelo/documento'
import { validarDocumento } from '../modelo/validar'
import { detectarConflictos } from '../conflictos/detectar'
import {
  anadirElemento, bloquearElemento, cambiarTipo, desplazarElemento, desvincularTienda, duplicarElemento, editarElemento, moverElemento, quitarElemento,
  renombrarElemento, vincularTienda, voltearElemento,
} from './elementos'
import type { OrigenTienda } from '../modelo/documento'

const sala = (): DocumentoDiseno => documentoNuevo('dormitorio', 400, 330, 250)
const conArmario = () => anadirElemento(sala(), catalogoBase, 'armario', { x: 200, y: 165 })

describe('anadirElemento', () => {
  it('crea el elemento imantado sin mutar el documento ni la posición', () => {
    const doc = sala()
    const posicion = { x: 200, y: 38 }
    const { documento, id } = anadirElemento(doc, catalogoBase, 'armario', posicion)
    expect(doc.elementos).toEqual([])
    const e = documento.elementos.find(x => x.id === id)!
    expect(e.tipo).toBe('armario')
    expect(e.posicion).toEqual({ x: 200, y: 30 })
    expect(posicion).toEqual({ x: 200, y: 38 })
    expect(validarDocumento(documento).valido).toBe(true)
  })
})

describe('moverElemento', () => {
  it('mueve e imanta, sin mutar', () => {
    const { documento, id } = conArmario()
    const r = moverElemento(documento, catalogoBase, id, { x: 50, y: 300 }, 0, false)
    expect(r.elementos[0].posicion).toEqual({ x: 50, y: 300 })
    expect(documento.elementos[0].posicion).toEqual({ x: 200, y: 165 })
    expect(moverElemento(documento, catalogoBase, id, { x: 100, y: 100 }, 93, true).elementos[0].rotacion).toBe(93)
  })
})

describe('desplazarElemento', () => {
  it('suma el desplazamiento sin imantar, sin mutar y redondeado a 2 decimales', () => {
    // Armario a ras de la pared de arriba (y = 30, imantado): un paso de 1 cm hacia abajo tiene que alejarlo de verdad.
    const { documento, id } = anadirElemento(sala(), catalogoBase, 'armario', { x: 200, y: 38 })
    expect(documento.elementos[0].posicion).toEqual({ x: 200, y: 30 })
    const r = desplazarElemento(documento, id, 0, 1)
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 31 })
    expect(documento.elementos[0].posicion).toEqual({ x: 200, y: 30 })
    expect(desplazarElemento(r, id, 10, -1).elementos[0].posicion).toEqual({ x: 210, y: 30 })
    expect(desplazarElemento(documento, id, 0.004, 0.006).elementos[0].posicion).toEqual({ x: 200, y: 30.01 })
  })
  it('conserva el giro y con un id que no existe devuelve el mismo documento', () => {
    const { documento, id } = conArmario()
    const girado = editarElemento(documento, catalogoBase, id, { rotacion: 93 })
    expect(desplazarElemento(girado, id, 1, 0).elementos[0].rotacion).toBe(93)
    expect(desplazarElemento(documento, 'otro', 1, 0)).toBe(documento)
  })
})

describe('editarElemento', () => {
  it('ajusta las medidas al rango', () => {
    const { documento, id } = conArmario()
    const r = editarElemento(documento, catalogoBase, id, { medidas: { ancho: 9999 } })
    expect(r.elementos[0].medidas).toEqual({ ancho: 400, fondo: 60, alto: 220 })
    expect(documento.elementos[0].medidas.ancho).toBe(100)
  })
  it('normaliza el giro', () => {
    const { documento, id } = conArmario()
    expect(editarElemento(documento, catalogoBase, id, { rotacion: -90 }).elementos[0].rotacion).toBe(270)
    expect(editarElemento(documento, catalogoBase, id, { rotacion: 725.4 }).elementos[0].rotacion).toBe(5)
  })
  it('recorta alturaSuelo si es editable', () => {
    const { documento, id } = anadirElemento(sala(), catalogoBase, 'cuadro', { x: 200, y: 165 })
    const r = editarElemento(documento, catalogoBase, id, { alturaSuelo: 300 })
    expect(r.elementos[0].alturaSuelo).toBe(210)
    expect(editarElemento(documento, catalogoBase, id, { alturaSuelo: -5 }).elementos[0].alturaSuelo).toBe(0)
  })
  it('ignora alturaSuelo si no es editable', () => {
    const { documento, id } = conArmario()
    expect(editarElemento(documento, catalogoBase, id, { alturaSuelo: 50 }).elementos[0].alturaSuelo).toBe(0)
  })
  it('fusiona variantes y colores', () => {
    const { documento, id } = conArmario()
    const r = editarElemento(documento, catalogoBase, id, { variantes: { modulos: 3 }, colores: { cuerpo: '#000000' } })
    expect(r.elementos[0].variantes).toEqual({ puertas: 'abatibles', modulos: 3 })
    expect(r.elementos[0].colores).toEqual({ cuerpo: '#000000' })
    expect(documento.elementos[0].variantes.modulos).toBe(1)
  })
})

describe('duplicarElemento', () => {
  it('da un id nuevo con el mismo tipo y medidas, desplazado', () => {
    const { documento, id } = conArmario()
    const r = duplicarElemento(documento, catalogoBase, id)
    expect(r.id).not.toBe(id)
    expect(r.documento.elementos).toHaveLength(2)
    const copia = r.documento.elementos.find(e => e.id === r.id)!
    const original = documento.elementos[0]
    expect(copia.tipo).toBe(original.tipo)
    expect(copia.medidas).toEqual(original.medidas)
    expect(copia.medidas).not.toBe(original.medidas)
    expect(copia.posicion).toEqual({ x: 220, y: 185 })
    expect(validarDocumento(r.documento).valido).toBe(true)
  })
})

describe('quitarElemento', () => {
  it('quita el elemento y con un id inexistente devuelve el mismo documento', () => {
    const { documento, id } = conArmario()
    expect(quitarElemento(documento, id).elementos).toEqual([])
    expect(documento.elementos).toHaveLength(1)
    expect(quitarElemento(documento, 'no-existe')).toBe(documento)
  })
})

describe('editarElemento con el elemento pegado a una pared', () => {
  it('un armario a ras de la pared de arriba que crece de fondo sigue a ras y sin salirse', () => {
    const { documento, id } = anadirElemento(sala(), catalogoBase, 'armario', { x: 200, y: 38 })
    expect(documento.elementos[0].posicion).toEqual({ x: 200, y: 30 })
    const r = editarElemento(documento, catalogoBase, id, { medidas: { fondo: 66 } })
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 33 })
    expect(detectarConflictos(r, catalogoBase).filter(c => c.tipo === 'fueraDeEstancia')).toEqual([])
  })
  it('al girarlo 90° también vuelve a quedar a ras', () => {
    const { documento, id } = anadirElemento(sala(), catalogoBase, 'armario', { x: 200, y: 38 })
    const r = editarElemento(documento, catalogoBase, id, { rotacion: 90 })
    expect(r.elementos[0].rotacion).toBe(90)
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 50 })
  })
  it('un elemento suelto no se mueve al cambiar sus medidas', () => {
    const { documento, id } = conArmario()
    const r = editarElemento(documento, catalogoBase, id, { medidas: { fondo: 66, ancho: 150 } })
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 165 })
  })
})

describe('editarElemento solo conserva a ras las paredes que el elemento toca', () => {
  const armarioEn = (y: number) => {
    const { documento, id } = conArmario()
    const doc = { ...documento, elementos: documento.elementos.map(e => ({ ...e, posicion: { x: 200, y } })) }
    return { documento: doc, id }
  }

  it('un armario a 10 cm de la pared no salta a ella al cambiar su color', () => {
    const { documento, id } = armarioEn(40)
    const r = editarElemento(documento, catalogoBase, id, { colores: { cuerpo: '#000000' } })
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 40 })
  })
  it('ni al cambiar su fondo', () => {
    const { documento, id } = armarioEn(40)
    const r = editarElemento(documento, catalogoBase, id, { medidas: { fondo: 66 } })
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 40 })
  })
  it('ligeramente solapado con la pared cuenta como tocarla', () => {
    const { documento, id } = armarioEn(29.95)
    const r = editarElemento(documento, catalogoBase, id, { medidas: { fondo: 66 } })
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 33 })
  })
  it('si no cambian medidas ni giro no se re-imanta: cambiar solo variantes deja la posición tal cual', () => {
    const { documento, id } = armarioEn(29.95)
    const r = editarElemento(documento, catalogoBase, id, { variantes: { modulos: 3 } })
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 29.95 })
  })
})

describe('muebles de tienda', () => {
  const pax: OrigenTienda = { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX', referencia: '805.483.84', precio: 199, fechaPrecio: '2026-11-03' }
  const medidasPax = { ancho: 100, fondo: 58, alto: 201 }

  it('vincular pone el producto y sus medidas, sin mutar, y el documento sigue siendo válido', () => {
    const { documento, id } = conArmario()
    const r = vincularTienda(documento, catalogoBase, id, pax, medidasPax)
    expect(documento.elementos[0].origen).toEqual({ tipo: 'generico' })
    const e = r.elementos[0]
    expect(e.origen).toEqual(pax)
    expect(e.origen).not.toBe(pax)
    expect(e.medidas).toEqual(medidasPax)
    expect(validarDocumento(r).valido).toBe(true)
  })

  it('las medidas del producto se recortan al rango del tipo', () => {
    const { documento, id } = conArmario()
    const r = vincularTienda(documento, catalogoBase, id, pax, { ancho: 1000, fondo: 58, alto: 201.4 })
    expect(r.elementos[0].medidas).toEqual({ ancho: 400, fondo: 58, alto: 201 })
  })

  it('editarElemento no cambia las medidas de un mueble de tienda, pero sí lo demás', () => {
    const { documento, id } = conArmario()
    const vinculado = vincularTienda(documento, catalogoBase, id, pax, medidasPax)
    const r = editarElemento(vinculado, catalogoBase, id, { medidas: { ancho: 150 }, colores: { cuerpo: '#000000' } })
    expect(r.elementos[0].medidas).toEqual(medidasPax)
    expect(r.elementos[0].colores.cuerpo).toBe('#000000')
  })

  it('desvincular vuelve a genérico y conserva las medidas; con uno genérico o un id que no existe, nada', () => {
    const { documento, id } = conArmario()
    const vinculado = vincularTienda(documento, catalogoBase, id, pax, medidasPax)
    const r = desvincularTienda(vinculado, id)
    expect(r.elementos[0].origen).toEqual({ tipo: 'generico' })
    expect(r.elementos[0].medidas).toEqual(medidasPax)
    expect(desvincularTienda(documento, id)).toBe(documento)
    expect(desvincularTienda(vinculado, 'otro')).toBe(vinculado)
  })

  it('vincular un id que no existe devuelve el mismo documento', () => {
    const { documento } = conArmario()
    expect(vincularTienda(documento, catalogoBase, 'otro', pax, medidasPax)).toBe(documento)
  })

  it('duplicar copia el producto, sin compartir el objeto', () => {
    const { documento, id } = conArmario()
    const vinculado = vincularTienda(documento, catalogoBase, id, pax, medidasPax)
    const { documento: r, id: copia } = duplicarElemento(vinculado, catalogoBase, id)
    const e = r.elementos.find((x) => x.id === copia)!
    expect(e.origen).toEqual(pax)
    expect(e.origen).not.toBe(vinculado.elementos[0].origen)
  })
})

describe('cambiarTipo', () => {
  it('conserva id, posición, giro y producto; recorta las medidas al tipo nuevo; variantes por defecto; colores por clave', () => {
    const { documento, id } = conArmario()
    const pax: OrigenTienda = { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX / GRIMO' }
    const preparado = { ...documento, elementos: documento.elementos.map((e) => ({ ...e, rotacion: 90, medidas: { ancho: 300, fondo: 60, alto: 220 }, variantes: { puertas: 'correderas', modulos: 3 }, colores: { cuerpo: '#111111' }, origen: pax })) }
    const r = cambiarTipo(preparado, catalogoBase, id, 'armario-esquinero')
    const e = r.elementos[0]!
    expect(e).toMatchObject({ id, tipo: 'armario-esquinero', rotacion: 90, origen: pax })
    expect(e.medidas).toEqual({ ancho: 200, fondo: 80, alto: 220 })
    expect(e.variantes).toEqual({ rincon: 'izquierda' })
    expect(e.medidasExtra).toEqual({ profundidadFondo: 58, anchoAla: 58, huecoAncho: 0, huecoFondo: 0 })
    expect(e.colores).toEqual({ cuerpo: '#111111', puertas: '#f2f0ea' })
    expect(validarDocumento(r).valido).toBe(true)
  })

  it('sin cambios con el mismo tipo, un tipo desconocido o un id que no existe', () => {
    const { documento, id } = conArmario()
    expect(cambiarTipo(documento, catalogoBase, id, 'armario')).toBe(documento)
    expect(cambiarTipo(documento, catalogoBase, id, 'nave-espacial')).toBe(documento)
    expect(cambiarTipo(documento, catalogoBase, 'otro', 'cama')).toBe(documento)
  })
})

describe('cambiarTipo: altura y rincón', () => {
  it('de un tipo de suelo a uno colgado, la altura por defecto del nuevo; entre colgados, la que tenía', () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    const { documento, id } = anadirElemento(doc, catalogoBase, 'comoda', { x: 200, y: 30 })
    const espejo = cambiarTipo(documento, catalogoBase, id, 'cuadro')
    expect(espejo.elementos[0]!.alturaSuelo).toBe(catalogoBase.get('cuadro')!.alturaSuelo)
    const alto = editarElemento(espejo, catalogoBase, id, { alturaSuelo: 120 })
    expect(cambiarTipo(alto, catalogoBase, id, 'modulo-alto').elementos[0]!.alturaSuelo).toBe(120)
  })

  it('un armario esquinero cerca del rincón se pega a las dos paredes', () => {
    const { documento, id } = anadirElemento(sala(), catalogoBase, 'armario-esquinero', { x: 62, y: 60 })
    expect(documento.elementos.find((e) => e.id === id)!.posicion).toEqual({ x: 55, y: 55 })
  })
})

describe('medidas extra al editar', () => {
  const conEsquinero = () => anadirElemento(sala(), catalogoBase, 'armario-esquinero', { x: 62, y: 60 })

  it('un esquinero nuevo lleva las de por defecto; un armario normal, ninguna', () => {
    const { documento, id } = conEsquinero()
    expect(documento.elementos.find((e) => e.id === id)!.medidasExtra).toEqual({ profundidadFondo: 58, anchoAla: 58, huecoAncho: 0, huecoFondo: 0 })
    expect(conArmario().documento.elementos[0]!.medidasExtra).toBeUndefined()
  })

  it('editar las recorta a su rango; duplicar las copia sin compartir el objeto', () => {
    const { documento, id } = conEsquinero()
    const r = editarElemento(documento, catalogoBase, id, { medidasExtra: { huecoAncho: 11, huecoFondo: 999 } })
    const e = r.elementos.find((x) => x.id === id)!
    // El fondo del hueco no pasa del cuerpo del fondo (58), aunque su rango general llegue a 70.
    expect(e.medidasExtra).toEqual({ profundidadFondo: 58, anchoAla: 58, huecoAncho: 11, huecoFondo: 58 })
    const { documento: d2, id: copia } = duplicarElemento(r, catalogoBase, id)
    const c = d2.elementos.find((x) => x.id === copia)!
    expect(c.medidasExtra).toEqual(e.medidasExtra)
    expect(c.medidasExtra).not.toBe(e.medidasExtra)
  })

  it('en un mueble de tienda son fijas: solo las cambia vincularTienda', () => {
    const { documento, id } = conEsquinero()
    const pax: OrigenTienda = { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX / GRIMO' }
    const vinculado = vincularTienda(documento, catalogoBase, id, pax, { ancho: 111, fondo: 111, alto: 201 }, { huecoAncho: 11, huecoFondo: 58 })
    const e = vinculado.elementos.find((x) => x.id === id)!
    expect(e.medidasExtra).toMatchObject({ huecoAncho: 11, huecoFondo: 58 })
    const r = editarElemento(vinculado, catalogoBase, id, { medidasExtra: { huecoAncho: 0 } })
    expect(r.elementos.find((x) => x.id === id)!.medidasExtra).toEqual(e.medidasExtra)
  })

  it('cambiar de tipo pone las del tipo nuevo, o ninguna si no tiene', () => {
    const { documento, id } = conArmario()
    const esquinero = cambiarTipo(documento, catalogoBase, id, 'armario-esquinero')
    expect(esquinero.elementos[0]!.medidasExtra).toEqual({ profundidadFondo: 58, anchoAla: 58, huecoAncho: 0, huecoFondo: 0 })
    expect(cambiarTipo(esquinero, catalogoBase, id, 'armario').elementos[0]!.medidasExtra).toBeUndefined()
  })
})

describe('medidas extra: lo que no debe mover el mueble', () => {
  // Esquinero contra la pared del fondo y un armario a 6 cm por su derecha (dentro del alcance del imán).
  function conVecino(extra?: Record<string, number>) {
    const doc = documentoNuevo('dormitorio', 600, 330, 250)
    const esquinero = { ...elementoNuevo(catalogoBase.get('armario-esquinero')!, { x: 311, y: 55 }, 'esq'), variantes: { rincon: 'izquierda', profundidad: 58 } }
    if (extra) esquinero.medidasExtra = extra
    else delete esquinero.medidasExtra
    const armario = elementoNuevo(catalogoBase.get('armario')!, { x: 422, y: 30 }, 'arm')
    return { ...doc, elementos: [esquinero, armario] }
  }

  it('cambiar el color de un esquinero guardado antes (sin medidas extra) no lo mueve', () => {
    const r = editarElemento(conVecino(), catalogoBase, 'esq', { colores: { cuerpo: '#000000' } })
    expect(r.elementos[0]!.posicion).toEqual({ x: 311, y: 55 })
  })

  it('tampoco si sus medidas extra vienen en otro orden (jsonb las reordena)', () => {
    const r = editarElemento(conVecino({ anchoAla: 58, huecoAncho: 0, huecoFondo: 0, profundidadFondo: 58 }), catalogoBase, 'esq', { colores: { cuerpo: '#000000' } })
    expect(r.elementos[0]!.posicion).toEqual({ x: 311, y: 55 })
  })

  it('un valor no finito no se guarda', () => {
    const doc = conVecino({ profundidadFondo: 58, anchoAla: 58, huecoAncho: 0, huecoFondo: 0 })
    const r = editarElemento(doc, catalogoBase, 'esq', { medidasExtra: { huecoAncho: Number.NaN } })
    expect(r.elementos[0]!.medidasExtra!.huecoAncho).toBe(0)
    expect(validarDocumento(r).valido).toBe(true)
  })
})

describe('bloquearElemento', () => {
  it('pone bloqueado: true y al quitarlo el campo desaparece; con un id que no existe, el mismo documento', () => {
    const { documento, id } = conArmario()
    const b = bloquearElemento(documento, id, true)
    expect(b.elementos[0]!.bloqueado).toBe(true)
    expect(validarDocumento(b).valido).toBe(true)
    const libre = bloquearElemento(b, id, false)
    expect('bloqueado' in libre.elementos[0]!).toBe(false)
    expect(bloquearElemento(documento, 'otro', true)).toBe(documento)
    expect(bloquearElemento(documento, id, false)).toBe(documento)
  })

  it('un bloqueado no se mueve ni se desplaza ni se gira, pero sí cambia de color', () => {
    const { documento, id } = conArmario()
    const b = bloquearElemento(documento, id, true)
    expect(moverElemento(b, catalogoBase, id, { x: 50, y: 50 }, 90, false)).toBe(b)
    expect(desplazarElemento(b, id, 1, 0)).toBe(b)
    const editado = editarElemento(b, catalogoBase, id, { rotacion: 90, colores: { cuerpo: '#111111' } })
    expect(editado.elementos[0]!.rotacion).toBe(0)
    expect(editado.elementos[0]!.colores.cuerpo).toBe('#111111')
  })
})

describe('renombrarElemento', () => {
  it('recorta los espacios y corta a 60 caracteres; solo espacios o vacío quita el campo', () => {
    const { documento, id } = conArmario()
    const r = renombrarElemento(documento, id, '  Armario de Ana  ')
    expect(r.elementos[0]!.nombre).toBe('Armario de Ana')
    expect(renombrarElemento(documento, id, 'a'.repeat(70)).elementos[0]!.nombre).toBe('a'.repeat(60))
    expect('nombre' in renombrarElemento(r, id, '   ').elementos[0]!).toBe(false)
    expect(renombrarElemento(documento, id, '')).toBe(documento)
    expect(renombrarElemento(r, id, 'Armario de Ana')).toBe(r)
    expect(renombrarElemento(documento, 'otro', 'x')).toBe(documento)
  })
})

describe('voltearElemento', () => {
  it('intercambia izquierda y derecha en las variantes de lado; sin lado elegido o sin variante de lado, el mismo documento', () => {
    const conSofa = anadirElemento(sala(), catalogoBase, 'sofa', { x: 200, y: 165 })
    const sinChaise = conSofa.documento
    expect(voltearElemento(sinChaise, catalogoBase, conSofa.id)).toBe(sinChaise)
    const izquierda = editarElemento(sinChaise, catalogoBase, conSofa.id, { variantes: { chaise: 'izquierda' } })
    const volteado = voltearElemento(izquierda, catalogoBase, conSofa.id)
    expect(volteado.elementos[0]!.variantes.chaise).toBe('derecha')
    expect(voltearElemento(volteado, catalogoBase, conSofa.id).elementos[0]!.variantes.chaise).toBe('izquierda')
    const { documento, id } = conArmario()
    expect(voltearElemento(documento, catalogoBase, id)).toBe(documento)
    expect(voltearElemento(documento, catalogoBase, 'otro')).toBe(documento)
  })
})

describe('bloqueado y nombre al cambiar de tipo y al duplicar', () => {
  it('cambiarTipo conserva los dos; duplicar copia el nombre y la copia nace libre', () => {
    const { documento, id } = conArmario()
    const preparado = renombrarElemento(bloquearElemento(documento, id, true), id, 'Armario de Ana')
    const cambiado = cambiarTipo(preparado, catalogoBase, id, 'armario-esquinero').elementos[0]!
    expect(cambiado).toMatchObject({ bloqueado: true, nombre: 'Armario de Ana' })
    const r = duplicarElemento(preparado, catalogoBase, id)
    const copia = r.documento.elementos.find((e) => e.id === r.id)!
    expect(copia.nombre).toBe('Armario de Ana')
    expect('bloqueado' in copia).toBe(false)
  })
})
