import { useState } from 'react'
import { Box } from 'lucide-react'
import './ProductCatalog.css'
import { productImageUrl } from '../services/publicApi.js'

export default function ProductImage({ images = [], name, size = 44 }) {
  const first = images[0]
  const src = productImageUrl(first?.url)
  const [failedUrl, setFailedUrl] = useState(null)
  // Solo imágenes HTTP(S) o rutas del sitio; se descartan protocolos no adecuados.
  const safe = src && !src.startsWith('//') && (/^https?:\/\//i.test(src) || !/^[a-z][a-z\d+.-]*:/i.test(src))
  if (!safe || failedUrl === src) return <Box size={size} aria-label="Sin imagen disponible" />
  const resolved = /^https?:\/\//i.test(src) || src.startsWith('/') ? src : `${import.meta.env.BASE_URL}${src}`
  return <img className="catalogProductImage" src={resolved} alt={first.textoAlt || name} loading="lazy" onError={() => setFailedUrl(src)} />
}
