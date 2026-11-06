import { useEffect } from 'react'
import { desplazarElemento, editarAbertura, editarEstructura, longitudPared, moverVertice, quitarDeEstancia, quitarVertice } from '../nucleo'
import { almacen } from './estado/almacen'
import { borrar, duplicar, girar90 } from './estado/elementos'
import { hayArrastre } from './lienzo/arrastres'

const FLECHAS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 }, ArrowUp: { dx: 0, dy: -1 }, ArrowDown: { dx: 0, dy: 1 },
}
const PASO_CM = 1
const PASO_GRANDE_CM = 10

function enCampo(destino: EventTarget | null): boolean {
  if (!(destino instanceof Element)) return false
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(destino.tagName)
}

/**
 * Mueve lo seleccionado `(dx, dy)` cm, sin imán (un ajuste fino que el imán desharía). Los muebles solo en 2D; en el paso 1,
 * esquinas, columnas y vigas van libres, y puertas, ventanas y radiadores solo a lo largo de su pared, sin salirse de ella.
 * Todo con el grupo `teclado:…`: las pulsaciones seguidas son un solo paso de deshacer (se cierra al soltar la tecla).
 */
function mover(dx: number, dy: number): boolean {
  const e0 = almacen.getState()
  const s = e0.seleccion
  const doc = e0.documento
  if (s === null || doc === null) return false
  if (e0.paso === 2) {
    if (s.tipo !== 'elemento' || e0.vista === '3d') return false
    e0.cambiar((d) => desplazarElemento(d, s.id, dx, dy), `teclado:${s.id}`)
    return true
  }
  if (e0.paso !== 1) return false
  if (s.tipo === 'vertice') {
    const v = doc.estancia.planta[s.indice]
    if (!v) return false
    e0.intentar((d) => moverVertice(d, s.indice, { x: v.x + dx, y: v.y + dy }), `teclado:v${s.indice}`)
    return true
  }
  const grupo = `teclado:${'id' in s ? s.id : ''}`
  if (s.tipo === 'abertura') {
    const a = doc.aberturas.find((x) => x.id === s.id)
    if (!a || dx === 0) return false
    const posicion = enPared(doc.estancia.planta, a.pared, a.ancho, a.posicion + dx)
    e0.intentar((d) => editarAbertura(d, s.id, { posicion }), grupo)
    return true
  }
  if (s.tipo === 'estructura') {
    const x = doc.estructura.find((e) => e.id === s.id)
    if (!x) return false
    if (x.tipo === 'radiador') {
      if (dx === 0) return false
      const posicion = enPared(doc.estancia.planta, x.pared, x.ancho, x.posicion + dx)
      e0.intentar((d) => editarEstructura(d, s.id, { posicion }), grupo)
    } else if (x.tipo === 'columna') {
      e0.intentar((d) => editarEstructura(d, s.id, { centro: { x: x.centro.x + dx, y: x.centro.y + dy } }), grupo)
    } else {
      e0.intentar((d) => editarEstructura(d, s.id, { desde: { x: x.desde.x + dx, y: x.desde.y + dy }, hasta: { x: x.hasta.x + dx, y: x.hasta.y + dy } }), grupo)
    }
    return true
  }
  return false
}

/** Posición a lo largo de la pared recortada a lo que cabe, como al arrastrar (`posicionEnPared`). */
function enPared(planta: { x: number; y: number }[], pared: number, ancho: number, posicion: number): number {
  const maximo = Math.max(0, Math.floor(longitudPared(planta, pared) - ancho))
  return Math.min(maximo, Math.max(0, Math.round(posicion)))
}

export function useAtajos(): void {
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      // Con un diálogo abierto (también la hoja para imprimir) el diseño de detrás no se toca.
      if (enCampo(e.target) || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]') !== null) return
      // Mientras una pieza sigue al puntero, solo Escape actúa: lo que edita espera a que se suelte.
      if (hayArrastre() && e.key !== 'Escape') return
      const e0 = almacen.getState()
      const mando = e.ctrlKey || e.metaKey
      const tecla = e.key.toLowerCase()
      const flecha = FLECHAS[e.key]
      if (flecha !== undefined) {
        // Un menú abierto ya usó la flecha para moverse por sus opciones (y lo dice con preventDefault).
        if (e.defaultPrevented || mando || e.altKey) return
        const paso = e.shiftKey ? PASO_GRANDE_CM : PASO_CM
        if (mover(flecha.dx * paso, flecha.dy * paso)) e.preventDefault()
      } else if (mando && tecla === 'z' && !e.shiftKey) {
        e.preventDefault()
        e0.deshacer()
      } else if (mando && (tecla === 'y' || (tecla === 'z' && e.shiftKey))) {
        e.preventDefault()
        e0.rehacer()
      } else if (e.key === 'Escape') {
        e0.seleccionar(null)
      } else if (e0.paso === 2 && e0.seleccion?.tipo === 'elemento') {
        const id = e0.seleccion.id
        // Mover y girar (R, Ctrl+D) solo se hace en 2D (§4.2).
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          borrar(id)
        } else if (e0.vista !== '3d' && tecla === 'r' && !mando && !e.altKey) {
          e.preventDefault()
          girar90(id, e.shiftKey ? -1 : 1)
        } else if (tecla === 'd' && mando) {
          // En 3D no duplica, pero tampoco deja que el navegador abra "añadir marcador".
          e.preventDefault()
          if (e0.vista !== '3d') duplicar(id)
        }
      } else if (e0.paso === 1 && (e.key === 'Delete' || e.key === 'Backspace')) {
        const s = e0.seleccion
        if (s?.tipo === 'abertura' || s?.tipo === 'estructura') {
          e.preventDefault()
          e0.cambiar((d) => quitarDeEstancia(d, s.id))
        } else if (s?.tipo === 'vertice') {
          e.preventDefault()
          if (e0.intentar((d) => quitarVertice(d, s.indice))) e0.seleccionar(null)
        }
      }
    }
    // Soltar una flecha cierra el paso de deshacer: la siguiente pulsación empieza otro.
    function alSoltar(e: KeyboardEvent) {
      if (FLECHAS[e.key] !== undefined) almacen.getState().terminarGrupo()
    }
    window.addEventListener('keydown', alPulsar)
    window.addEventListener('keyup', alSoltar)
    return () => {
      window.removeEventListener('keydown', alPulsar)
      window.removeEventListener('keyup', alSoltar)
    }
  }, [])
}
