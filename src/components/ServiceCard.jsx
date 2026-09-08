import ServiceIcon from './ServiceIcon'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'

export default function ServiceCard({ service, detailed = false, servicesLimit }) {
  if (detailed) {
    return (
      <article className="serviceCard serviceCardDetailed">
        <h3 className="serviceCardTitle">{service.title}</h3>
        <div className="serviceIcon serviceCardIcon">
          <ServiceIcon slug={service.slug} icon={service.icon} size={56} />
        </div>
        <ul className="serviceCardList">
          {(service.shortServices ?? service.services).slice(0, servicesLimit).map((item) => (
            <li key={item}><Check size={15} aria-hidden="true" /><span>{item}</span></li>
          ))}
        </ul>
        <Link className="serviceCardMore" to={`/servicios/${service.slug}`} aria-label={`Ver más sobre ${service.title}`}>
          Ver más <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </article>
    )
  }

  return (
    <article className="serviceCard">
      <div className="serviceIcon"><ServiceIcon slug={service.slug} size={30} /></div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <Link to={`/servicios/${service.slug}`}>
        Ver servicios <ArrowRight size={16} />
      </Link>
    </article>
  )
}
