import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const previousPathname = useRef(null)

  useEffect(() => {
    const routeChanged = previousPathname.current !== pathname
    previousPathname.current = pathname

    // Los enlaces a secciones conservan su desplazamiento específico.
    if (routeChanged && !hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname, hash])

  return null
}
