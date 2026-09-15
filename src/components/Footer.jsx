import { useEffect, useRef } from 'react'
import { company, whatsappUrl } from '../config/company'
import { Link, useLocation } from 'react-router-dom'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import logoSegurIXT from '../assets/segurixt-logo-oficial.jpeg'

export default function Footer() {
  const footerRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    if (location.hash === '#contacto') {
      footerRef.current?.scrollIntoView({ block: 'start' })
      footerRef.current?.focus({ preventScroll: true })
    }
  }, [location])

  return (
    <footer id="contacto" ref={footerRef} tabIndex={-1} className="footer" aria-label="Contacto y enlaces de la empresa">
      <div>
        <Link className="brand" to="/">
          <img src={logoSegurIXT} alt={`${company.name} ${company.tagline}`} className="logoFooter" />
        </Link>
        <strong className="footerCompanyName">{company.name}</strong>
        <p>{company.institutional.footer}</p>
        <Link className="button secondary footerQuote" to="/cotizacion">Solicitar cotización</Link>
      </div>

      <div>
        <h2>Contacto</h2>
        <ul className="footerContactList">
          <li>
            <Phone size={18} aria-hidden="true" />
            <div><strong>Teléfono</strong><a href={`tel:${company.phone.international}`}>{company.phone.display}</a></div>
          </li>
          <li>
            <MessageCircle size={18} aria-hidden="true" />
            <div>
              <strong>WhatsApp</strong>
              <a href={whatsappUrl} target="_blank" rel="noreferrer">{company.whatsapp.description}</a>
            </div>
          </li>
          {company.email && (
            <li>
              <Mail size={18} aria-hidden="true" />
              <div><strong>Correo electrónico</strong><a href={`mailto:${company.email}`}>{company.email}</a></div>
            </li>
          )}
        </ul>
        {company.social.length > 0 && (
          <>
            <h3>Redes sociales</h3>
            <div className="footerSocial">
              {company.social.map(({ name, url }) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">{name}</a>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <h2>Ubicación{company.schedule ? ' y horario' : ''}</h2>
        <ul className="footerContactList">
          <li>
            <MapPin size={18} aria-hidden="true" />
            <div>
              <strong>{company.mapUrl ? <a href={company.mapUrl} target="_blank" rel="noreferrer">{company.location}</a> : company.location}</strong>
              <span>{company.serviceArea}</span>
            </div>
          </li>
          {company.schedule && (
            <li><Clock size={18} aria-hidden="true" /><div><strong>Horario de atención</strong><span>{company.schedule}</span></div></li>
          )}
        </ul>
      </div>

      <div>
        <h2>Enlaces</h2>
        <nav className="footerLinks" aria-label="Enlaces del pie de página">
          <Link to="/">Inicio</Link>
          <Link to="/empresa">Empresa</Link>
          <Link to="/servicios">Servicios</Link>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/promociones">Promociones</Link>
          <Link to="/cotizacion">Cotización</Link>
          <Link to={{ pathname: location.pathname, search: location.search, hash: '#contacto' }}>Contacto</Link>
        </nav>
      </div>

      <div className="footerMeta">
        <span>© {new Date().getFullYear()} {company.name}</span>
      </div>
    </footer>
  )
}
