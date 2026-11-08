import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Administracion from './administracion/Administracion'
import NavegacionDeSesion from './cuenta/NavegacionDeSesion'
import ConfirmarRegistro from './cuenta/paginas/ConfirmarRegistro'
import MiCuenta from './cuenta/paginas/MiCuenta'
import Entrar from './cuenta/paginas/Entrar'
import OlvidoContrasena from './cuenta/paginas/OlvidoContrasena'
import Registro from './cuenta/paginas/Registro'
import RestablecerContrasena from './cuenta/paginas/RestablecerContrasena'
import EditorDeDiseno from './disenos/paginas/EditorDeDiseno'
import MisDisenos from './disenos/paginas/MisDisenos'
import VistaCompartida from './disenos/paginas/VistaCompartida'
import AnfitrionDeVistasPrevias from './disenos/vistaPrevia/AnfitrionDeVistasPrevias'
import Editor from './editor/Editor'
import Inicio from './paginas/Inicio'
import ComoFunciona from './paginas/ComoFunciona'
import Privacidad from './paginas/Privacidad'
import Metadatos from './Metadatos'

export default function App() {
  return (
    <BrowserRouter>
      <NavegacionDeSesion />
      {/* Fuera de las rutas: termina las vistas previas que quedaron pendientes al salir de un editor. */}
      <AnfitrionDeVistasPrevias />
      <Routes>
        <Route path="/" element={<><Metadatos pagina="inicio" /><Inicio /></>} />
        <Route path="/disenar" element={<><Metadatos pagina="disenar" /><Editor /></>} />
        <Route path="/disenos" element={<MisDisenos />} />
        <Route path="/disenos/:id" element={<EditorDeDiseno />} />
        <Route path="/compartido/:enlace" element={<VistaCompartida />} />
        <Route path="/entrar" element={<><Metadatos pagina="entrar" /><Entrar /></>} />
        <Route path="/registro" element={<><Metadatos pagina="registro" /><Registro /></>} />
        <Route path="/registro/confirmar" element={<><Metadatos pagina="confirmar" /><ConfirmarRegistro /></>} />
        <Route path="/contrasena/olvido" element={<><Metadatos pagina="olvido" /><OlvidoContrasena /></>} />
        <Route path="/contrasena/restablecer" element={<><Metadatos pagina="restablecer" /><RestablecerContrasena /></>} />
        <Route path="/cuenta" element={<><Metadatos pagina="cuenta" /><MiCuenta /></>} />
        <Route path="/como-funciona" element={<><Metadatos pagina="comoFunciona" /><ComoFunciona /></>} />
        <Route path="/privacidad" element={<><Metadatos pagina="privacidad" /><Privacidad /></>} />
        <Route path="/administracion" element={<Administracion />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
