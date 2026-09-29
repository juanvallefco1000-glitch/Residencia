import { products, catalogCategories } from '../products'
import { servicesPageCategories } from '../servicesPage'
import { company } from '../../config/company'

// Datos de demostración, sin clientes ni usuarios reales. Sin persistencia.
export const adminProducts = products.map((product, index) => ({
  ...product, image: null, price: [1290, 2490, 1590, 3200, 1890, 990][index],
  status: 'Activo', categoryName: catalogCategories.find(c => c.slug === product.category)?.title,
}))
export const adminCategories = catalogCategories.map(category => ({
  ...category, count: products.filter(p => p.category === category.slug).length, status: 'Activo',
}))
export const adminServices = servicesPageCategories
export const adminPromotions = [
  { id: 1, title: 'Instalación de videovigilancia · Demo', image: null, start: '2026-09-01', end: '2026-09-30', status: 'Activa' },
  { id: 2, title: 'Conectividad para negocios · Demo', image: null, start: '2026-10-01', end: '2026-10-31', status: 'Programada' },
  { id: 3, title: 'Mantenimiento preventivo · Demo', image: null, start: '2026-08-01', end: '2026-08-31', status: 'Finalizada' },
]
export const quoteStatuses = ['Nueva', 'En revisión', 'Cotizada', 'Aceptada', 'Rechazada']
export const adminQuotes = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1, client: `Cliente de ejemplo ${index + 1}`, phone: null,
  email: `cliente${index + 1}@example.com`, date: `2026-09-${String(15 - index).padStart(2, '0')}`,
  type: 'Servicio', service: servicesPageCategories[index % 4].title,
  status: quoteStatuses[index % quoteStatuses.length], message: 'Solicitud de demostración para revisar la interfaz de cotizaciones.',
}))
export const adminUsers = [
  { id: 1, name: 'Administrador de ejemplo', email: 'admin@example.com', role: 'ADMIN', status: 'Activo' },
  { id: 2, name: 'Editor de ejemplo', email: 'editor@example.com', role: 'EDITOR', status: 'Inactivo' },
]
export const adminCompany = {
  name: company.name, description: company.institutional.description,
  phone: company.phone.display, whatsapp: company.whatsapp.number, email: company.email || '',
  location: company.location, schedule: company.schedule || '',
  facebook: company.social.find(s => s.name.toLowerCase() === 'facebook')?.url || '',
  instagram: company.social.find(s => s.name.toLowerCase() === 'instagram')?.url || '',
}
export const adminDashboard = {
  products: adminProducts.length,
  services: adminServices.reduce((total, category) => total + category.services.length, 0),
  promotions: adminPromotions.length, quotes: adminQuotes.length, recentQuotes: adminQuotes.slice(0, 5),
}
