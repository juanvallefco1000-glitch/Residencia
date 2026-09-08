import { ShieldCheck, Network, Zap, Cpu, Wrench, Cctv, SatelliteDish } from 'lucide-react'

const icons = {
  'seguridad-videovigilancia': ShieldCheck,
  'redes-telecomunicaciones': Network,
  'energia-instalaciones': Zap,
  'automatizacion-soporte': Cpu,
  'security-camera': Cctv,
  network: Network,
  satellite: SatelliteDish,
  electricity: Zap,
}

export default function ServiceIcon({ slug, icon, size = 30 }) {
  const Icon = icons[icon] || icons[slug] || Wrench
  return <Icon size={size} aria-hidden="true" />
}
