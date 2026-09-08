import { serviceCategories } from '../data/services'

// Adaptador local; todavía no realiza solicitudes HTTP.
export function getServiceCategories() {
  return serviceCategories
}

export function getServiceCategory(slug) {
  return serviceCategories.find((item) => item.slug === slug)
}
