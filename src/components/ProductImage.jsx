import { useState } from 'react'
import { Box } from 'lucide-react'
import './ProductCatalog.css'
import { API_URL } from '../services/publicApi.js'
import { primaryProductImage, resolveProductImage } from '../services/productImages.js'
import imageUnavailable from '../assets/product-image-unavailable.svg'

export default function ProductImage({ images = [], name, size = 44, showFallback = false }) {
  const first = primaryProductImage(images)
  const src = resolveProductImage(first?.url, API_URL, import.meta.env.BASE_URL)
  const [failedUrl, setFailedUrl] = useState(null)
  if (!src || failedUrl === src) {
    return showFallback ? <span className="productImageFallback"><img src={imageUnavailable} alt="" aria-hidden="true" loading="lazy" /><span>Imagen no disponible</span></span> : <Box size={size} aria-label="Sin imagen disponible" />
  }
  return <img className="catalogProductImage" src={src} alt={first.textoAlt || name} loading="lazy" onError={() => setFailedUrl(src)} />
}
