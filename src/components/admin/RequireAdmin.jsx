import { useEffect, useState, useSyncExternalStore } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { canReadModule } from '../../services/admin/permissions.js'
import { ADMIN_ENABLED, getSession, subscribe, validateSession } from '../../services/admin/authService'

export default function RequireAdmin() {
  const session = useSyncExternalStore(subscribe, getSession)
  const location = useLocation()
  const token = session?.token
  const [attempt, setAttempt] = useState(0)
  const [validation, setValidation] = useState(null)
  useEffect(() => {
    if (!token) return
    let active = true
    const key = { token, path: location.pathname, attempt }
    async function check() {
      try {
        const user = await validateSession()
        if (active && user) setValidation({ ...key, error: '' })
      } catch (error) {
        if (active) setValidation({ ...key, error: error.status === 403
          ? 'El servidor no permite validar esta sesión. Contacta al administrador del sistema.'
          : 'No se pudo verificar la sesión. Comprueba la conexión y vuelve a intentar.' })
      }
    }
    check()
    const timer = setInterval(check, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [location.pathname, token, attempt])
  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => { validateSession().catch(() => {}) }, Math.max(0, Date.parse(session.expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [session?.expiresAt])
  if (!ADMIN_ENABLED || !session) return <Navigate to="/admin/login" replace />
  // La clave de ruta evita montar Productos antes de validar y abortar sus consultas después.
  if (!validation || validation.token !== token || validation.path !== location.pathname || validation.attempt !== attempt) {
    return <main className="adminRoot adminContent" role="status">Validando sesión…</main>
  }
  if (validation.error) return <main className="adminRoot adminContent">
    <p role="alert">{validation.error} La sesión se conserva; el acceso permanece bloqueado hasta verificarla.</p>
    <button className="adminButton" onClick={() => setAttempt(value => value + 1)}>Reintentar validación</button>
  </main>
  const module = location.pathname.split('/')[2] || 'dashboard'
  if (!canReadModule(session.usuario.rol, module)) return <Navigate to="/admin" replace />
  return <Outlet />
}
