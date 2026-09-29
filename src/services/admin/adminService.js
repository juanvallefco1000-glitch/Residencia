import { adminProducts, adminCategories, adminServices, adminPromotions, adminQuotes, adminUsers, adminCompany, adminDashboard } from '../../data/admin/mockData'

// Contrato de lectura asíncrono. Sustituir cada adaptador por fetch al integrar Spring Boot.
// Los componentes no importan mocks ni conocen las URLs del backend.
export const adminEndpoints = {
  dashboard: '/api/admin/dashboard', products: '/api/productos', categories: '/api/categorias',
  services: '/api/servicios', promotions: '/api/promociones', quotes: '/api/cotizaciones',
}
const mockResponse = async (data) => structuredClone(data)
export const adminService = {
  getDashboard: () => mockResponse(adminDashboard),
  getProducts: () => mockResponse(adminProducts),
  getCategories: () => mockResponse(adminCategories),
  getServices: () => mockResponse(adminServices),
  getPromotions: () => mockResponse(adminPromotions),
  getQuotes: () => mockResponse(adminQuotes),
  getCompany: () => mockResponse(adminCompany),
  getUsers: () => mockResponse(adminUsers),
}
