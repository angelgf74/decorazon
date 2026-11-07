import { memo, useEffect, useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { catalogoBase, piezasDeElemento, type Elemento, type Punto } from '../../nucleo'
import { moverEn3D, puntoDelSuelo, sePuedeArrastrarEn3D } from './arrastre3d'
import { almacen, useEditor } from '../estado/almacen'
import { useConflictos } from '../estado/conflictos'
import type { EstadoPieza } from './materiales3d'
import Pieza, { type EventosPieza } from './Pieza'

const UMBRAL_ARRASTRE_PX = 2

function cursor(valor: string) {
  document.body.style.cursor = valor
}

/** `sinResaltes`: solo para ver (la captura de la hoja para imprimir, un diseño compartido): sin selección, conflicto ni clics. */
function Mueble3D({ elemento, sinResaltes = false }: { elemento: Elemento; sinResaltes?: boolean }) {
  const { id } = elemento
  const conflictos = useConflictos()
  const seleccionado = useEditor((e) => (e.seleccion?.tipo === 'elemento' && e.seleccion.id === id) || (e.seleccion?.tipo === 'elementos' && e.seleccion.ids.includes(id)))
  const piezas = useMemo(() => {
    const def = catalogoBase.get(elemento.tipo)
    return def ? piezasDeElemento(elemento, def) : []
  }, [elemento])
  useEffect(() => () => cursor(''), [])

  const enConflicto = conflictos.some((c) => c.gravedad === 'error' && (c.ids[0] === id || c.ids[1] === id))
  const estado: EstadoPieza = sinResaltes ? 'normal' : enConflicto ? 'conflicto' : seleccionado ? 'seleccionado' : 'normal'

  function alPulsar(ev: ThreeEvent<MouseEvent>) {
    ev.stopPropagation()
    // R3F dispara el clic también al soltar tras orbitar.
    if (ev.delta > UMBRAL_ARRASTRE_PX) return
    const e = almacen.getState()
    if (e.paso === 1) e.irAPaso(2)
    e.seleccionar({ tipo: 'elemento', id })
  }

  // M-10: el mueble ya seleccionado se arrastra por el suelo; mientras, los controles de la cámara se apagan.
  const controles = useThree((s) => s.controls) as { enabled: boolean } | null
  const arrastre = useRef<{ pointerId: number; partida: Punto; desde: Punto } | null>(null)
  type Puntero = ThreeEvent<PointerEvent>
  const objetivo = (ev: Puntero) => ev.target as unknown as { setPointerCapture?(id: number): void; releasePointerCapture?(id: number): void }
  function alBajar(ev: Puntero) {
    if (ev.button !== 0 || !sePuedeArrastrarEn3D(id)) return
    const desde = puntoDelSuelo(ev.ray)
    if (desde === null) return
    ev.stopPropagation()
    objetivo(ev).setPointerCapture?.(ev.pointerId)
    arrastre.current = { pointerId: ev.pointerId, partida: elemento.posicion, desde }
    if (controles) controles.enabled = false
  }
  function alMover(ev: Puntero) {
    const a = arrastre.current
    if (a === null || a.pointerId !== ev.pointerId) return
    ev.stopPropagation()
    const hasta = puntoDelSuelo(ev.ray)
    if (hasta !== null) moverEn3D(id, a.partida, a.desde, hasta)
  }
  function alSoltar(ev: Puntero) {
    const a = arrastre.current
    if (a === null || a.pointerId !== ev.pointerId) return
    arrastre.current = null
    objetivo(ev).releasePointerCapture?.(ev.pointerId)
    if (controles) controles.enabled = true
    almacen.getState().terminarGrupo()
  }

  const eventos: EventosPieza = {
    onClick: alPulsar,
    onPointerOver: (ev) => { ev.stopPropagation(); cursor('pointer') },
    onPointerOut: () => cursor(''),
    onPointerDown: alBajar,
    onPointerMove: alMover,
    onPointerUp: alSoltar,
    onPointerCancel: alSoltar,
  }

  return (
    <group>
      {piezas.map((p, k) => <Pieza key={k} pieza={p} estado={estado} eventos={sinResaltes ? undefined : eventos} contorno={!sinResaltes && seleccionado} />)}
    </group>
  )
}

// El almacén conserva la referencia de los muebles que no cambian: sus piezas (useMemo) no se recalculan al editar otro.
// Aún se vuelven a renderizar porque useConflictos depende del documento entero.
export default memo(Mueble3D)
