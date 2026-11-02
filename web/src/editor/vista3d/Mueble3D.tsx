import { memo, useEffect, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { catalogoBase, piezasDeElemento, type Elemento } from '../../nucleo'
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
  const seleccionado = useEditor((e) => e.seleccion?.tipo === 'elemento' && e.seleccion.id === id)
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

  const eventos: EventosPieza = {
    onClick: alPulsar,
    onPointerOver: (ev) => { ev.stopPropagation(); cursor('pointer') },
    onPointerOut: () => cursor(''),
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
