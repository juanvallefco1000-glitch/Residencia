import { adminRequest } from './authService.js'
export function createUserAdminService(request) {
  const base = '/api/admin/usuarios'
  const json = (method, body) => ({ method, body: JSON.stringify(body) })
  return {
    list: (filters = {}, options = {}) => {
      const params = new URLSearchParams()
      for (const key of ['page', 'size', 'q', 'rol', 'activo']) if (filters[key] !== '' && filters[key] != null) params.set(key, String(filters[key]))
      return request(`${base}?${params}`, options)
    },
    detail: id => request(`${base}/${encodeURIComponent(id)}`),
    create: values => request(base, json('POST', values)),
    update: (id, values) => request(`${base}/${encodeURIComponent(id)}`, json('PUT', values)),
    role: (id, rol) => request(`${base}/${encodeURIComponent(id)}/rol`, json('PATCH', { rol })),
    status: (id, activo) => request(`${base}/${encodeURIComponent(id)}/estado`, json('PATCH', { activo })),
    resetPassword: (id, values) => request(`${base}/${encodeURIComponent(id)}/password`, json('POST', values)),
  }
}
export const userAdminService = createUserAdminService(adminRequest)
