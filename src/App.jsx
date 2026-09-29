import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import WhatsAppFloat from './components/WhatsAppFloat'
import Home from './pages/Home'
import Empresa from './pages/Empresa'
import ServicioCategoria from './pages/ServicioCategoria'
import Catalogo from './pages/Catalogo'
import CatalogoCategoria from './pages/CatalogoCategoria'
import Producto from './pages/Producto'
import Promociones from './pages/Promociones'
import Cotizacion from './pages/Cotizacion'
import NotFound from './pages/NotFound'

import AdminLayout from './layouts/AdminLayout'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProductos from './pages/admin/AdminProductos'
import AdminCategorias from './pages/admin/AdminCategorias'
import AdminServicios from './pages/admin/AdminServicios'
import AdminPromociones from './pages/admin/AdminPromociones'
import AdminCotizaciones from './pages/admin/AdminCotizaciones'
import AdminEmpresa from './pages/admin/AdminEmpresa'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminNotFound from './pages/admin/AdminNotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="productos" element={<AdminProductos />} />
        <Route path="categorias" element={<AdminCategorias />} />
        <Route path="servicios" element={<AdminServicios />} />
        <Route path="promociones" element={<AdminPromociones />} />
        <Route path="cotizaciones" element={<AdminCotizaciones />} />
        <Route path="empresa" element={<AdminEmpresa />} />
        <Route path="usuarios" element={<AdminUsuarios />} />
        <Route path="*" element={<AdminNotFound />} />
      </Route>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/empresa" element={<Empresa />} />
        <Route path="/servicios" element={<Navigate to="/" replace />} />
        <Route path="/servicios/:slug" element={<ServicioCategoria />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/catalogo/:slug" element={<CatalogoCategoria />} />
        <Route path="/producto/:id" element={<Producto />} />
        <Route path="/promociones" element={<Promociones />} />
        <Route path="/cotizacion" element={<Cotizacion />} />
        <Route path="/contacto" element={<Navigate to="/#contacto" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function PublicLayout() {
  return <div className="app"><Navbar /><Outlet /><Footer /><WhatsAppFloat /></div>
}
