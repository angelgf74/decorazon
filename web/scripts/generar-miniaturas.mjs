// Genera las miniaturas 3D del catálogo: public/miniaturas/<id>.webp y src/editor/paneles/miniaturas.generado.ts.
// node scripts/generar-miniaturas.mjs (npm run miniaturas). Se rehace al cambiar un modelo, una variante o un color por
// defecto (lo avisa src/editor/paneles/miniaturas.test.ts) o al subir VERSION_DEL_DIBUJO (src/miniaturas/firma.ts).
// Abre miniaturas.html en el servidor de desarrollo de Vite con Chromium (sin GPU, SwiftShader), recorta cada imagen y
// la convierte con sharp, con un contorno de silueta (src/miniaturas/contorno.ts). Deja una hoja de contacto en test-results/miniaturas.png para revisarlas de un vistazo.
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { createServer } from 'vite'

const ruta = (relativa) => fileURLToPath(new URL(`../${relativa}`, import.meta.url))
const CARPETA = ruta('public/miniaturas/')
const MANIFIESTO = ruta('src/editor/paneles/miniaturas.generado.ts')
const HOJA = ruta('test-results/miniaturas.png')
/** El doble de la franja de la tarjeta en móvil (unos 160 × 56 px). */
const ANCHO_PX = 320
const ALTO_PX = 112
/** El contorno: 2 px de tinta (#2b2622, la de lienzo.css) al 45 %; cuenta dentro de ANCHO_PX × ALTO_PX. */
const CONTORNO = { px: 2, color: [0x2b, 0x26, 0x22], opacidad: 0.45 }
/** Menos que esto tras recortar es un mueble que no se ha pintado (o casi). */
const MINIMO_PX = 8
/** Un tipo tarda menos de un segundo; esto es solo para no quedarse colgado si la página deja de responder. */
const TOPE_MS = 30_000

const inicio = Date.now()
const servidor = await createServer({ root: ruta(''), logLevel: 'warn', server: { port: 5329 } })
await servidor.listen()
const { contornear } = await servidor.ssrLoadModule('/src/miniaturas/contorno.ts')
const navegador = await chromium.launch()
try {
  const pagina = await navegador.newPage({ viewport: { width: 800, height: 800 } })
  const errores = []
  // Un error al pintar desmonta el lienzo y la promesa de dibujar no se resolvería nunca: se rechaza al momento.
  let alFallarLaPagina = () => {}
  pagina.on('pageerror', (e) => { errores.push(e.message); alFallarLaPagina(e) })
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
  /** El PNG de un tipo, o un error con su id si la página falla o no responde en `TOPE_MS`. */
  const dibujar = (id) => new Promise((resolver, rechazar) => {
    const fallar = (motivo) => { clearTimeout(tope); alFallarLaPagina = () => {}; rechazar(new Error(`La miniatura de ${id} ${motivo}`)) }
    const tope = setTimeout(() => fallar(`no llega en ${TOPE_MS / 1000} s`), TOPE_MS)
    alFallarLaPagina = (e) => fallar(`falla al pintarse: ${e.message}`)
    pagina.evaluate((id) => window.miniaturas.dibujar(id), id).then(
      (url) => { clearTimeout(tope); alFallarLaPagina = () => {}; resolver(url) },
      (e) => fallar(`falla: ${e.message}`),
    )
  })
  await pagina.goto(new URL('miniaturas.html', servidor.resolvedUrls.local[0]).href, { waitUntil: 'networkidle' })
  await pagina.waitForFunction(() => window.miniaturas !== undefined, null, { timeout: 60_000 })
  const tipos = await pagina.evaluate(() => window.miniaturas.tipos())

  mkdirSync(CARPETA, { recursive: true })
  const manifiesto = {}
  const hoja = []
  let bytes = 0
  for (const { id, firma } of tipos) {
    const url = await dibujar(id)
    const png = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
    const { channels } = await sharp(png).stats()
    if (channels.length < 4 || channels[3].max === 0) throw new Error(`La miniatura de ${id} sale vacía`)
    const recortada = await sharp(png).trim().toBuffer({ resolveWithObject: true })
    if (recortada.info.width < MINIMO_PX || recortada.info.height < MINIMO_PX) {
      throw new Error(`La miniatura de ${id} sale casi vacía (${recortada.info.width} × ${recortada.info.height} px)`)
    }
    const reducida = await sharp(recortada.data)
      .resize({ width: ANCHO_PX - 2 * CONTORNO.px, height: ALTO_PX - 2 * CONTORNO.px, fit: 'inside' })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const conContorno = contornear(reducida.data, reducida.info.width, reducida.info.height, CONTORNO)
    const { data, info } = await sharp(Buffer.from(conContorno.datos), { raw: { width: conContorno.ancho, height: conContorno.alto, channels: 4 } })
      .webp({ quality: 82, alphaQuality: 90, effort: 6 })
      .toBuffer({ resolveWithObject: true })
    writeFileSync(`${CARPETA}${id}.webp`, data)
    // El resumen de los bytes va en la URL (?v=): si la imagen cambia por lo que sea (luces, geometría), cambia la URL
    // y ninguna caché sirve la vieja. La firma es la del modelo: sirve para saber que hay que regenerar.
    const contenido = createHash('sha256').update(data).digest('hex').slice(0, 8)
    manifiesto[id] = { firma, contenido, ancho: info.width, alto: info.height }
    hoja.push({ id, url: `data:image/webp;base64,${data.toString('base64')}` })
    bytes += data.length
  }
  if (errores.length) throw new Error(`Errores en la página del generador:\n${errores.join('\n')}`)

  // Las de tipos que ya no existen.
  for (const f of readdirSync(CARPETA)) if (!(f.replace(/\.webp$/, '') in manifiesto)) rmSync(`${CARPETA}${f}`)

  const filas = Object.keys(manifiesto).sort().map((id) => {
    const { firma, contenido, ancho, alto } = manifiesto[id]
    return `  '${id}': { firma: '${firma}', contenido: '${contenido}', ancho: ${ancho}, alto: ${alto} },`
  })
  writeFileSync(MANIFIESTO, [
    '// Generado por `npm run miniaturas` (scripts/generar-miniaturas.mjs): no se toca a mano.',
    '// Por tipo del catálogo: la firma de su modelo (src/miniaturas/firma.ts), el resumen de los bytes de public/miniaturas/<id>.webp',
    '// (el ?v= de su URL) y su tamaño en píxeles.',
    'export const MINIATURAS: Readonly<Record<string, { firma: string; contenido: string; ancho: number; alto: number }>> = {',
    ...filas,
    '}',
    '',
  ].join('\n'))

  // Hoja de contacto: cada miniatura en una franja como la de la tarjeta (fondo crema oscuro, 3,5rem de alto a 2×).
  mkdirSync(ruta('test-results'), { recursive: true })
  await pagina.setViewportSize({ width: 1400, height: 800 })
  await pagina.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    body { margin: 16px; font: 14px system-ui, sans-serif; color: #2b2622; background: #fff;
           display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px }
    figure { margin: 0 } img { display: block; width: 100%; height: 112px; object-fit: contain; padding: 8px;
           box-sizing: border-box; background: #F6EADB; border-radius: 6px }
  </style></head><body>${hoja.map((m) => `<figure><img src="${m.url}" alt=""><figcaption>${m.id}</figcaption></figure>`).join('')}</body></html>`)
  await pagina.screenshot({ path: HOJA, fullPage: true })

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1)
  console.log(`${tipos.length} miniaturas, ${(bytes / 1000).toFixed(1)} kB en total, ${segundos} s. Hoja de contacto: ${HOJA}`)
} finally {
  await navegador.close()
  await servidor.close()
}
