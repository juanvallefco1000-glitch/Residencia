import { useId, useState } from 'react'
import ServiceIcon from './ServiceIcon'
import ServiceDetails from './ServiceDetails'

// Etiquetas de presentación; los títulos y servicios proceden del catálogo.
const mobileLabels = {
  'videovigilancia-seguridad': 'SEGURIDAD',
  'redes-telecomunicaciones': 'REDES',
  'internet-satelital': 'INTERNET',
  'electricidad-soporte': 'ELECTRICIDAD',
}

export default function MobileServicesSelector({ services }) {
  const [selectedSlug, setSelectedSlug] = useState(null)
  const panelId = useId()
  const selectedService = services.find((service) => service.slug === selectedSlug)

  return (
    <div className="mobileServices">
      <div className="mobileServicesOptions" role="group" aria-label="Categorías de servicios">
        {services.map((service) => (
          <button
            key={service.slug}
            type="button"
            className="mobileServiceOption"
            aria-label={service.title}
            aria-expanded={selectedSlug === service.slug}
            aria-controls={panelId}
            onClick={() => setSelectedSlug((current) => current === service.slug ? null : service.slug)}
          >
            <ServiceIcon slug={service.slug} icon={service.icon} size={28} />
            <span>{mobileLabels[service.slug] ?? service.title}</span>
          </button>
        ))}
      </div>
      <div
        id={panelId}
        className="mobileServicesPanel"
        hidden={!selectedService}
        role="region"
        aria-labelledby={selectedService ? `${panelId}-heading` : undefined}
      >
        {selectedService && (
          <>
            <h3 id={`${panelId}-heading`}>{mobileLabels[selectedService.slug] ?? selectedService.title}</h3>
            <ServiceDetails service={selectedService} servicesLimit={5} />
          </>
        )}
      </div>
    </div>
  )
}
