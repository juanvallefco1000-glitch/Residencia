import { NavLink, Link } from 'react-router-dom'
import { LayoutDashboard, Package, Tags, Wrench, BadgePercent, FileText, Building2, Users, ExternalLink, LogOut, X } from 'lucide-react'
import logo from '../../assets/segurixt-logo-oficial.jpeg'

const items = [
  ['/admin', 'Dashboard', LayoutDashboard], ['/admin/productos', 'Productos', Package],
  ['/admin/categorias', 'Categorías', Tags], ['/admin/servicios', 'Servicios', Wrench],
  ['/admin/promociones', 'Promociones', BadgePercent], ['/admin/cotizaciones', 'Cotizaciones', FileText],
  ['/admin/empresa', 'Empresa', Building2], ['/admin/usuarios', 'Usuarios', Users],
]
export default function AdminSidebar({ open, onClose, sidebarRef }) {
  return <aside id="admin-sidebar" ref={sidebarRef} className={`adminSidebar${open ? ' isOpen' : ''}`} aria-label="Menú administrativo">
    <div className="adminBrand"><img src={logo} alt="SegurIXT" /><button className="adminIconButton adminMobileOnly" onClick={onClose} aria-label="Cerrar menú"><X /></button></div>
    <span className="adminSidebarLabel">ADMINISTRACIÓN</span>
    <nav aria-label="Navegación administrativa">{items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/admin'} onClick={onClose}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
    <div className="adminSidebarBottom"><Link to="/" onClick={onClose}><ExternalLink size={19} />Ver sitio</Link><Link to="/admin/login" onClick={onClose}><LogOut size={19} />Cerrar sesión</Link><small>Demostración · sin sesión activa</small></div>
  </aside>
}
