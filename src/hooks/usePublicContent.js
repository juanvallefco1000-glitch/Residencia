import { useEffect, useState } from 'react'

// Actualiza pestañas públicas abiertas después de guardar en administración.
export default function usePublicContent(loader, enabled = true) {
  const [state, setState] = useState({ data: null, loading: enabled, error: '' })
  useEffect(() => {
    if (!enabled) return
    let controller
    function load() {
      controller?.abort()
      const current = new AbortController()
      controller = current
      setState(previous => ({ ...previous, loading: true, error: '' }))
      loader({ signal: current.signal }).then(
        data => { if (!current.signal.aborted) setState({ data, loading: false, error: '' }) },
        error => { if (!current.signal.aborted) setState(previous => ({ ...previous, loading: false, error: error.message })) },
      )
    }
    function storage(event) { if (event.key === 'segurixt:content-changed') load() }
    load()
    window.addEventListener('focus', load)
    window.addEventListener('segurixt:content-changed', load)
    window.addEventListener('storage', storage)
    // La vigencia también cambia sin una operación administrativa.
    const timer = window.setInterval(load, 60000)
    return () => {
      controller?.abort()
      window.removeEventListener('focus', load)
      window.removeEventListener('segurixt:content-changed', load)
      window.removeEventListener('storage', storage)
      window.clearInterval(timer)
    }
  }, [loader, enabled])
  return state
}
