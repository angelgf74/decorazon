import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import NavegacionDeSesion from './cuenta/NavegacionDeSesion'
import ConfirmarRegistro from './cuenta/paginas/ConfirmarRegistro'
import Entrar from './cuenta/paginas/Entrar'
import OlvidoContrasena from './cuenta/paginas/OlvidoContrasena'
import Registro from './cuenta/paginas/Registro'
import RestablecerContrasena from './cuenta/paginas/RestablecerContrasena'
import EditorDeDiseno from './disenos/paginas/EditorDeDiseno'
import MisDisenos from './disenos/paginas/MisDisenos'
import Editor from './editor/Editor'
import Inicio from './paginas/Inicio'

export default function App() {
  return (
    <BrowserRouter>
      <NavegacionDeSesion />
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/disenar" element={<Editor />} />
        <Route path="/disenos" element={<MisDisenos />} />
        <Route path="/disenos/:id" element={<EditorDeDiseno />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/registro/confirmar" element={<ConfirmarRegistro />} />
        <Route path="/contrasena/olvido" element={<OlvidoContrasena />} />
        <Route path="/contrasena/restablecer" element={<RestablecerContrasena />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
