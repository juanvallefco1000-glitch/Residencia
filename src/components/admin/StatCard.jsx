import { Link } from 'react-router-dom'
export default function StatCard({ title, value, icon: Icon, to }) {
  return <Link className="adminStatCard" to={to}><span className="adminStatIcon"><Icon size={23} /></span><span>{title}<strong>{value}</strong><small>Ver listado →</small></span></Link>
}
