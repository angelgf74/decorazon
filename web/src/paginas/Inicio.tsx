import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { empezarDeNuevo } from '../cuenta/disenosLocales'
import { useSesion } from '../cuenta/sesion'
import Confirmar from '../editor/comunes/Confirmar'
import { useEditor } from '../editor/estado/almacen'
import { textos } from '../textos'
import './inicio.css'

const t = textos.inicio

export default function Inicio() {
  const hayDocumento = useEditor((e) => e.documento !== null)
  const navegar = useNavigate()
  const estado: unknown = useLocation().state
  const aviso = typeof estado === 'object' && estado !== null && typeof (estado as { mensaje?: unknown }).mensaje === 'string' ? (estado as { mensaje: string }).mensaje : null
  const haySesion = useSesion((s) => s.haySesion())
  const [confirmando, setConfirmando] = useState(false)

  return (
    <main className="inicio">
      <div className="inicio__contenido">
        {aviso && <p className="inicio__aviso" role="status">{aviso}</p>}
        <header className="inicio__cabecera">
          <img className="inicio__logo" src="/favicon.svg" alt="" width="64" height="64" />
          <h1>{t.titulo}</h1>
          <p className="inicio__frase">{t.frase}</p>
        </header>

        <div className="inicio__acciones">
          <Link to="/disenar" className="boton primario inicio__principal">{hayDocumento ? t.seguir : t.empezar}</Link>
          {hayDocumento && (
            <button type="button" className="enlace" onClick={() => setConfirmando(true)}>{t.nuevo}</button>
          )}
        </div>

        {haySesion ? (
          <section className="inicio__cuenta" aria-labelledby="inicio-cuenta">
            <h2 id="inicio-cuenta">{t.tuCuenta}</h2>
            <div className="inicio__cuenta-acciones">
              <Link to="/disenos" className="boton">{t.misDisenos}</Link>
              <Link to="/cuenta" className="inicio__enlace">{t.miCuenta}</Link>
            </div>
          </section>
        ) : (
          <section className="inicio__cuenta" aria-labelledby="inicio-cuenta">
            <h2 id="inicio-cuenta">{t.yaTienesCuenta}</h2>
            <p className="inicio__nota">{t.porQueEntrar}</p>
            <div className="inicio__cuenta-acciones">
              <Link to="/entrar" className="boton">{t.entrar}</Link>
              <Link to="/registro" className="inicio__enlace">{t.crearCuenta}</Link>
            </div>
          </section>
        )}

        <footer className="inicio__pie"><Link to="/privacidad">{t.privacidad}</Link></footer>
      </div>
      <Confirmar
        abierto={confirmando}
        mensaje={t.confirmarNuevo}
        textoAceptar={textos.comun.aceptar}
        alAceptar={() => { setConfirmando(false); empezarDeNuevo(); navegar('/disenar') }}
        alCancelar={() => setConfirmando(false)}
      />
    </main>
  )
}
