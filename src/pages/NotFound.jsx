import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="simplePage">
      <span className="sectionKicker">404</span>
      <h1>Página no encontrada</h1>
      <p>La dirección solicitada no existe dentro del sitio.</p>
      <Link className="button primary" to="/">Volver al inicio</Link>
    </main>
  )
}
