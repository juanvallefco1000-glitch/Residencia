import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import WhatsAppFloat from './components/WhatsAppFloat'
import Home from './pages/Home'
import Empresa from './pages/Empresa'
import Servicios from './pages/Servicios'
import ServicioCategoria from './pages/ServicioCategoria'
import Catalogo from './pages/Catalogo'
import CatalogoCategoria from './pages/CatalogoCategoria'
import Producto from './pages/Producto'
import Promociones from './pages/Promociones'
import Cotizacion from './pages/Cotizacion'
import Contacto from './pages/Contacto'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/empresa" element={<Empresa />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/servicios/:slug" element={<ServicioCategoria />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/catalogo/:slug" element={<CatalogoCategoria />} />
        <Route path="/producto/:id" element={<Producto />} />
        <Route path="/promociones" element={<Promociones />} />
        <Route path="/cotizacion" element={<Cotizacion />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <WhatsAppFloat />
    </div>
  )
}
