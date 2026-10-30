// Paso de srv: compila la web con Vite a partir del commit actual, en una copia
// temporal (no toca web/node_modules ni web/dist de la copia de trabajo), y deja
// la salida en $SRV_PAQUETE/web, sustituyendo lo que srv copió de web/public.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const paquete = process.env.SRV_PAQUETE
if (!paquete) {
  console.error('Falta SRV_PAQUETE: este script lo ejecuta srv al montar el paquete.')
  process.exit(1)
}

const temporal = mkdtempSync(join(tmpdir(), 'decorazon-web-'))
try {
  execSync(`git archive --format=tar HEAD web | tar -x -C "${temporal}"`, { stdio: 'inherit', shell: true })
  const web = join(temporal, 'web')
  execSync('npm ci --no-audit --no-fund', { cwd: web, stdio: 'inherit' })
  execSync('npm run build', { cwd: web, stdio: 'inherit' })

  const dist = join(web, 'dist')
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('El build no ha dejado web/dist/index.html.')
    process.exit(1)
  }

  const destino = join(paquete, 'web')
  rmSync(destino, { recursive: true, force: true })
  cpSync(dist, destino, { recursive: true })
  console.log(`Web compilada en ${destino}`)
} finally {
  rmSync(temporal, { recursive: true, force: true })
}
