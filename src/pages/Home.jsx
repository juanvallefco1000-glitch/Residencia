import { company } from '../config/company'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Handshake,
  ShieldCheck,
} from 'lucide-react'
import useProductCatalog from '../hooks/useProductCatalog'
import ServicesSection from '../components/ServicesSection'
import ProductCard from '../components/ProductCard'

const benefitIcons = { experience: BadgeCheck, warranty: ShieldCheck, attention: Clock3, pricing: Handshake }

export default function Home() {
  const location = useLocation()
  const featured = useProductCatalog({ size: 4, destacado: true })

  useEffect(() => {
    if (location.hash === '#servicios') {
      document.getElementById('servicios')?.scrollIntoView({ block: 'start' })
    }
  }, [location])

  return (
    <main>
      <ServicesSection />

      <section className="institutional section">
        <div className="sectionHeading">
          <span className="sectionKicker">Conoce {company.name}</span>
          <h2>Soluciones tecnológicas para hogares y negocios</h2>
        </div>

        <div className="institutionalGrid">
          <article className="institutionalCard">
            <span>01</span>
            <h3>Descripción</h3>
            <p>{company.institutional.homeDescription}</p>
          </article>

          <article className="institutionalCard">
            <span>02</span>
            <h3>Objetivo</h3>
            <p>{company.institutional.homeObjective}</p>
          </article>

          <article className="institutionalCard">
            <span>03</span>
            <h3>Enfoque</h3>
            <p>{company.institutional.focus}</p>
          </article>
        </div>

        <Link className="textLink" to="/empresa">
          Ver información de la empresa <ArrowRight size={16} />
        </Link>
      </section>

      <section className="section">
        <div className="sectionHeading headingRow">
          <div>
            <span className="sectionKicker">Catálogo</span>
            <h2>Productos destacados</h2>
            <p>
              Explora productos para tu proyecto y consulta su disponibilidad con nuestro equipo.
            </p>
          </div>
          <Link className="button secondary" to="/catalogo">
            Ver catálogo <ArrowRight size={18} />
          </Link>
        </div>

        <div className="productGrid">
          {featured.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <p role="status">{featured.loading ? 'Cargando productos…' : featured.error || (featured.source === 'local' ? 'Catálogo local demostrativo.' : !featured.products.length ? 'No hay productos destacados disponibles.' : '')}</p>
      </section>

      <section className="section softSection">
        <div className="sectionHeading">
          <span className="sectionKicker">Por qué elegirnos</span>
          <h2>Atención profesional de principio a fin</h2>
        </div>

        <div className="benefitGrid">
          {company.institutional.benefits.map(({ id, title, text }) => {
            const Icon = benefitIcons[id]
            return (
              <article className="benefitCard" key={id}>
                <Icon size={28} />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="cta">
        <div>
          <span className="sectionKicker">¿Tienes un proyecto?</span>
          <h2>Cuéntanos qué necesitas</h2>
          <p>Te ayudamos a identificar una solución adecuada para tu hogar, negocio o proyecto.</p>
        </div>
        <Link className="button primary large" to="/cotizacion">
          Solicitar cotización <ArrowRight size={19} />
        </Link>
      </section>
    </main>
  )
}
