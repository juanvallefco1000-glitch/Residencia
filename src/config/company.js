const name = 'SegurIXT'
const location = 'Ixtlán del Río, Nayarit'

// Información ya presente en el sitio. El correo sigue pendiente de definición.
export const company = {
  name,
  tagline: 'Soluciones Inteligentes',
  phone: { display: '324 116 1043', international: '+523241161043' },
  whatsapp: {
    number: '523241161043',
    message: `Hola ${name}, me gustaría solicitar información sobre sus servicios.`,
    description: 'Contacto directo para información y cotizaciones.',
  },
  email: null,
  emailPending: 'Se configurará el correo comercial definitivo en el panel administrativo.',
  location,
  serviceArea: `Atención en ${location} y zonas cercanas.`,
  institutional: {
    introduction: `En ${name} integramos tecnología, experiencia y atención personalizada para resolver necesidades de seguridad, conectividad, energía y automatización.`,
    summary: `Tecnología aplicada a seguridad, conectividad, energía y automatización.`,
    homeDescription: `${name} es una empresa dedicada a la instalación, configuración y mantenimiento de soluciones tecnológicas para hogares, comercios y pequeñas empresas.`,
    description: `${name} brinda servicios de instalación, configuración y mantenimiento de soluciones tecnológicas para hogares, comercios y pequeñas empresas, con atención en Ixtlán del Río y zonas cercanas.`,
    homeObjective: 'Proporcionar soluciones confiables y eficientes que mejoren la seguridad, conectividad, automatización y funcionamiento de cada espacio.',
    objective: 'Proporcionar soluciones tecnológicas confiables y eficientes que ayuden a mejorar la seguridad, conectividad, automatización y operación de cada cliente.',
    focus: 'Integrar distintas áreas tecnológicas en una atención centralizada, con asesoría personalizada y acompañamiento durante el proyecto.',
    vision: 'Consolidar una presencia tecnológica profesional en la región y ampliar los canales digitales de atención, consulta y comercialización.',
    values: ['Confianza', 'Compromiso', 'Atención personalizada', 'Responsabilidad', 'Mejora continua'],
    benefits: [
      { id: 'experience', title: 'Experiencia', text: 'Soluciones profesionales y adaptadas al proyecto.' },
      { id: 'warranty', title: 'Garantía', text: 'Respaldo en instalaciones, equipos y servicio.' },
      { id: 'attention', title: 'Atención', text: 'Acompañamiento antes, durante y después.' },
      { id: 'pricing', title: 'Precios justos', text: 'Propuestas de acuerdo con necesidades y presupuesto.' },
    ],
    footer: 'Seguridad, conectividad, energía y automatización para hogares, negocios y proyectos.',
  },
  seo: {
    title: `${name} | Soluciones inteligentes`,
    description: `${name} - Soluciones inteligentes en seguridad, redes, energía, automatización y soporte tecnológico.`,
  },
}

export const whatsappUrl = `https://wa.me/${company.whatsapp.number}?text=${encodeURIComponent(company.whatsapp.message)}`
