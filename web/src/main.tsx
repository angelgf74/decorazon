import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { almacen } from './editor/estado/almacen'
import { almacenamientoSeguro, conectarPersistencia, leerDisenoLocal } from './editor/persistencia/local'
import './estilos/base.css'

const st = almacenamientoSeguro()
const guardado = leerDisenoLocal(st)
if (guardado !== null) almacen.getState().cargar(guardado)
conectarPersistencia(almacen, st)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
