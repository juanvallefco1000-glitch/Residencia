import { company } from '../config/company'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Handshake,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react'
import brandImage from '../assets/segurixt-logo-oficial.jpeg'
import { getFeaturedProducts } from '../services/catalogService'
import ServicesSection from '../components/ServicesSection'
import ProductCard from '../components/ProductCard'

const benefitIcons = { experience: BadgeCheck, warranty: ShieldCheck, attention: Clock3, pricing: Handshake }

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="heroContent">
          <span className="eyebrow">
            <ShieldCheck size={18} /> Seguridad • Tecnología • Confianza
          </span>
          <h1>Más que servicios, <span>soluciones inteligentes.</span></h1>
          <p>{company.institutional.introduction}</p>

          <div className="heroActions">
            <Link className="button primary" to="/cotizacion">
              <MessageCircle size={19} /> Solicitar cotización
            </Link>
            <a className="button secondary" href="#servicios">
              Conocer servicios <ArrowRight size={19} />
            </a>
          </div>
        </div>

        <div className="heroVisual">
          <img src={brandImage} alt={`Identidad visual de ${company.name}`} />
        </div>
      </section>

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

      <ServicesSection />

      <section className="section">
        <div className="sectionHeading headingRow">
          <div>
            <span className="sectionKicker">Catálogo</span>
            <h2>Productos destacados</h2>
            <p>
              Vista preliminar del catálogo. Posteriormente los productos podrán
              sincronizarse desde proveedores autorizados mediante el backend.
            </p>
          </div>
          <Link className="button secondary" to="/catalogo">
            Ver catálogo <ArrowRight size={18} />
          </Link>
        </div>

        <div className="productGrid">
          {getFeaturedProducts().map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
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
