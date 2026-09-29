import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ServiceDetails({ service, servicesLimit }) {
  return (
    <>
      <ul className="serviceCardList">
        {(service.shortServices ?? service.services).slice(0, servicesLimit).map((item) => (
          <li key={item}><Check size={15} aria-hidden="true" /><span>{item}</span></li>
        ))}
      </ul>
      <Link className="serviceCardMore" to={`/servicios/${service.slug}`} aria-label={`Ver más sobre ${service.title}`}>
        Ver más <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </>
  )
}
