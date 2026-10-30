// Genera los iconos de la PWA a partir de icono/decorazon-512.png (node scripts/generar-iconos.mjs).
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ruta = (relativa) => fileURLToPath(new URL(relativa, import.meta.url))
const origen = ruta('../../icono/decorazon-512.png')
mkdirSync(ruta('../public/iconos'), { recursive: true })

await sharp(origen).resize(192, 192).png().toFile(ruta('../public/iconos/icono-192.png'))
await sharp(origen).png().toFile(ruta('../public/iconos/icono-512.png'))
// El motivo queda dentro de la zona segura (80 %) y el fondo llega a los bordes: sirve tal cual como maskable.
await sharp(origen).png().toFile(ruta('../public/iconos/icono-maskable-512.png'))
