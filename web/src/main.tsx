import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { iniciarAnalitica } from './analitica'
import { conectarRecargaPorVersion } from './recargaPorVersion'
import { conectarCargaDeUsuario, conectarSesionConApi, conectarSesionEntrePestanas } from './cuenta/sesion'
import { almacen } from './editor/estado/almacen'
import { almacenamientoSeguro, conectarPersistencia, leerDisenoLocal } from './editor/persistencia/local'
import { conectarSincronizacion } from './editor/persistencia/sincronizacion'
import './estilos/base.css'

const st = almacenamientoSeguro()
const guardado = leerDisenoLocal(st)
if (guardado !== null) almacen.getState().cargar(guardado)
conectarPersistencia(almacen, st)
conectarSincronizacion(almacen, { esperaMs: 2000, st })

conectarRecargaPorVersion()
iniciarAnalitica()
conectarSesionConApi()
conectarSesionEntrePestanas()
conectarCargaDeUsuario()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
