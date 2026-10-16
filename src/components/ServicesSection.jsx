import ServiceCard from './ServiceCard'
import MobileServicesSelector from './MobileServicesSelector'
import usePublicServices from '../hooks/usePublicServices'
import ServiceCatalogStatus from './ServiceCatalogStatus'
import './ServicesSection.css'

export default function ServicesSection() {
  const { categories: services, loading, error } = usePublicServices()

  return (
    <section id="servicios" className="section softSection" aria-labelledby="services-heading">
      <div className="sectionHeading">
        <span className="sectionKicker">Nuestros servicios</span>
        <h2 id="services-heading">Soluciones tecnológicas para tu seguridad y conectividad</h2>
      </div>
      <ServiceCatalogStatus loading={loading} error={error} />
      <div className="serviceGrid servicesSectionGrid">
        {services.map((service) => (
          <ServiceCard
            key={service.slug}
            service={service}
            detailed
            servicesLimit={5}
          />
        ))}
      </div>
      <MobileServicesSelector services={services} />
    </section>
  )
}
