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

async function consultar(endpoint, { signal } = {}) {
  if (!API_URL) throw new Error('La API pública no está configurada.')
  let response
  try {
    response = await fetch(`${API_URL}${endpoint}`, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('No se pudo conectar con la API de servicios.', { cause: error })
  }
  if (!response.ok) throw new Error(`La API de servicios respondió HTTP ${response.status}.`)
  const data = await response.json()
  if (!Array.isArray(data)) throw new Error('La API de servicios devolvió un formato inesperado.')
  return data
}

export const obtenerCategoriasServicio = (options) => consultar('/api/categorias-servicio', options)
export const obtenerServicios = (options) => consultar('/api/servicios', options)
