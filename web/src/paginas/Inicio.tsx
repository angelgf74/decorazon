import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useSesion } from '../cuenta/sesion'
import Confirmar from '../editor/comunes/Confirmar'
import { useEditor } from '../editor/estado/almacen'
import { textos } from '../textos'
import './inicio.css'

const t = textos.inicio

export default function Inicio() {
  const hayDocumento = useEditor((e) => e.documento !== null)
  const descartar = useEditor((e) => e.descartar)
  const navegar = useNavigate()
  const estado: unknown = useLocation().state
  const aviso = typeof estado === 'object' && estado !== null && typeof (estado as { mensaje?: unknown }).mensaje === 'string' ? (estado as { mensaje: string }).mensaje : null
  const haySesion = useSesion((s) => s.haySesion())
  const [confirmando, setConfirmando] = useState(false)

  return (
    <main className="inicio">
      {aviso && <p className="inicio__aviso" role="status">{aviso}</p>}
      <h1>{t.titulo}</h1>
      <p>{t.frase}</p>
      <Link to="/disenar" className="boton primario">{hayDocumento ? t.seguir : t.empezar}</Link>
      {haySesion && <Link to="/disenos" className="boton">{t.misDisenos}</Link>}
      {hayDocumento && (
        <button type="button" className="enlace" onClick={() => setConfirmando(true)}>{t.nuevo}</button>
      )}
      <footer className="inicio__pie"><Link to="/privacidad">{t.privacidad}</Link></footer>
      <Confirmar
        abierto={confirmando}
        mensaje={t.confirmarNuevo}
        textoAceptar={textos.comun.aceptar}
        alAceptar={() => { setConfirmando(false); descartar(); navegar('/disenar') }}
        alCancelar={() => setConfirmando(false)}
      />
    </main>
  )
}
