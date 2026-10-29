import { useState, useSyncExternalStore } from 'react'
import { getSession, subscribe } from '../../services/admin/authService.js'
import { canWriteModule } from '../../services/admin/permissions.js'
import useAdminData from '../../hooks/admin/useAdminData'
import { adminService } from '../../services/admin/adminService'
import { PageHeading, DataState, AdminTable, PreviewButton, MediaPreview } from '../../components/admin/AdminUI'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminPreviewDialog from '../../components/admin/AdminPreviewDialog'

export default function AdminPromociones() {
  const session = useSyncExternalStore(subscribe, getSession)
  const canWrite = canWriteModule(session?.usuario.rol, 'promociones')
  const state = useAdminData(adminService.getPromotions)
  const [preview, setPreview] = useState(null)
  const columns = [
    { key: 'image', label: 'Imagen', render: row => <MediaPreview image={row.image} title={row.title} /> },
    { key: 'title', label: 'Título' }, { key: 'start', label: 'Fecha de inicio' }, { key: 'end', label: 'Fecha de finalización' },
    { key: 'status', label: 'Estado', render: row => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Acciones', render: row => canWrite ? <PreviewButton onPreview={setPreview} title={`Editar · ${row.title}`} detail={`Vigencia de ejemplo: ${row.start} a ${row.end}. La edición se habilitará al conectar la API.`}>Editar</PreviewButton> : null },
  ]
  return <><PageHeading title="Promociones" description="Organiza las campañas y sus fechas de vigencia.">{canWrite && <PreviewButton onPreview={setPreview} title="Nueva promoción" detail="El alta de promociones estará disponible en la siguiente etapa.">+ Nueva promoción</PreviewButton>}</PageHeading><DataState state={state}>{data => <AdminTable caption="Promociones" columns={columns} rows={data} />}</DataState><AdminPreviewDialog preview={preview} onClose={() => setPreview(null)} /></>
}
