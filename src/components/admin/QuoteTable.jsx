import { AdminTable } from './AdminUI'
import StatusBadge from './StatusBadge'
export default function QuoteTable({ quotes, compact = false, onView }) {
  const columns = [
    { key: 'client', label: 'Cliente' },
    ...(!compact ? [{ key: 'phone', label: 'Teléfono' }, { key: 'email', label: 'Correo' }] : []),
    { key: 'date', label: 'Fecha' },
    compact ? { key: 'service', label: 'Servicio' } : { key: 'type', label: 'Tipo' },
    { key: 'status', label: 'Estado', render: row => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Acciones', render: row => <button className="adminButton adminButtonSmall" onClick={() => onView({ title: `Cotización #${row.id} · ${row.client}`, detail: `${row.service} · ${row.date} · ${row.status}. ${row.email}. Teléfono: ${row.phone || 'Sin definir'}. ${row.message}` })}>{compact ? 'Ver' : 'Ver detalle'}</button> },
  ]
  return <AdminTable caption={compact ? 'Cotizaciones recientes' : 'Solicitudes de cotización'} columns={columns} rows={quotes} />
}
