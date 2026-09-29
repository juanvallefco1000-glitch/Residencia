import { Link } from 'react-router-dom'
export default function AdminNotFound() {
  return <section className="adminPanel"><h1>Página administrativa no encontrada</h1><p>Selecciona una opción del menú para continuar.</p><Link className="adminButton" to="/admin">Volver al Dashboard</Link></section>
}
