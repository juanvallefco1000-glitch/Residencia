import { adminRequest } from './authService.js'

export function createProductAdminService(request) {
  const base = '/api/admin/productos'
  const json = (method, body) => ({ method, body: JSON.stringify(body) })
  return {
    list: (filters = {}, options = {}) => {
      const params = new URLSearchParams()
      for (const key of ['page', 'size', 'q', 'categoriaId', 'activo']) {
        if (filters[key] !== '' && filters[key] != null) params.set(key, String(filters[key]))
      }
      return request(`${base}?${params}`, options)
    },
    categories: () => request(`${base}/categorias`),
    createCategory: category => request(`${base}/categorias`, json('POST', category)),
    detail: id => request(`${base}/${encodeURIComponent(id)}`),
    create: product => request(base, json('POST', product)),
    update: (id, product) => request(`${base}/${encodeURIComponent(id)}`, json('PUT', product)),
    remove: id => request(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    addImage: (id, image) => request(`${base}/${encodeURIComponent(id)}/imagenes`, json('POST', image)),
    removeImage: (id, imageId) => request(`${base}/${encodeURIComponent(id)}/imagenes/${encodeURIComponent(imageId)}`, { method: 'DELETE' }),
  }
}
export const productAdminService = createProductAdminService(adminRequest)

export function announceProductChange() {
  window.dispatchEvent(new Event('segurixt:products-changed'))
  try { localStorage.setItem('segurixt:products-changed', `${Date.now()}-${Math.random()}`) } catch { /* El catálogo también se actualiza al recuperar el foco. */ }
}
export function validateImage(file) {
  if (!file || !['image/jpeg', 'image/png'].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) return 'Selecciona un archivo JPEG o PNG.'
  if (file.size === 0 || file.size > 3 * 1024 * 1024) return 'La imagen debe ocupar como máximo 3 MiB.'
  return ''
}
export function imagePayload(file, textoAlt, principal) {
  const error = validateImage(file)
  if (error) return Promise.reject(new Error(error))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.onload = () => resolve({ nombreArchivo: file.name, contenidoBase64: String(reader.result).split(',')[1], textoAlt, principal })
    reader.readAsDataURL(file)
  })
}
