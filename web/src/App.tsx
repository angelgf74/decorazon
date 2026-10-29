import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Editor from './editor/Editor'
import Inicio from './paginas/Inicio'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/disenar" element={<Editor />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
