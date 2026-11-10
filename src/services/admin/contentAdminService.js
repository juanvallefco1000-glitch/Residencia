import { adminRequest } from './authService.js'

export function createContentService(base, request = adminRequest) {
  return {
    list: () => request(base),
    create: value => request(base, { method: 'POST', body: JSON.stringify(value) }),
    update: (id, value) => request(`${base}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(value) }),
  }
}
export const categoryAdminService = createContentService('/api/admin/productos/categorias')
export const serviceAdminService = createContentService('/api/admin/servicios')
export const promotionAdminService = createContentService('/api/admin/promociones')
export const getServiceCategories = () => adminRequest('/api/admin/servicios/categorias')

export function announceContentChange() {
  window.dispatchEvent(new Event('segurixt:content-changed'))
  try { localStorage.setItem('segurixt:content-changed', `${Date.now()}-${Math.random()}`) } catch { /* Se recarga también al recuperar el foco. */ }
  window.dispatchEvent(new Event('segurixt:products-changed'))
  try { localStorage.setItem('segurixt:products-changed', `${Date.now()}-${Math.random()}`) } catch { /* Sin almacenamiento disponible. */ }
}
