import { useEffect } from 'react'
import { quitarDeEstancia, quitarVertice } from '../nucleo'
import { almacen } from './estado/almacen'
import { borrar, duplicar, girar90 } from './estado/elementos'
import { hayArrastre } from './lienzo/arrastres'

function enCampo(destino: EventTarget | null): boolean {
  if (!(destino instanceof Element)) return false
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(destino.tagName)
}

export function useAtajos(): void {
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (enCampo(e.target) || document.querySelector('dialog[open]') !== null) return
      const e0 = almacen.getState()
      const mando = e.ctrlKey || e.metaKey
      const tecla = e.key.toLowerCase()
      if (mando && tecla === 'z' && !e.shiftKey) {
        e.preventDefault()
        e0.deshacer()
      } else if (mando && (tecla === 'y' || (tecla === 'z' && e.shiftKey))) {
        e.preventDefault()
        e0.rehacer()
      } else if (e.key === 'Escape') {
        e0.seleccionar(null)
      } else if (e0.paso === 2 && e0.seleccion?.tipo === 'elemento') {
        const id = e0.seleccion.id
        if (hayArrastre()) return
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          borrar(id)
        } else if (tecla === 'r' && !mando && !e.altKey) {
          e.preventDefault()
          girar90(id, e.shiftKey ? -1 : 1)
        } else if (tecla === 'd' && mando) {
          e.preventDefault()
          duplicar(id)
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
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [])
}
