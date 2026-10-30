import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
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
  const haySesion = useSesion((s) => s.haySesion())
  const [confirmando, setConfirmando] = useState(false)

  return (
    <main className="inicio">
      <h1>{t.titulo}</h1>
      <p>{t.frase}</p>
      <Link to="/disenar" className="boton primario">{hayDocumento ? t.seguir : t.empezar}</Link>
      {haySesion && <Link to="/disenos" className="boton">{t.misDisenos}</Link>}
      {hayDocumento && (
        <button type="button" className="enlace" onClick={() => setConfirmando(true)}>{t.nuevo}</button>
      )}
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
