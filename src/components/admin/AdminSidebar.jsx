import { useSyncExternalStore } from 'react'
import { getSession, subscribe, logout } from '../../services/admin/authService'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Tags, Wrench, BadgePercent, FileText, Building2, Users, ExternalLink, LogOut, X } from 'lucide-react'
import { canReadModule } from '../../services/admin/permissions.js'
import logo from '../../assets/segurixt-logo-oficial.jpeg'

const items = [
  ['/admin', 'Dashboard', LayoutDashboard], ['/admin/productos', 'Productos', Package],
  ['/admin/categorias', 'Categorías', Tags], ['/admin/servicios', 'Servicios', Wrench],
  ['/admin/promociones', 'Promociones', BadgePercent], ['/admin/cotizaciones', 'Cotizaciones', FileText],
  ['/admin/empresa', 'Empresa', Building2], ['/admin/usuarios', 'Usuarios', Users],
]
export default function AdminSidebar({ open, onClose, sidebarRef }) {
  const session = useSyncExternalStore(subscribe, getSession)
  const navigate = useNavigate()

  async function signOut() {
    try { await logout(); navigate('/admin/login', { replace: true }) }
    catch { navigate('/admin/login', { replace: true, state: { message: 'Sesión local cerrada. No se pudo confirmar la revocación; la sesión del servidor expirará en un máximo de 15 minutos.' } }) }
  }
  return <aside id="admin-sidebar" ref={sidebarRef} className={`adminSidebar${open ? ' isOpen' : ''}`} aria-label="Menú administrativo">
    <div className="adminBrand"><img src={logo} alt="SegurIXT" /><button className="adminIconButton adminMobileOnly" onClick={onClose} aria-label="Cerrar menú"><X /></button></div>
    <span className="adminSidebarLabel">ADMINISTRACIÓN</span>
    <nav aria-label="Navegación administrativa">{items.filter(([to]) => canReadModule(session?.usuario.rol, to.split('/')[2] || 'dashboard')).map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/admin'} onClick={onClose}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
    <div className="adminSidebarBottom"><Link to="/" onClick={onClose}><ExternalLink size={19} />Ver sitio</Link><button onClick={signOut}><LogOut size={19} />Cerrar sesión</button><small>{session?.usuario.rol}</small></div>
  </aside>
}
