// Genera public/imagen-redes.png (1200 × 630, la vista previa de og:image) a partir del salón de ejemplo y el icono:
// node scripts/generar-imagen-redes.mjs. Se rehace si cambian public/ejemplos/salon.png, el icono o los textos de abajo.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import sharp from 'sharp'

const ruta = (relativa) => fileURLToPath(new URL(relativa, import.meta.url))
const enBase64 = (fichero, tipo) => `data:${tipo};base64,${readFileSync(ruta(fichero)).toString('base64')}`
const salon = enBase64('../public/ejemplos/salon.png', 'image/png')
const icono = enBase64('../public/favicon.svg', 'image/svg+xml')

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box }
  body { width: 1200px; height: 630px; overflow: hidden; background: #FFF8F0; color: #2b2622;
         font-family: 'Segoe UI', system-ui, Roboto, sans-serif; display: flex; align-items: center }
  .texto { width: 560px; padding-left: 72px; flex: none; position: relative; z-index: 1 }
  .marca { display: flex; align-items: center; gap: 18px; margin-bottom: 40px }
  .marca img { width: 72px; height: 72px; border-radius: 18px }
  .marca span { font-size: 46px; font-weight: 700; letter-spacing: -0.5px }
  h1 { font-size: 50px; line-height: 1.12; font-weight: 700; letter-spacing: -0.5px }
  p { margin-top: 26px; font-size: 27px; color: #B9473A; font-weight: 600 }
  .imagen { flex: 1; height: 630px; background: url(${salon}) 46% 52% / 150% no-repeat }
</style></head><body>
  <div class="texto">
    <div class="marca"><img src="${icono}" alt=""><span>Decorazon</span></div>
    <h1>Diseña tu habitación<br>en 2D y 3D</h1>
    <p>Gratis y sin registro</p>
  </div>
  <div class="imagen"></div>
</body></html>`

const navegador = await chromium.launch()
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } })
await pagina.setContent(html)
const captura = await pagina.screenshot({ type: 'png' })
await navegador.close()
// Paleta de 256 colores: cabe holgada por debajo del tope de 300 kB de seo.test.ts.
await sharp(captura).png({ palette: true, quality: 90, effort: 10 }).toFile(ruta('../public/imagen-redes.png'))
