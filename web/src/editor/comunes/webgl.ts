/** Si el navegador puede crear un contexto WebGL. Suelta el de prueba al momento: los contextos son limitados. */
export function hayWebgl(): boolean {
  try {
    const lienzo = document.createElement('canvas')
    const contexto = lienzo.getContext('webgl2') ?? lienzo.getContext('webgl')
    contexto?.getExtension('WEBGL_lose_context')?.loseContext()
    return contexto !== null
  } catch {
    return false
  }
}
