/**
 * Contorno de silueta para las miniaturas del catálogo: sobre la franja crema, un mueble blanco o gris claro casi no se
 * distingue (contraste de 1,2 a 1,5:1). Un borde fino de tinta a media opacidad alrededor del mueble lo recorta sin
 * cambiar sus colores. Lo usa `scripts/generar-miniaturas.mjs` después de redimensionar; JS puro, así que el resultado
 * no depende de la versión de sharp ni de la máquina.
 */
export interface OpcionesDeContorno {
  /** Grosor en píxeles de la imagen; el contorno es redondo (un disco de ese radio). */
  px: number
  color: readonly [number, number, number]
  /** Opacidad del contorno donde el mueble es opaco. */
  opacidad: number
}

/**
 * Devuelve la imagen RGBA (sin premultiplicar) ensanchada `px` por cada lado, con el contorno debajo: en cada píxel,
 * tan opaco como lo más opaco del mueble a `px` o menos, por `opacidad`; el mueble se compone encima.
 */
export function contornear(rgba: Uint8Array, ancho: number, alto: number, { px, color, opacidad }: OpcionesDeContorno) {
  const w = ancho + 2 * px
  const h = alto + 2 * px
  const alfaOriginal = (x: number, y: number) => {
    const ox = x - px, oy = y - px
    return ox < 0 || oy < 0 || ox >= ancho || oy >= alto ? 0 : rgba[(oy * ancho + ox) * 4 + 3]
  }
  const disco: [number, number][] = []
  for (let dy = -px; dy <= px; dy++) for (let dx = -px; dx <= px; dx++) if (dx * dx + dy * dy <= px * px + 0.5) disco.push([dx, dy])

  const datos = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let maximo = 0
      for (const [dx, dy] of disco) {
        const a = alfaOriginal(x + dx, y + dy)
        if (a > maximo) { maximo = a; if (a === 255) break }
      }
      const fondoA = Math.round(maximo * opacidad) / 255
      const i = (y * w + x) * 4
      const ox = x - px, oy = y - px
      const j = (oy * ancho + ox) * 4
      const encimaA = ox < 0 || oy < 0 || ox >= ancho || oy >= alto ? 0 : rgba[j + 3] / 255
      // «Encima de» sin premultiplicar: el mueble sobre el contorno.
      const a = encimaA + fondoA * (1 - encimaA)
      if (a === 0) continue
      for (let c = 0; c < 3; c++) {
        const encima = encimaA > 0 ? rgba[j + c] : 0
        datos[i + c] = Math.round((encima * encimaA + color[c] * fondoA * (1 - encimaA)) / a)
      }
      datos[i + 3] = Math.round(a * 255)
    }
  }
  return { datos, ancho: w, alto: h }
}
