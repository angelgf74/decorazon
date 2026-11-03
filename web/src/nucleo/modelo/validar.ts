import { areaConSigno, esSimple } from '../geometria/poligono'
import { FORMATO_ACTUAL, TIPOS_ESTANCIA, type DocumentoDiseno, type Punto } from './documento'
import { esFechaPrecio, esPrecio, esUrlDeProducto, LIMITES_TIENDA } from './tienda'

export type ResultadoValidacion =
  | { valido: true; documento: DocumentoDiseno }
  | { valido: false; errores: string[] }

type Obj = Record<string, unknown>

const esObjeto = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const esEntero = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

class Validador {
  errores: string[] = []
  ids = new Set<string>()
  planta: Punto[] = []

  err(ruta: string, msg: string) { this.errores.push(`${ruta}: ${msg}`) }

  objeto(v: unknown, ruta: string): Obj | null {
    if (!esObjeto(v)) { this.err(ruta, 'debe ser un objeto'); return null }
    return v
  }
  lista(v: unknown, ruta: string): unknown[] | null {
    if (!Array.isArray(v)) { this.err(ruta, 'debe ser una lista'); return null }
    return v
  }
  positivo(v: unknown, ruta: string) {
    if (!esEntero(v) || v <= 0) this.err(ruta, 'debe ser un entero mayor que 0')
  }
  noNegativo(v: unknown, ruta: string) {
    if (!esEntero(v) || v < 0) this.err(ruta, 'debe ser un entero mayor o igual que 0')
  }
  entero(v: unknown, ruta: string) {
    if (!esEntero(v)) this.err(ruta, 'debe ser un entero')
  }
  texto(v: unknown, ruta: string) {
    if (typeof v !== 'string') this.err(ruta, 'debe ser un texto')
  }
  /** Texto sin espacios a los lados que cuenten: obligatorio, de 1 a max caracteres; opcional, hasta max. */
  textoAcotado(v: unknown, ruta: string, max: number, obligatorio: boolean) {
    const largo = typeof v === 'string' ? v.trim().length : -1
    if (obligatorio && (largo < 1 || largo > max)) this.err(ruta, `debe ser un texto de 1 a ${max} caracteres`)
    if (!obligatorio && (largo < 0 || largo > max)) this.err(ruta, `debe ser un texto de hasta ${max} caracteres`)
  }
  origen(o: Obj, r: string) {
    if (o.tipo === 'generico') return
    if (o.tipo !== 'tienda') { this.err(`${r}.tipo`, 'debe ser generico o tienda'); return }
    this.textoAcotado(o.proveedor, `${r}.proveedor`, LIMITES_TIENDA.proveedor, true)
    this.textoAcotado(o.nombre, `${r}.nombre`, LIMITES_TIENDA.nombre, true)
    if (o.referencia !== undefined) this.textoAcotado(o.referencia, `${r}.referencia`, LIMITES_TIENDA.referencia, false)
    if (o.url !== undefined && !esUrlDeProducto(o.url)) this.err(`${r}.url`, 'debe ser una dirección http o https')
    if (o.precio !== undefined && !esPrecio(o.precio)) this.err(`${r}.precio`, 'debe ser un importe de 0 a 1.000.000 € con dos decimales como mucho')
    if (o.fechaPrecio !== undefined) {
      if (o.precio === undefined) this.err(`${r}.fechaPrecio`, 'solo puede ir junto a un precio')
      else if (!esFechaPrecio(o.fechaPrecio)) this.err(`${r}.fechaPrecio`, 'debe ser una fecha AAAA-MM-DD')
    }
  }
  booleano(v: unknown, ruta: string) {
    if (typeof v !== 'boolean') this.err(ruta, 'debe ser verdadero o falso')
  }
  opcion(v: unknown, ruta: string, validas: readonly string[]) {
    if (typeof v !== 'string' || !validas.includes(v)) this.err(ruta, `debe ser uno de: ${validas.join(', ')}`)
  }
  punto(v: unknown, ruta: string): Punto | null {
    const o = this.objeto(v, ruta)
    if (!o) return null
    const okX = typeof o.x === 'number' && Number.isFinite(o.x)
    const okY = typeof o.y === 'number' && Number.isFinite(o.y)
    if (!okX) this.err(`${ruta}.x`, 'debe ser un número')
    if (!okY) this.err(`${ruta}.y`, 'debe ser un número')
    return okX && okY ? { x: o.x as number, y: o.y as number } : null
  }
  id(o: Obj, ruta: string) {
    if (typeof o.id !== 'string' || o.id === '') { this.err(`${ruta}.id`, 'debe ser un texto no vacío'); return }
    if (this.ids.has(o.id)) this.err(`${ruta}.id`, `id repetido: ${o.id}`)
    this.ids.add(o.id)
  }

  longitudPared(i: number): number {
    const a = this.planta[i]
    const b = this.planta[(i + 1) % this.planta.length]
    return Math.hypot(b.x - a.x, b.y - a.y)
  }
  // Comprueba pared en rango y posicion + ancho <= longitud de la pared.
  enPared(o: Obj, ruta: string) {
    this.noNegativo(o.posicion, `${ruta}.posicion`)
    this.positivo(o.ancho, `${ruta}.ancho`)
    const n = this.planta.length
    if (n < 3) return // planta no usable: ya está señalada, sin errores en cascada
    if (!esEntero(o.pared) || o.pared < 0 || o.pared >= n) {
      this.err(`${ruta}.pared`, `debe ser un entero entre 0 y ${Math.max(n - 1, 0)}`)
      return
    }
    if (esEntero(o.posicion) && esEntero(o.ancho) && o.posicion + o.ancho > this.longitudPared(o.pared) + 1e-9) {
      this.err(`${ruta}.posicion`, 'posicion + ancho supera la longitud de la pared')
    }
  }

  estancia(v: unknown) {
    const o = this.objeto(v, 'estancia')
    if (!o) return
    this.opcion(o.tipo, 'estancia.tipo', TIPOS_ESTANCIA)
    this.positivo(o.alto, 'estancia.alto')
    this.positivo(o.grosorPared, 'estancia.grosorPared')
    this.texto(o.colorParedes, 'estancia.colorParedes')
    this.texto(o.colorSuelo, 'estancia.colorSuelo')
    this.plantaForma(o.planta)
  }
  // Unico punto donde se comprueba la planta. Solo es usable (this.planta) si es simple y horaria.
  plantaForma(v: unknown) {
    const l = this.lista(v, 'estancia.planta')
    if (!l) return
    const pts = l.map((p, i) => this.punto(p, `estancia.planta[${i}]`))
    if (l.length < 3) this.err('estancia.planta', 'debe tener al menos 3 vértices')
    if (l.length < 3 || !pts.every((p): p is Punto => p !== null)) return
    if (!esSimple(pts)) { this.err('estancia.planta', 'no puede cruzarse consigo misma'); return }
    if (areaConSigno(pts) <= 0) { this.err('estancia.planta', 'debe recorrerse en sentido horario en pantalla'); return }
    this.planta = pts
  }

  aberturas(v: unknown) {
    const l = this.lista(v, 'aberturas')
    if (!l) return
    l.forEach((it, i) => {
      const r = `aberturas[${i}]`
      const o = this.objeto(it, r)
      if (!o) return
      this.id(o, r)
      this.enPared(o, r)
      this.positivo(o.alto, `${r}.alto`)
      if (o.tipo === 'puerta') {
        this.opcion(o.hoja, `${r}.hoja`, ['abatible', 'corredera'])
        this.opcion(o.bisagra, `${r}.bisagra`, ['izquierda', 'derecha'])
        this.opcion(o.abreHacia, `${r}.abreHacia`, ['dentro', 'fuera'])
      } else if (o.tipo === 'ventana') {
        this.noNegativo(o.alturaSuelo, `${r}.alturaSuelo`)
        this.booleano(o.abreHaciaDentro, `${r}.abreHaciaDentro`)
      } else this.err(`${r}.tipo`, 'debe ser puerta o ventana')
    })
  }

  estructura(v: unknown) {
    const l = this.lista(v, 'estructura')
    if (!l) return
    l.forEach((it, i) => {
      const r = `estructura[${i}]`
      const o = this.objeto(it, r)
      if (!o) return
      this.id(o, r)
      if (o.tipo === 'columna') {
        this.punto(o.centro, `${r}.centro`)
        this.positivo(o.ancho, `${r}.ancho`)
        this.positivo(o.fondo, `${r}.fondo`)
        this.entero(o.rotacion, `${r}.rotacion`)
      } else if (o.tipo === 'viga') {
        this.punto(o.desde, `${r}.desde`)
        this.punto(o.hasta, `${r}.hasta`)
        this.positivo(o.ancho, `${r}.ancho`)
        this.positivo(o.canto, `${r}.canto`)
      } else if (o.tipo === 'radiador') {
        this.enPared(o, r)
        this.positivo(o.alto, `${r}.alto`)
        this.positivo(o.fondo, `${r}.fondo`)
        this.noNegativo(o.alturaSuelo, `${r}.alturaSuelo`)
      } else this.err(`${r}.tipo`, 'debe ser columna, viga o radiador')
    })
  }

  elementos(v: unknown) {
    const l = this.lista(v, 'elementos')
    if (!l) return
    l.forEach((it, i) => {
      const r = `elementos[${i}]`
      const o = this.objeto(it, r)
      if (!o) return
      this.id(o, r)
      if (typeof o.tipo !== 'string' || o.tipo === '') this.err(`${r}.tipo`, 'debe ser un texto no vacío')
      this.punto(o.posicion, `${r}.posicion`)
      this.entero(o.rotacion, `${r}.rotacion`)
      this.noNegativo(o.alturaSuelo, `${r}.alturaSuelo`)
      const m = this.objeto(o.medidas, `${r}.medidas`)
      if (m) for (const k of ['ancho', 'fondo', 'alto']) this.positivo(m[k], `${r}.medidas.${k}`)
      const va = this.objeto(o.variantes, `${r}.variantes`)
      if (va) {
        for (const [k, x] of Object.entries(va)) {
          if (!(typeof x === 'string' || typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x)))) this.err(`${r}.variantes.${k}`, 'debe ser texto, número finito o booleano')
        }
      }
      const co = this.objeto(o.colores, `${r}.colores`)
      if (co) for (const [k, x] of Object.entries(co)) this.texto(x, `${r}.colores.${k}`)
      const or = this.objeto(o.origen, `${r}.origen`)
      if (or) this.origen(or, `${r}.origen`)
    })
  }
}

export function validarDocumento(dato: unknown): ResultadoValidacion {
  try {
    const v = new Validador()
    const o = v.objeto(dato, 'documento')
    if (!o) return { valido: false, errores: v.errores }
    if (o.formato !== FORMATO_ACTUAL) v.err('formato', `debe ser ${FORMATO_ACTUAL}`)
    v.estancia(o.estancia)
    v.aberturas(o.aberturas)
    v.estructura(o.estructura)
    v.elementos(o.elementos)
    if (v.errores.length > 0) return { valido: false, errores: v.errores }
    return { valido: true, documento: dato as DocumentoDiseno }
  } catch (e) {
    return { valido: false, errores: [`documento: ${e instanceof Error ? e.message : 'error inesperado'}`] }
  }
}
