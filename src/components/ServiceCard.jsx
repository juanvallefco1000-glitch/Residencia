import ServiceIcon from './ServiceIcon'
import ServiceDetails from './ServiceDetails'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function ServiceCard({ service, detailed = false, servicesLimit }) {
  if (detailed) {
    return (
      <article className="serviceCard serviceCardDetailed">
        <h3 className="serviceCardTitle">{service.title}</h3>
        <div className="serviceIcon serviceCardIcon">
          <ServiceIcon slug={service.slug} icon={service.icon} size={56} />
        </div>
        <ServiceDetails service={service} servicesLimit={servicesLimit} />
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
