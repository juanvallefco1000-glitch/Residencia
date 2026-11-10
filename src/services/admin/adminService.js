import { categoryAdminService, serviceAdminService, promotionAdminService } from './contentAdminService.js'
import { adminProducts, adminQuotes, adminUsers, adminCompany, adminDashboard } from '../../data/admin/mockData'

// Contrato de lectura asíncrono. Sustituir cada adaptador por fetch al integrar Spring Boot.
// Los componentes no importan mocks ni conocen las URLs del backend.
export const adminEndpoints = {
  dashboard: '/api/admin/dashboard', products: '/api/admin/productos', categories: '/api/admin/productos/categorias',
  services: '/api/admin/servicios', promotions: '/api/admin/promociones', quotes: '/api/admin/cotizaciones',
}
const mockResponse = async (data) => structuredClone(data)
export const adminService = {
  getDashboard: () => mockResponse(adminDashboard),
  getProducts: () => mockResponse(adminProducts),
  getCategories: categoryAdminService.list,
  getServices: serviceAdminService.list,
  getPromotions: promotionAdminService.list,
  getQuotes: () => mockResponse(adminQuotes),
  getCompany: () => mockResponse(adminCompany),
  getUsers: () => mockResponse(adminUsers),
}
