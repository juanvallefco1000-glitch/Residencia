import './ServicioCategoria.css'
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
        <div className="serviceIcon largeIcon"><ServiceIcon slug={service.slug} icon={service.icon} size={36} /></div>
        <span className="sectionKicker">Servicios</span>
        <h1>{service.title}</h1>
        {service.description && <p>{service.description}</p>}
      </section>

      <section className="section detailLayout">
        <div>
          <h2>Servicios disponibles</h2>
          <div className="serviceDetailGroups">
            {(service.serviceGroups ?? [{ id: service.slug, services: service.services }]).map((group) => (
              <div className="serviceDetailGroup" key={group.id}>
                {group.title && <h3>{group.title}</h3>}
                <ul className="serviceDetailList">
                  {group.services.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={20} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
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
