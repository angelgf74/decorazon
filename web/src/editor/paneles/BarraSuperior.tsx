import { useState } from 'react'
import { textos } from '../../textos'
import Confirmar from '../comunes/Confirmar'
import { useEditor } from '../estado/almacen'

export type Hoja = 'izquierda' | 'derecha'

interface Props {
  hojaAbierta?: Hoja | null
  alAlternarHoja?(h: Hoja): void
}

const t = textos.barra

export default function BarraSuperior({ hojaAbierta = null, alAlternarHoja }: Props) {
  const paso = useEditor((e) => e.paso)
  const vista = useEditor((e) => e.vista)
  const guardado = useEditor((e) => e.guardado)
  const hayPasado = useEditor((e) => e.pasado.length > 0)
  const hayFuturo = useEditor((e) => e.futuro.length > 0)
  const irAPaso = useEditor((e) => e.irAPaso)
  const cambiarVista = useEditor((e) => e.cambiarVista)
  const deshacer = useEditor((e) => e.deshacer)
  const rehacer = useEditor((e) => e.rehacer)
  const descartar = useEditor((e) => e.descartar)
  const [confirmando, setConfirmando] = useState(false)

  return (
    <header className="barra">
      <nav className="barra__grupo" aria-label="Pasos">
        <button type="button" aria-current={paso === 1 ? 'step' : undefined} onClick={() => irAPaso(1)}>{t.paso1}</button>
        <button type="button" aria-current={paso === 2 ? 'step' : undefined} onClick={() => irAPaso(2)}>{t.paso2}</button>
      </nav>

      <div className="barra__grupo" role="group" aria-label="Vista">
        <button type="button" aria-pressed={vista === '2d'} onClick={() => cambiarVista('2d')}>{t.vista2d}</button>
        <button type="button" aria-pressed={vista === '3d'} onClick={() => cambiarVista('3d')}>{t.vista3d}</button>
      </div>

      <div className="barra__grupo">
        <button type="button" disabled={!hayPasado} onClick={deshacer}>{t.deshacer}</button>
        <button type="button" disabled={!hayFuturo} onClick={rehacer}>{t.rehacer}</button>
        <button type="button" onClick={() => setConfirmando(true)}>{t.nuevoDiseno}</button>
      </div>

      <div className="barra__grupo barra__movil">
        <button type="button" aria-expanded={hojaAbierta === 'izquierda'} onClick={() => alAlternarHoja?.('izquierda')}>
          {paso === 1 ? t.estancia : t.catalogo}
        </button>
        <button type="button" aria-expanded={hojaAbierta === 'derecha'} onClick={() => alAlternarHoja?.('derecha')}>
          {t.propiedades}
        </button>
      </div>

      <p className={`barra__guardado barra__guardado--${guardado}`} role="status">
        {guardado === 'guardado' ? t.guardado : guardado === 'pendiente' ? t.pendiente : t.error}
      </p>

      <Confirmar
        abierto={confirmando}
        mensaje={t.confirmarNuevo}
        textoAceptar={textos.comun.aceptar}
        alAceptar={() => { setConfirmando(false); descartar() }}
        alCancelar={() => setConfirmando(false)}
      />
    </header>
  )
}
