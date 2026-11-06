import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { textos } from '../textos'
import { almacen } from './estado/almacen'
import { marcarGuiaVista } from './marcaDeGuia'

const t = textos.guia

/** A qué se señala en cada paso: el plano, el botón «2 Amueblar» y el zoom con Encuadrar. */
const OBJETIVOS = ['.lienzo__svg', '.pasos .pasos__paso:last-child', '.lienzo__controles'] as const
/** Aire entre el anillo y lo que señala. */
const MARGEN_PX = 6

/** Si dos rectángulos de pantalla se pisan. */
function sePisan(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

/**
 * Tres pasos para quien abre el editor por primera vez: una tarjeta abajo, en el centro, y un anillo sobre lo que toca
 * en cada paso. No bloquea el editor: se puede seguir trabajando con ella abierta. Saltarla, terminarla o Escape (con el
 * foco en ella) la cierran y dejan la marca.
 */
export default function GuiaInicial({ alCerrar }: { alCerrar(): void }) {
  const [paso, setPaso] = useState(0)
  const tarjeta = useRef<HTMLElement>(null)
  const anillo = useRef<HTMLDivElement>(null)
  const ultimo = paso === OBJETIVOS.length - 1

  const cerrar = () => {
    marcarGuiaVista()
    alCerrar()
  }

  useEffect(() => tarjeta.current?.focus(), [])

  // El anillo se coloca sobre el objetivo del paso midiendo el DOM, sin pasar por el estado. Se vuelve a medir cuando
  // cambia la ventana, el tamaño del plano (el panel se abre al elegir algo) o cualquier cosa del editor (paso, vista,
  // selección). Si el objetivo cae bajo la tarjeta (el zoom en un móvil), la tarjeta pasa arriba.
  useEffect(() => {
    const colocar = () => {
      const el = anillo.current
      const carta = tarjeta.current
      if (!el || !carta) return
      const objetivo = document.querySelector(OBJETIVOS[paso] ?? OBJETIVOS[0])
      if (!objetivo) {
        el.style.display = 'none'
        return
      }
      const r = objetivo.getBoundingClientRect()
      el.style.display = ''
      el.style.left = `${r.left - MARGEN_PX}px`
      el.style.top = `${r.top - MARGEN_PX}px`
      el.style.width = `${r.width + 2 * MARGEN_PX}px`
      el.style.height = `${r.height + 2 * MARGEN_PX}px`
      carta.classList.remove('guia--arriba')
      const c = carta.getBoundingClientRect()
      // Un objetivo pequeño (el zoom) que quede detrás de la tarjeta; el plano entero siempre se pisa con ella y no cuenta.
      const pequeno = r.width < c.width || r.height < c.height
      if (pequeno && sePisan(r, c)) carta.classList.add('guia--arriba')
    }
    colocar()
    window.addEventListener('resize', colocar)
    const lienzo = document.querySelector('.editor__lienzo')
    const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(colocar) : null
    if (lienzo && observador) observador.observe(lienzo)
    const desuscribir = almacen.subscribe(colocar)
    return () => {
      window.removeEventListener('resize', colocar)
      observador?.disconnect()
      desuscribir()
    }
  }, [paso])

  // Escape solo con el foco en la guía: el del plano (deseleccionar), el de un campo o el de un diálogo son suyos.
  const alTeclear = (ev: KeyboardEvent<HTMLElement>) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation()
      cerrar()
    }
  }

  const actual = t.pasos[paso] ?? t.pasos[0]!
  return (
    <>
      <div ref={anillo} className="guia__objetivo" data-paso={paso + 1} aria-hidden="true" />
      <section ref={tarjeta} className="guia" aria-label={t.titulo} tabIndex={-1} onKeyDown={alTeclear}>
        <p className="guia__paso">{t.pasoDe(paso + 1, OBJETIVOS.length)}</p>
        <h2 className="guia__titulo">{actual.titulo}</h2>
        <p className="guia__texto">{actual.texto}</p>
        <div className="guia__botones">
          <button type="button" className="enlace" onClick={cerrar}>{t.saltar}</button>
          {ultimo
            ? <button type="button" className="primario" onClick={cerrar}>{t.terminar}</button>
            : <button type="button" className="primario" onClick={() => setPaso((p) => p + 1)}>{t.siguiente}</button>}
        </div>
      </section>
    </>
  )
}
