import ServiceCard from './ServiceCard'
import { getServicesPageCategories } from '../services/serviceCatalogService'
import './ServicesSection.css'

export default function ServicesSection() {
  return (
    <section id="servicios" className="section softSection" aria-labelledby="services-heading">
      <div className="sectionHeading">
        <span className="sectionKicker">Nuestros servicios</span>
        <h2 id="services-heading">Soluciones tecnológicas para tu seguridad y conectividad</h2>
      </div>
      <div className="serviceGrid servicesSectionGrid">
        {getServicesPageCategories().map((service) => (
          <ServiceCard key={service.slug} service={service} detailed servicesLimit={5} />
        ))}
      </div>
    </section>
  )
}
