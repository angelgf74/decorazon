import { Link } from 'react-router'
import { textos } from '../textos'
import './como-funciona.css'

const t = textos.comoFunciona

/** Página pública e indexable (SEO): qué hace Decorazon, paso a paso, con capturas reales del editor. */
export default function ComoFunciona() {
  return (
    <main className="como-funciona">
      <header className="como-funciona__cabecera">
        <h1>{t.titulo}</h1>
        <p className="como-funciona__entradilla">{t.entradilla}</p>
        <Link to="/disenar" className="boton primario">{t.empezar}</Link>
      </header>

      <ol className="como-funciona__pasos" aria-label={t.pasosTitulo}>
        {t.pasos.map((p) => (
          <li key={p.titulo} className="como-funciona__paso">
            <div>
              <h2>{p.titulo}</h2>
              <p>{p.texto}</p>
            </div>
            <img src={p.imagen} alt={p.imagenAlt} width="800" height="500" loading="lazy" decoding="async" />
          </li>
        ))}
      </ol>

      <section className="como-funciona__preguntas" aria-labelledby="como-funciona-preguntas">
        <h2 id="como-funciona-preguntas">{t.preguntasTitulo}</h2>
        {t.preguntas.map((p) => (
          <div key={p.pregunta}>
            <h3>{p.pregunta}</h3>
            <p>{p.respuesta}</p>
          </div>
        ))}
      </section>

      <footer className="como-funciona__pie">
        <Link to="/disenar" className="boton primario">{t.empezar}</Link>
        <p>{t.otrasCosas} <Link to="/">{t.verEjemplos}</Link></p>
      </footer>
    </main>
  )
}
