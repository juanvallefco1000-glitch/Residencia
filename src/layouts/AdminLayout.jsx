import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminHeader from '../components/admin/AdminHeader'
import '../styles/admin.css'

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const sidebarRef = useRef(null)
  const location = useLocation()
  const close = () => { setOpen(false); menuRef.current?.focus() }
  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sidebarRef.current?.querySelector('button')?.focus()
    const onKey = event => {
      if (event.key === 'Escape') { setOpen(false); menuRef.current?.focus() }
      if (event.key === 'Tab') {
        const links = sidebarRef.current?.querySelectorAll('a, button')
        const first = links?.[0], last = links?.[links.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    const media = window.matchMedia('(min-width: 761px)')
    const onResize = () => { if (media.matches) setOpen(false) }
    document.addEventListener('keydown', onKey)
    media.addEventListener('change', onResize)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKey); media.removeEventListener('change', onResize) }
  }, [open])
  return <div className="adminRoot adminShell">
    <AdminSidebar open={open} onClose={close} sidebarRef={sidebarRef} />
    {open && <button className="adminOverlay" aria-label="Cerrar menú administrativo" onClick={close} tabIndex={-1} />}
    <div className="adminWorkspace" inert={open ? true : undefined}><AdminHeader open={open} onToggle={() => setOpen(value => !value)} menuRef={menuRef} />
      <main className="adminContent"><p className="adminDemoNotice">Entorno de demostración · Datos de prueba · Los cambios no se guardan</p><Outlet /></main>
    </div>
  </div>
}
