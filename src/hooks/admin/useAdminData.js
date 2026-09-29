import { useEffect, useState } from 'react'

export default function useAdminData(loader) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setState({ data: null, loading: true, error: '' })
    Promise.resolve().then(loader).then(
      data => { if (active) setState({ data, loading: false, error: '' }) },
      () => { if (active) setState({ data: null, loading: false, error: 'No fue posible cargar la información.' }) },
    )
    return () => { active = false }
  }, [loader, attempt])
  return { ...state, retry: () => setAttempt(value => value + 1) }
}
