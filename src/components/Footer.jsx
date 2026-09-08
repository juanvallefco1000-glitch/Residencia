import { company } from '../config/company'
import { Link } from 'react-router-dom'
import logoSegurIXT from '../assets/segurixt-logo-oficial.jpeg'

export default function Footer() {
  return (
    <footer className="footer">
      <div>
        <Link className="brand" to="/">
          <img
            src={logoSegurIXT}
            alt={`${company.name} ${company.tagline}`}
            className="logoFooter"
          />
        </Link>
        <p>{company.institutional.footer}</p>
      </div>

      <div className="footerLinks">
        <Link to="/empresa">Empresa</Link>
        <Link to="/servicios">Servicios</Link>
        <Link to="/catalogo">Catálogo</Link>
        <Link to="/cotizacion">Cotización</Link>
        <Link to="/contacto">Contacto</Link>
      </div>

      <div className="footerMeta">
        <strong>{company.location}</strong>
        <span>© 2026 {company.name}</span>
      </div>
    </footer>
  )
}
