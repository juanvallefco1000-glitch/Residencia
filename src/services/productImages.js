export function primaryProductImage(images = []) {
  if (!Array.isArray(images)) return undefined
  return images.find(image => image?.principal) || images[0]
}
export function resolveProductImage(src, apiUrl = '', basePath = '/') {
  if (typeof src !== 'string' || !src || src !== src.trim() || src.startsWith('//') || src.includes('\\')
    || /(^|\/)\.\.(\/|$)/.test(src) || /^\/(home|root|tmp|var|etc|Users)(\/|$)/i.test(src)) return ''
  if (/^https?:\/\//i.test(src)) {
    try { const url = new URL(src); return url.username || url.password ? '' : src } catch { return '' }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(src)) return ''
  if (src.startsWith('/api/productos/imagenes/')) return `${apiUrl}${src}`
  if (src.startsWith('api/productos/imagenes/')) return `${apiUrl}/${src}`
  return src.startsWith('/') ? src : `${basePath.endsWith('/') ? basePath : `${basePath}/`}${src}`
}
