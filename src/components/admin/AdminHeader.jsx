import { Menu, UserRound } from 'lucide-react'
export default function AdminHeader({ open, onToggle, menuRef }) {
  return <header className="adminHeader"><div><button ref={menuRef} className="adminIconButton adminMobileOnly" aria-label="Abrir menú administrativo" aria-expanded={open} aria-controls="admin-sidebar" onClick={onToggle}><Menu /></button><strong>Panel de Administración</strong></div><span className="adminIdentity"><UserRound size={20} /><span>Administrador<small>Vista de demostración</small></span></span></header>
}
