import { useEffect, useRef, useState } from 'react'
import { textos } from '../textos'
import { marcarGuiaVista } from './marcaDeGuia'

const t = textos.guia

/** A qué se señala en cada paso: el plano, el botón «2 Amueblar» y el zoom con Encuadrar. */
const OBJETIVOS = ['.lienzo__svg', '.pasos .pasos__paso:last-child', '.lienzo__controles'] as const
/** Aire entre el anillo y lo que señala. */
const MARGEN_PX = 6

/**
 * Tres pasos para quien abre el editor por primera vez: una tarjeta abajo, en el centro, y un anillo sobre lo que toca
 * en cada paso. No bloquea el editor: se puede seguir trabajando con ella abierta. Saltarla, terminarla o Escape la
 * cierran y dejan la marca.
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
  // Para el oyente de Escape, que se registra una vez: siempre el `cerrar` del último render.
  const cerrarActual = useRef(cerrar)
  useEffect(() => {
    cerrarActual.current = cerrar
  })

  useEffect(() => tarjeta.current?.focus(), [])

  // El anillo se coloca sobre el objetivo del paso sin pasar por el estado: el DOM es lo que se mide.
  useEffect(() => {
    const colocar = () => {
      const el = anillo.current
      if (!el) return
      const objetivo = document.querySelector(OBJETIVOS[paso] ?? '')
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
    }
    colocar()
    window.addEventListener('resize', colocar)
    return () => window.removeEventListener('resize', colocar)
  }, [paso])

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') cerrarActual.current()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const actual = t.pasos[paso] ?? t.pasos[0]!
  return (
    <>
      <div ref={anillo} className="guia__objetivo" data-paso={paso + 1} aria-hidden="true" />
      <section ref={tarjeta} className="guia" aria-label={t.titulo} tabIndex={-1}>
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
