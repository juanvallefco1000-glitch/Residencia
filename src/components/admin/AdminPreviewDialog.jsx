import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function AdminPreviewDialog({ preview, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    if (preview) ref.current?.showModal()
    else ref.current?.close()
  }, [preview])
  return <dialog className="adminDialog" ref={ref} aria-labelledby="admin-dialog-title" onCancel={onClose} onClose={onClose}>
    {preview && <><div className="adminDialogHeading"><h2 id="admin-dialog-title">{preview.title}</h2><button className="adminIconButton" onClick={onClose} aria-label="Cerrar detalle"><X size={22} /></button></div>
      <p>{preview.detail}</p><p className="adminMuted">Vista de demostración. No se guardan cambios ni se realizan eliminaciones.</p>
      <button className="adminButton" onClick={onClose}>Cerrar</button></>}
  </dialog>
}
