import { publicSalePrice } from './catalogService.js'
import { API_URL, createPublicApi } from './publicApi.js'

// El cotizador nunca utiliza el catálogo demostrativo ni acepta precios del cliente.
export function createQuoteClient(baseUrl, fetchImpl = globalThis.fetch) {
 return async function request(path, body, signal) {
  if (!baseUrl) throw new Error('El cotizador requiere conexión con el catálogo real. Contacta a SegurIXT para solicitar tu presupuesto.')
  const response = await fetchImpl(`${baseUrl}/api/cotizador${path}`, {
    method: body ? 'POST' : 'GET', signal, credentials: 'omit', cache: 'no-store',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = [401, 403].includes(response.status) ? `No se pudo acceder al cotizador público (HTTP ${response.status}). No necesitas iniciar sesión; contacta a SegurIXT si el problema continúa.` : data.mensaje || 'No fue posible consultar el cotizador. Intenta nuevamente.'
    const error = new Error(message); error.status = response.status; throw error
  }
  return data
 }
}
export const quoteRequest = createQuoteClient(API_URL)
export const quoteMoney = value => {
  if (value == null || typeof value === 'boolean' || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0) return 'Pendiente de estimación'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(Number(value))
}

// La selección comparte el endpoint y el DTO públicos del catálogo comercial.
// No importa adminRequest ni transporta tokens JWT.
export function quoteCatalogError(error) {
  const messages = {
    401: 'El servidor rechazó el catálogo público (HTTP 401). Esta consulta no requiere iniciar sesión; revisa la configuración de la API.',
    403: 'El servidor no permite consultar el catálogo público (HTTP 403).',
    404: 'No se encontró el catálogo público (HTTP 404). Revisa la URL de la API.',
  }
  return messages[error.status] || error.message || 'No se pudo consultar el catálogo público.'
}
export function createQuoteCatalog(baseUrl, fetchImpl = globalThis.fetch) {
  const api = createPublicApi(baseUrl, fetchImpl)
  return {
    async list(q = '', page = 0, signal) {
      try {
        const data = await api.obtenerProductos({ q, page, size: 24 }, { signal })
        return { ...data, content: data.content.map(toQuoteProduct) }
      } catch (error) {
        if (error.name === 'AbortError') throw error
        const failure = new Error(quoteCatalogError(error))
        failure.status = error.status
        throw failure
      }
    },
    async detail(id, signal) {
      try { return toQuoteProduct(await api.obtenerProductoPorId(id, { signal })) }
      catch (error) {
        if (error.name === 'AbortError') throw error
        const failure = new Error(quoteCatalogError(error))
        failure.status = error.status
        throw failure
      }
    },
  }
}
export function toQuoteProduct(product) {
  return { id: product.id, name: product.nombre, price: product.mostrarPrecio ? publicSalePrice(product.precio) : null,
    brand: product.marca || '', model: product.modelo || '', description: product.descripcionCorta || '',
    images: Array.isArray(product.imagenes) ? product.imagenes : [],
  }
}
export const quoteCatalog = createQuoteCatalog(API_URL)
