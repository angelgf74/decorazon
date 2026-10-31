import { Link } from 'react-router'
import { textos } from '../textos'
import '../cuenta/cuenta.css'

const t = textos.privacidad

const secciones = [
  [t.guardamosTitulo, t.guardamos],
  [t.paraQueTitulo, t.paraQue],
  [t.correoTitulo, t.correo],
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
        {t.contacto !== '' && (
          <section>
            <h2>{t.contactoTitulo}</h2>
            <p>{t.contacto}</p>
          </section>
        )}
        <p className="cuenta__enlaces"><Link to="/">{t.volver}</Link></p>
      </div>
    </main>
  )
}
