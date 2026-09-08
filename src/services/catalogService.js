import { catalogCategories, products } from '../data/products'

// Adaptador local: las páginas no conocen el origen de los datos.
// La migración a REST y a resultados asíncronos se hará al definir la API.
export function getCatalogCategories() {
  return catalogCategories
}

export function getProducts() {
  return products
}

export function getFeaturedProducts(limit = 4) {
  return products.filter((product) => product.featured).slice(0, limit)
}

export function getCatalogCategory(slug) {
  return catalogCategories.find((item) => item.slug === slug)
}

export function getProductsByCategory(slug) {
  return products.filter((item) => item.category === slug)
}

export function getProductById(id) {
  return products.find((item) => item.id === Number(id))
}
