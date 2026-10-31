import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/** Donde la API de la prueba escribe cada correo simulado (Correo:CarpetaDeSimulados). */
export const CARPETA_DE_CORREOS = resolve(import.meta.dirname, '../../test-results/correos')

const ESPERA_MAXIMA_MS = 10_000
const SONDEO_MS = 200

async function ultimoCorreoPara(para: string): Promise<string | null> {
  let nombres: string[]
  try {
    nombres = await readdir(CARPETA_DE_CORREOS)
  } catch {
    return null
  }
  // Los nombres empiezan por la fecha (yyyyMMddHHmmssfff): el orden alfabético es el cronológico.
  for (const nombre of nombres.filter((n) => n.endsWith('.txt')).sort().reverse()) {
    const texto = await readFile(join(CARPETA_DE_CORREOS, nombre), 'utf8')
    if (texto.split('\n', 1)[0] === `Para: ${para}`) return texto
  }
  return null
}

/** Espera el último correo dirigido a `para` y devuelve su enlace que contiene `contiene`. */
export async function enlaceDelUltimoCorreo(para: string, contiene: string): Promise<string> {
  const limite = Date.now() + ESPERA_MAXIMA_MS
  for (;;) {
    const texto = await ultimoCorreoPara(para)
    const enlace = texto?.match(/https?:\/\/\S+/g)?.find((url) => url.includes(contiene))
    if (enlace !== undefined) return enlace
    if (Date.now() > limite) throw new Error(`No ha llegado ningún correo para ${para} con un enlace a ${contiene}`)
    await new Promise((r) => setTimeout(r, SONDEO_MS))
  }
}
