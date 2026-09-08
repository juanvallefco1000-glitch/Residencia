import { whatsappUrl } from '../config/company'
import { MessageCircle } from 'lucide-react'

export default function WhatsAppFloat() {
  return (
    <a
      className="whatsappFloat"
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
    >
      <MessageCircle size={27} />
    </a>
  )
}
