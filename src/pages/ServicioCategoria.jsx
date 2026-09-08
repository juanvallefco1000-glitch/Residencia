import ServiceIcon from '../components/ServiceIcon'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, MessageCircle } from 'lucide-react'
import { getServiceCategory } from '../services/serviceCatalogService'

export default function ServicioCategoria() {
  const { slug } = useParams()
  const service = getServiceCategory(slug)

  if (!service) {
    return (
      <main className="simplePage">
        <h1>Categoría no encontrada</h1>
        <Link className="textLink" to="/servicios"><ArrowLeft size={16} /> Volver a servicios</Link>
      </main>
    )
  }


  return (
    <main>
      <section className="pageHero categoryHero">
        <div className="serviceIcon largeIcon"><ServiceIcon slug={service.slug} size={36} /></div>
        <span className="sectionKicker">Servicios</span>
        <h1>{service.title}</h1>
        <p>{service.description}</p>
      </section>

      <section className="section detailLayout">
        <div>
          <h2>Servicios disponibles</h2>
          <div className="featureList">
            {service.services.map((item) => (
              <div key={item}>
                <CheckCircle2 size={20} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="sideCta">
          <MessageCircle size={32} />
          <h3>¿Necesitas este servicio?</h3>
          <p>Solicita una cotización y describe brevemente tu proyecto.</p>
          <Link className="button primary" to={`/cotizacion?servicio=${service.slug}`}>
            Solicitar cotización
          </Link>
        </aside>
      </section>
    </main>
  )
}
