import { getServicesPageCategories } from '../services/serviceCatalogService'
import { API_URL, obtenerCategoriasServicio, obtenerServicios } from '../services/publicApi'
import { mergeServiceCatalog } from '../services/publicServiceCatalog'
import usePublicContent from './usePublicContent'

const load = options => Promise.all([obtenerCategoriasServicio(options), obtenerServicios(options)])
  .then(([categories, services]) => mergeServiceCatalog(categories, services))

export default function usePublicServices() {
  const state = usePublicContent(load, Boolean(API_URL))
  return {
    categories: state.data ?? (API_URL ? [] : getServicesPageCategories()),
    loading: state.loading,
    error: state.error,
  }
}
