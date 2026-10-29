import { catalogCategories, products } from '../data/products.js'
import { API_URL, obtenerCategoriasProducto, obtenerProductos, obtenerProductoPorId } from './publicApi.js'

// Se conserva el adaptador síncrono para la navegación y otros consumidores locales.
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

export const adaptCategory = (category) => ({
  id: category.id, slug: category.slug, title: category.nombre, description: category.descripcion,
})

export function adaptProduct(product) {
  return {
    id: product.id, slug: product.slug, name: product.nombre, brand: product.marca,
    model: product.modelo, category: product.categoria.slug, categoryName: product.categoria.nombre,
    description: product.descripcionCorta || product.descripcion || '',
    fullDescription: product.descripcion || product.descripcionCorta || '',
    price: product.mostrarPrecio && product.precio != null ? product.precio : null,
    featured: product.destacado, images: product.imagenes || [],
  }
}

const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function localCatalog({ page = 0, size = 12, categoria = '', q = '', destacado } = {}) {
  const term = normalize(q.trim())
  const matches = products.filter(p => (!categoria || p.category === categoria)
    && (destacado == null || Boolean(p.featured) === destacado)
    && [p.name, p.description, p.brand, p.model].some(value => normalize(value).includes(term)))
  return {
    categories: catalogCategories,
    products: matches.slice(page * size, (page + 1) * size).map(p => ({
      ...p, price: null, categoryName: getCatalogCategory(p.category)?.title,
    })),
    page, totalPages: Math.ceil(matches.length / size), totalElements: matches.length, source: 'local',
  }
}

export async function loadCatalog(filters, options) {
  if (!API_URL) return localCatalog(filters)
  const [categories, result] = await Promise.all([obtenerCategoriasProducto(options), obtenerProductos(filters, options)])
  return {
    categories: categories.map(adaptCategory), products: result.content.map(adaptProduct),
    page: result.page, totalPages: result.totalPages, totalElements: result.totalElements, source: 'api',
  }
}

export async function loadProduct(id, options) {
  // Un 404 remoto jamás se sustituye por un producto local que comparta el mismo ID.
  if (API_URL) return { product: adaptProduct(await obtenerProductoPorId(id, options)), source: 'api' }
  const product = getProductById(id)
  return { product: product ? { ...product, price: null, categoryName: getCatalogCategory(product.category)?.title } : null, source: 'local' }
}
