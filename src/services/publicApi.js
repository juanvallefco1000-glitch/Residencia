// Una compilación sin URL usa exclusivamente el catálogo local.
export function resolveApiUrl(value, production = false) {
  if (!value?.trim()) return ''
  const url = new URL(value.trim())
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('VITE_API_URL debe ser una URL HTTP sin credenciales.')
  }
  if (production && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) return ''
  return url.href.replace(/\/$/, '')
}

export const API_URL = resolveApiUrl(import.meta.env?.VITE_API_URL, import.meta.env?.PROD)

export class PublicApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'PublicApiError'
    this.status = status
  }
}

const isProduct = (data) => data && Number.isInteger(data.id) && typeof data.nombre === 'string' && data.categoria
const isPage = (data) => data && Array.isArray(data.content) && data.content.every(isProduct)
  && Number.isInteger(data.totalPages) && Number.isInteger(data.totalElements)

// Un único transporte para servicios y productos; la inyección de fetch facilita sus pruebas.
export function createPublicApi(baseUrl, fetchImpl = globalThis.fetch) {
  async function consultar(endpoint, { signal } = {}, validate = Array.isArray) {
    if (!baseUrl) throw new PublicApiError('La API pública no está configurada.')
    let response
    try {
      response = await fetchImpl(`${baseUrl}${endpoint}`, { signal, cache: 'no-store', headers: { Accept: 'application/json' } })
    } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new PublicApiError('No se pudo conectar con la API pública.')
    }
    if (!response.ok) throw new PublicApiError(`La API pública respondió HTTP ${response.status}.`, response.status)
    let data
    try { data = await response.json() } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new PublicApiError('La API pública devolvió una respuesta inválida.')
    }
    if (!validate(data)) throw new PublicApiError('La API pública devolvió un formato inesperado.')
    return data
  }
  return {
    obtenerCategoriasServicio: (options) => consultar('/api/categorias-servicio', options),
    obtenerServicios: (options) => consultar('/api/servicios', options),
    obtenerCategoriasProducto: (options) => consultar('/api/categorias-producto', options),
    obtenerProductos: (filtros = {}, options) => {
      const params = new URLSearchParams()
      for (const key of ['page', 'size', 'categoria', 'q', 'destacado']) {
        const value = filtros[key]
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
      }
      return consultar(`/api/productos?${params}`, options, isPage)
    },
    obtenerProductoPorId: (id, options) => consultar(`/api/productos/${encodeURIComponent(id)}`, options, isProduct),
    obtenerProductoPorSlug: (slug, options) => consultar(`/api/productos/slug/${encodeURIComponent(slug)}`, options, isProduct),
  }
}

export const {
  obtenerCategoriasServicio, obtenerServicios, obtenerCategoriasProducto,
  obtenerProductos, obtenerProductoPorId, obtenerProductoPorSlug,
} = createPublicApi(API_URL)

export function productImageUrl(src) {
  return src?.startsWith('/api/productos/imagenes/') && API_URL ? `${API_URL}${src}` : src
}
