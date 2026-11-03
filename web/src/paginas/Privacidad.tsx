import { Link } from 'react-router'
import { textos } from '../textos'
import '../cuenta/cuenta.css'

const t = textos.privacidad
// Puede quedar vacío: entonces la sección de contacto no se muestra.
const contacto: string = t.contacto

const secciones = [
  [t.guardamosTitulo, t.guardamos],
  [t.paraQueTitulo, t.paraQue],
  [t.correoTitulo, t.correo],
  [t.sugerenciasTitulo, t.sugerencias],
  [t.anonimoTitulo, t.anonimo],
  [t.borrarTitulo, t.borrar],
] as const

export default function Privacidad() {
  return (
    <main className="cuenta">
      <div className="cuenta__tarjeta cuenta__texto">
        <h1>{t.titulo}</h1>
        {secciones.map(([titulo, texto]) => (
          <section key={titulo}>
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </section>
        ))}
        {contacto !== '' && (
          <section>
            <h2>{t.contactoTitulo}</h2>
            <p><a href={`mailto:${contacto}`}>{contacto}</a></p>
          </section>
        )}
        <p className="cuenta__enlaces"><Link to="/">{t.volver}</Link></p>
      </div>
    </main>
  )
}
