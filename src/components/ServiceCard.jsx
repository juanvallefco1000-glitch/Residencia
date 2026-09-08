import ServiceIcon from './ServiceIcon'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function ServiceCard({ service }) {

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
