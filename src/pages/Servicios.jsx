import ServiceCard from '../components/ServiceCard'
import { getServiceCategories } from '../services/serviceCatalogService'

export default function Servicios() {
  return (
    <main>
      <section className="pageHero">
        <span className="sectionKicker">Servicios</span>
        <h1>Soluciones organizadas en cuatro categorías</h1>
        <p>
          Selecciona el área de interés para consultar específicamente los servicios disponibles.
        </p>
      </section>

      <section className="section">
        <div className="serviceGrid fourColumns">
          {getServiceCategories().map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </section>
    </main>
  )
}
