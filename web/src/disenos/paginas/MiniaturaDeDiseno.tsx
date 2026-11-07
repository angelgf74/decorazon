import { useEffect, useState } from 'react'
import Icono from '../../editor/comunes/Icono'
import { urlDeMiniatura } from './miniaturas'

/**
 * La miniatura de un diseño en Mis diseños: su vista previa (la 3D que se rehace al guardar) si la tiene (`fecha`); si
 * no, o si no llega, un hueco con el icono. Decorativa: el nombre va al lado.
 */
export default function MiniaturaDeDiseno({ id, fecha }: { id: string; fecha: string | null | undefined }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!fecha) return
    let vigente = true
    // oxlint-disable-next-line react/set-state-in-effect
    urlDeMiniatura(id, fecha).then((u) => { if (vigente) setUrl(u) })
    return () => { vigente = false }
  }, [id, fecha])
  return (
    <div className="disenos__miniatura" aria-hidden="true">
      {url ? <img src={url} alt="" /> : <Icono nombre="disenos" />}
    </div>
  )
}
