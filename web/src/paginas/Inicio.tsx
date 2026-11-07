import { evento } from '../analitica'
import { useId, useState, type ChangeEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { empezarAnonimoCon, empezarDeNuevo, sustituiriaDisenoAnonimo } from '../cuenta/disenosLocales'
import { useSesion } from '../cuenta/sesion'
import Confirmar from '../editor/comunes/Confirmar'
import { useEditor } from '../editor/estado/almacen'
import { importarDiseno } from '../editor/persistencia/fichero'
import { mensajeDeError } from '../cuenta/errores'
import { crearDiseno } from '../disenos/servidor'
import { EJEMPLOS, type Ejemplo } from '../ejemplos'
import type { DocumentoDiseno } from '../nucleo'
import BotonDeSugerencia from '../sugerencias/BotonDeSugerencia'
import { textos } from '../textos'
import './inicio.css'

const t = textos.inicio

/** Los ejemplos son constantes del módulo: cada copia es un documento propio. */
const copiaDe = (e: Ejemplo): DocumentoDiseno => JSON.parse(JSON.stringify(e.documento)) as DocumentoDiseno

export default function Inicio() {
  const hayDocumento = useEditor((e) => e.documento !== null)
  const navegar = useNavigate()
  const estado: unknown = useLocation().state
  const aviso = typeof estado === 'object' && estado !== null && typeof (estado as { mensaje?: unknown }).mensaje === 'string' ? (estado as { mensaje: string }).mensaje : null
  const haySesion = useSesion((s) => s.haySesion())
  const [confirmando, setConfirmando] = useState(false)
  // Un diseño leído de un fichero que espera a que se confirme sustituir el del navegador.
  const [importado, setImportado] = useState<DocumentoDiseno | null>(null)
  const [avisoImportar, setAvisoImportar] = useState<string | null>(null)
  const idFichero = useId()
  // Un ejemplo que espera a que se confirme sustituir el diseño del navegador; y el que se está guardando en la cuenta.
  const [ejemploPendiente, setEjemploPendiente] = useState<Ejemplo | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [avisoEjemplos, setAvisoEjemplos] = useState<string | null>(null)

  const abrirImportado = (doc: DocumentoDiseno) => {
    empezarAnonimoCon(doc)
    navegar('/disenar')
  }
  // Se cuenta qué ejemplo se abre, por su nombre: nunca el documento.
  const abrirCopia = (e: Ejemplo) => {
    evento('ejemplo-abierto', { ejemplo: e.nombre })
    abrirImportado(copiaDe(e))
  }
  const abrirEjemplo = (e: Ejemplo) => {
    if (sustituiriaDisenoAnonimo()) setEjemploPendiente(e)
    else abrirCopia(e)
  }
  const guardarEjemplo = async (e: Ejemplo) => {
    setGuardando(true)
    setAvisoEjemplos(null)
    try {
      evento('ejemplo-abierto', { ejemplo: e.nombre })
      const d = await crearDiseno(e.nombre, copiaDe(e))
      navegar(`/disenos/${d.id}`)
    } catch (err) {
      setAvisoEjemplos(mensajeDeError(err))
      setGuardando(false)
    }
  }
  const alElegirFichero = async (ev: ChangeEvent<HTMLInputElement>) => {
    const fichero = ev.target.files?.[0]
    // Vaciado ya: el mismo fichero se puede volver a elegir (change no salta si el valor no cambia).
    ev.target.value = ''
    if (!fichero) return
    setAvisoImportar(null)
    const r = await importarDiseno(fichero)
    if (!r.ok) {
      setAvisoImportar(textos.importar.noValido)
      return
    }
    if (sustituiriaDisenoAnonimo()) setImportado(r.documento)
    else abrirImportado(r.documento)
  }

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
          {/* Un diseño descargado («Descargar diseño» en el editor) se abre desde aquí. */}
          <label htmlFor={idFichero} className="boton enlace inicio__abrir">{textos.importar.abrir}</label>
          <input id={idFichero} type="file" accept=".json,application/json" className="solo-lectores" onChange={(ev) => void alElegirFichero(ev)} />
          {avisoImportar && <p className="inicio__aviso" role="alert">{avisoImportar}</p>}
        </div>

        <section className="inicio__ejemplos" aria-labelledby="inicio-ejemplos">
          <h2 id="inicio-ejemplos">{t.ejemplos}</h2>
          <p className="inicio__nota">{t.ejemplosDetalle}</p>
          <ul className="inicio__tarjetas">
            {EJEMPLOS.map((e) => (
              <li key={e.id}>
                <article className="inicio__tarjeta" aria-labelledby={`inicio-ejemplo-${e.id}`}>
                  <img className="inicio__tarjeta-imagen" src={e.imagen} alt="" width="300" height="200" loading="lazy" />
                  <h3 id={`inicio-ejemplo-${e.id}`}>{e.nombre}</h3>
                  <p className="inicio__tarjeta-tipo">{textos.nuevaEstancia.tipos[e.tipo]}</p>
                  <div className="inicio__tarjeta-acciones">
                    <button type="button" className="primario" onClick={() => abrirEjemplo(e)}>{t.abrirCopia}</button>
                    {haySesion && <button type="button" disabled={guardando} onClick={() => void guardarEjemplo(e)}>{t.guardarEnCuenta}</button>}
                  </div>
                </article>
              </li>
            ))}
          </ul>
          {avisoEjemplos && <p className="inicio__aviso" role="alert">{avisoEjemplos}</p>}
        </section>

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

        <footer className="inicio__pie">
          <Link to="/privacidad">{t.privacidad}</Link>
          <BotonDeSugerencia className="enlace">{textos.sugerencias.abrir}</BotonDeSugerencia>
        </footer>
      </div>
      <Confirmar
        abierto={confirmando}
        mensaje={t.confirmarNuevo}
        textoAceptar={textos.comun.aceptar}
        alAceptar={() => { setConfirmando(false); empezarDeNuevo(); navegar('/disenar') }}
        alCancelar={() => setConfirmando(false)}
      />
      <Confirmar
        abierto={importado !== null}
        mensaje={textos.importar.sustituir}
        textoAceptar={textos.compartir.sustituir}
        alAceptar={() => { if (importado) abrirImportado(importado); setImportado(null) }}
        alCancelar={() => setImportado(null)}
      />
      <Confirmar
        abierto={ejemploPendiente !== null}
        mensaje={t.sustituirEjemplo}
        textoAceptar={textos.compartir.sustituir}
        alAceptar={() => { if (ejemploPendiente) abrirCopia(ejemploPendiente); setEjemploPendiente(null) }}
        alCancelar={() => setEjemploPendiente(null)}
      />
    </main>
  )
}
