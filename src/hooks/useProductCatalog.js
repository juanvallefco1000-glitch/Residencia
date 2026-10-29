import { useEffect, useState } from 'react'
import { API_URL } from '../services/publicApi'
import useCatalogRevision from './useCatalogRevision'
import { loadCatalog } from '../services/catalogService'

export default function useProductCatalog({ page = 0, size = 12, categoria = '', q = '', destacado } = {}) {
  const revision = useCatalogRevision()
  const [state, setState] = useState({ categories: [], products: [], loading: true, error: '', totalPages: 0, source: API_URL ? 'api' : 'local' })
  useEffect(() => {
    const controller = new AbortController()
    const filters = { page, size, categoria, q, destacado }
    setState(previous => ({ ...previous, products: [], loading: true, error: '' }))
    // Breve espera para no enviar una consulta por cada pulsación del buscador.
    const timer = setTimeout(() => {
      loadCatalog(filters, { signal: controller.signal }).then(result => {
        if (!controller.signal.aborted) setState({ ...result, loading: false, error: '' })
      }).catch(error => {
        // No mezclar IDs locales con IDs remotos cuando una API está configurada.
        if (!controller.signal.aborted) setState(previous => ({ ...previous, products: [], totalPages: 0, totalElements: 0, loading: false, error: error.message }))
      })
    }, q ? 250 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [page, size, categoria, q, destacado, revision])
  return state
}
