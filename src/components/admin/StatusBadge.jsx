const tones = { Nueva: 'gold', 'En revisión': 'blue', Cotizada: 'blue', Aceptada: 'green', Rechazada: 'red', Activo: 'green', Activa: 'green', Inactivo: 'muted', Programada: 'gold', Finalizada: 'muted' }
export default function StatusBadge({ status }) {
  return <span className={`adminBadge adminBadge-${tones[status] || 'muted'}`}>{status}</span>
}
