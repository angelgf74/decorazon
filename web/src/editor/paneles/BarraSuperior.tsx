import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { subirDisenoAnonimo } from '../../cuenta/disenosLocales'
import { useSesion } from '../../cuenta/sesion'
import { textos } from '../../textos'
import Confirmar from '../comunes/Confirmar'
import Icono from '../comunes/Icono'
import { almacen, useEditor, type EstadoGuardado } from '../estado/almacen'
import { renombrar } from '../persistencia/sincronizacion'

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

export default function BarraSuperior() {
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
  const [subiendo, setSubiendo] = useState(false)
  const navegar = useNavigate()
  const puedeGuardarEnCuenta = useEditor((e) => e.origen.tipo === 'anonimo' && e.documento !== null) && haySesion

  const guardarEnCuenta = async () => {
    const doc = almacen.getState().documento
    if (doc === null) return
    setSubiendo(true)
    const r = await subirDisenoAnonimo(doc)
    if ('id' in r) {
      navegar(`/disenos/${r.id}`)
      return
    }
    setSubiendo(false)
    almacen.setState({ aviso: r.error })
  }

  return (
    <header className="barra">
      <nav className="barra__grupo pasos" aria-label={t.pasos}>
        <button type="button" className="pasos__paso" aria-current={paso === 1 ? 'step' : undefined} onClick={() => irAPaso(1)}>
          <span className="pasos__numero">1</span> <span className="barra__texto">{t.estancia}</span>
        </button>
        <button type="button" className="pasos__paso" aria-current={paso === 2 ? 'step' : undefined} onClick={() => irAPaso(2)}>
          <span className="pasos__numero">2</span> <span className="barra__texto">{t.amueblar}</span>
        </button>
      </nav>

      <div className="barra__grupo segmentado" role="group" aria-label={t.vista}>
        <button type="button" aria-pressed={vista === '2d'} onClick={() => cambiarVista('2d')}>{t.vista2d}</button>
        <button type="button" aria-pressed={vista === '3d'} onClick={() => cambiarVista('3d')}>{t.vista3d}</button>
      </div>

      <div className="barra__grupo barra__deshacer">
        <button type="button" className="barra__historial" title={t.pistaDeshacer} disabled={!hayPasado} onClick={deshacer}>
          <Icono nombre="deshacer" /><span className="barra__texto barra__texto--estrecha">{t.deshacer}</span>
        </button>
        <button type="button" className="barra__historial" title={t.pistaRehacer} disabled={!hayFuturo} onClick={rehacer}>
          <Icono nombre="rehacer" /><span className="barra__texto barra__texto--estrecha">{t.rehacer}</span>
        </button>
      </div>

      {nombreDiseno !== null && <NombreDelDiseno key={nombreDiseno} nombre={nombreDiseno} />}

      <p className={`barra__guardado barra__guardado--${guardado}`} role="status">
        {textoDeGuardado(guardado, nombreDiseno !== null)}
      </p>

      {nombreDiseno === null && (
        <button type="button" className="enlace barra__nuevo" title={t.nuevoDiseno} onClick={() => setConfirmando(true)}>
          <Icono nombre="nuevo" /><span className="barra__texto">{t.nuevoDiseno}</span>
        </button>
      )}

      <nav className="barra__grupo barra__cuenta" aria-label="Cuenta">
        {haySesion ? (
          <>
            {puedeGuardarEnCuenta && (
              <button type="button" title={t.guardarEnCuenta} disabled={subiendo} onClick={() => void guardarEnCuenta()}>
                <Icono nombre="guardar" /><span className="barra__texto">{t.guardarEnCuenta}</span>
              </button>
            )}
            <Link to="/disenos" className="boton" title={t.misDisenos}><Icono nombre="disenos" /><span className="barra__texto">{t.misDisenos}</span></Link>
            <Link to="/cuenta" className="boton" title={nombre ?? t.miCuenta}><Icono nombre="cuenta" /><span className="barra__texto">{nombre ?? t.miCuenta}</span></Link>
          </>
        ) : (
          <>
            <Link to="/registro" className="boton primario" title={t.guardar}><Icono nombre="guardar" /><span className="barra__texto">{t.guardar}</span></Link>
            <Link to="/entrar" className="boton" title={t.entrar}><Icono nombre="cuenta" /><span className="barra__texto">{t.entrar}</span></Link>
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
