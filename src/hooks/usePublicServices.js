import { useEffect, useState } from 'react'
import { getServicesPageCategories } from '../services/serviceCatalogService'
import { API_URL, obtenerCategoriasServicio, obtenerServicios } from '../services/publicApi'
import { mergeServiceCatalog } from '../services/publicServiceCatalog'

export default function usePublicServices() {
  const [state, setState] = useState({ categories: getServicesPageCategories(), loading: Boolean(API_URL), error: '' })
  useEffect(() => {
    if (!API_URL) return
    const controller = new AbortController()
    const options = { signal: controller.signal }
    Promise.all([obtenerCategoriasServicio(options), obtenerServicios(options)])
      .then(([categories, services]) => {
        const catalog = mergeServiceCatalog(categories, services)
        if (!controller.signal.aborted) setState({ categories: catalog, loading: false, error: '' })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ categories: getServicesPageCategories(), loading: false, error: `${error.message} Se muestra el catálogo local.` })
      })
    return () => controller.abort()
  }, [])
  return state
}
