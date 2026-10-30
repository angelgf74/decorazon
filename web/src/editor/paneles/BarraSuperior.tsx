import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useSesion } from '../../cuenta/sesion'
import { textos } from '../../textos'
import Confirmar from '../comunes/Confirmar'
import { almacen, useEditor, type EstadoGuardado } from '../estado/almacen'
import { renombrar } from '../persistencia/sincronizacion'

export type Hoja = 'izquierda' | 'derecha'

interface Props {
  hojaAbierta?: Hoja | null
  alAlternarHoja?(h: Hoja): void
}

const t = textos.barra

function textoDeGuardado(g: EstadoGuardado, delServidor: boolean): string {
  switch (g) {
    case 'guardado': return delServidor ? t.guardadoServidor : t.guardado
    case 'pendiente': return t.pendiente
    case 'sinConexion': return t.sinConexion
    case 'conflicto': return t.conflicto
    case 'error': return delServidor ? t.errorServidor : t.error
  }
}

function NombreDelDiseno({ nombre }: { nombre: string }) {
  const [valor, setValor] = useState(nombre)
  const cancelado = useRef(false)

  const confirmar = () => {
    if (cancelado.current) {
      cancelado.current = false
      return
    }
    if (valor.trim() === '') setValor(nombre)
    else renombrar(almacen, valor)
  }

  return (
    <input
      className="barra__nombre"
      aria-label={t.nombreDiseno}
      value={valor}
      maxLength={100}
      onChange={(e) => setValor(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') {
          cancelado.current = true
          setValor(nombre)
          e.currentTarget.blur()
        }
      }}
    />
  )
}

export default function BarraSuperior({ hojaAbierta = null, alAlternarHoja }: Props) {
  const paso = useEditor((e) => e.paso)
  const vista = useEditor((e) => e.vista)
  const guardado = useEditor((e) => e.guardado)
  const nombreDiseno = useEditor((e) => (e.origen.tipo === 'servidor' ? e.origen.nombre : null))
  const hayPasado = useEditor((e) => e.pasado.length > 0)
  const hayFuturo = useEditor((e) => e.futuro.length > 0)
  const irAPaso = useEditor((e) => e.irAPaso)
  const cambiarVista = useEditor((e) => e.cambiarVista)
  const deshacer = useEditor((e) => e.deshacer)
  const rehacer = useEditor((e) => e.rehacer)
  const descartar = useEditor((e) => e.descartar)
  const haySesion = useSesion((s) => s.haySesion())
  const nombre = useSesion((s) => s.usuario?.nombre)
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
        {nombreDiseno === null && <button type="button" onClick={() => setConfirmando(true)}>{t.nuevoDiseno}</button>}
      </div>

      {nombreDiseno !== null && <NombreDelDiseno key={nombreDiseno} nombre={nombreDiseno} />}

      <div className="barra__grupo barra__movil">
        <button type="button" aria-expanded={hojaAbierta === 'izquierda'} onClick={() => alAlternarHoja?.('izquierda')}>
          {paso === 1 ? t.estancia : t.catalogo}
        </button>
        <button type="button" aria-expanded={hojaAbierta === 'derecha'} onClick={() => alAlternarHoja?.('derecha')}>
          {t.propiedades}
        </button>
      </div>

      <p className={`barra__guardado barra__guardado--${guardado}`} role="status">
        {textoDeGuardado(guardado, nombreDiseno !== null)}
      </p>

      <nav className="barra__grupo" aria-label="Cuenta">
        {haySesion ? (
          <>
            <Link to="/disenos" className="boton">{t.misDisenos}</Link>
            <Link to="/cuenta" className="boton">{nombre ?? t.miCuenta}</Link>
          </>
        ) : (
          <>
            <Link to="/registro" className="boton">{t.guardar}</Link>
            <Link to="/entrar" className="boton">{t.entrar}</Link>
          </>
        )}
      </nav>

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
