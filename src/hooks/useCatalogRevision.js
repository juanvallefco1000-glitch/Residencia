import { useEffect, useState } from 'react'

// Actualiza al guardar en esta pestaña, en otra pestaña y al volver al catálogo.
export default function useCatalogRevision() {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision(v => v + 1)
    const storage = event => { if (event.key === 'segurixt:products-changed') refresh() }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', storage)
    window.addEventListener('segurixt:products-changed', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', storage)
      window.removeEventListener('segurixt:products-changed', refresh)
    }
  }, [])
  return revision
}
