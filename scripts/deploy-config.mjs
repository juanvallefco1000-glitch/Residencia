export function frontendBase(value, command = 'build') {
  const base = value?.trim() || (command === 'serve' ? '/Residencia/' : '/')
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('VITE_BASE_PATH debe ser una ruta absoluta terminada en /, sin query ni fragmento.')
  return base
}
export function validateFrontendProduction(env) {
  let url
  try { url = new URL(env.VITE_API_URL || '') } catch { throw new Error('Configura VITE_API_URL con el origen HTTPS público del backend.') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/'
    || url.hostname.toLowerCase().replace(/\.$/, '') === 'localhost' || url.hostname.toLowerCase().endsWith('.localhost')
    || url.hostname.startsWith('127.') || ['[::1]', '0.0.0.0'].includes(url.hostname.toLowerCase())) throw new Error('VITE_API_URL debe ser un origen HTTPS público, sin credenciales, /api, query ni fragmento.')
  if (!['true', 'false'].includes(env.VITE_ADMIN_AUTH_VALIDATED || '')) throw new Error('Define VITE_ADMIN_AUTH_VALIDATED=true o false; habilitar ADMIN requiere validación previa.')
  if (frontendBase(env.VITE_BASE_PATH, 'build') !== '/') throw new Error('El despliegue de Vercel requiere VITE_BASE_PATH=/.')
}
