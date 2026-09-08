import { ShieldCheck, Network, Zap, Cpu, Wrench } from 'lucide-react'

const icons = {
  'seguridad-videovigilancia': ShieldCheck,
  'redes-telecomunicaciones': Network,
  'energia-instalaciones': Zap,
  'automatizacion-soporte': Cpu,
}

export default function ServiceIcon({ slug, size = 30 }) {
  const Icon = icons[slug] || Wrench
  return <Icon size={size} aria-hidden="true" />
}
