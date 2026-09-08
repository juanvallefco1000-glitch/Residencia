import { company } from '../config/company'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

export default function Contacto() {
  return (
    <main>
      <section className="pageHero">
        <span className="sectionKicker">Contacto</span>
        <h1>Estamos para ayudarte</h1>
        <p>{company.serviceArea}</p>
      </section>

      <section className="section contactGrid">
        <article className="contentCard">
          <MapPin size={29} />
          <h2>Ubicación</h2>
          <p>{company.location}.</p>
        </article>
        <article className="contentCard">
          <Phone size={29} />
          <h2>Teléfono</h2>
          <p><a href={`tel:${company.phone.international}`}>{company.phone.display}</a></p>
        </article>
        <article className="contentCard">
          <MessageCircle size={29} />
          <h2>WhatsApp</h2>
          <p>{company.whatsapp.description}</p>
        </article>
        <article className="contentCard">
          <Mail size={29} />
          <h2>Correo</h2>
          <p>{company.email ? <a href={`mailto:${company.email}`}>{company.email}</a> : company.emailPending}</p>
        </article>
      </section>
    </main>
  )
}
