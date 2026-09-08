import { serviceCategories } from '../data/services'
import { servicesPageCategories } from '../data/servicesPage'

// Adaptador local; todavía no realiza solicitudes HTTP.
export function getServiceCategories() {
  return serviceCategories
}

export function getServiceCategory(slug) {
  return servicesPageCategories.find((item) => item.slug === slug || item.aliases?.includes(slug))
    || serviceCategories.find((item) => item.slug === slug)
}

export function getServicesPageCategories() {
  return servicesPageCategories
}
