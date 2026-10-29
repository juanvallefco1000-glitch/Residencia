import { API_URL } from '../publicApi.js'

export function adminEnabled(base, production, validated) {
  if (!base) return false
  const url = new URL(base)
  return production ? validated === 'true' && url.protocol === 'https:' : true
}
export const ADMIN_ENABLED = adminEnabled(API_URL, import.meta.env?.PROD, import.meta.env?.VITE_ADMIN_AUTH_VALIDATED)

export class AdminApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

export function createAuthClient(base, enabled, fetchImpl = globalThis.fetch) {
  let session = null
  let validation = null
  const listeners = new Set()
  const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
  const getSession = () => session
  function update(value) { session = value; listeners.forEach(listener => listener()) }
  function expireSession() {
    if (session && Date.parse(session.expiresAt) <= Date.now()) update(null)
  }
  async function adminRequest(path, options = {}) {
    if (!enabled) throw new AdminApiError('El acceso administrativo no está habilitado en este despliegue.')
    expireSession()
    const requestToken = session?.token
    const isLogin = path === '/api/auth/login'
    const isSessionCheck = path === '/api/auth/me'
    if (!requestToken && !isLogin) throw new AdminApiError('Inicia sesión de nuevo.', 401)
    let response
    try {
      response = await fetchImpl(`${base}${path}`, { ...options, credentials: 'omit', cache: 'no-store', headers: {
        Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(requestToken && !isLogin ? { Authorization: `Bearer ${requestToken}` } : {}), ...options.headers,
      } })
    } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new AdminApiError('No se pudo conectar con el servidor. Intenta de nuevo.')
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      let message = body.mensaje || (response.status === 403 ? 'No tienes permisos para esta operación.' : 'No se pudo completar la solicitud.')
      if (response.status === 401 && requestToken && session?.token === requestToken && !isLogin) {
        if (isSessionCheck) {
          // Solo el rechazo del endpoint de sesión confirma la invalidez de este token.
          update(null)
        } else {
          try {
            await validateSession()
            if (session?.token === requestToken) message = 'La API rechazó esta operación, pero tu sesión sigue activa. Reintenta o consulta al administrador del sistema.'
          } catch (error) {
            if (session?.token === requestToken) message = 'No se pudo verificar la sesión con el servidor. Reintenta cuando esté disponible.'
          }
        }
      }
      throw new AdminApiError(message, response.status)
    }
    return response.status === 204 ? null : response.json()
  }
  async function login(credentials) {
    const result = await adminRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
    update(result)
    return result.usuario
  }
  async function validateSession() {
    expireSession()
    if (!session) return null
    const token = session.token
    if (validation?.token === token) return validation.promise
    const current = { token }
    current.promise = (async () => {
      try {
        const usuario = await adminRequest('/api/auth/me')
        if (session?.token === token) update({ ...session, usuario })
        return usuario
      } finally {
        // Un error de red, 403 o 5xx no demuestra que el JWT sea inválido.
        if (validation === current) validation = null
      }
    })()
    validation = current
    return current.promise
  }
  async function logout() {
    const token = session?.token
    try { if (token) await adminRequest('/api/auth/logout', { method: 'POST' }) }
    finally { if (session?.token === token) update(null) }
  }

  return { subscribe, getSession, adminRequest, login, validateSession, logout }
}
export const { subscribe, getSession, adminRequest, login, validateSession, logout } = createAuthClient(API_URL, ADMIN_ENABLED)
