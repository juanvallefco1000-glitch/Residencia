import { useState } from 'react'
import useAdminData from '../../hooks/admin/useAdminData'
import { adminService } from '../../services/admin/adminService'
import { PageHeading, DataState, AdminTable, PreviewButton } from '../../components/admin/AdminUI'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminPreviewDialog from '../../components/admin/AdminPreviewDialog'

export default function AdminCategorias() {
  const state = useAdminData(adminService.getCategories)
  const [preview, setPreview] = useState(null)
  const columns = [
    { key: 'title', label: 'Nombre' }, { key: 'slug', label: 'Slug' }, { key: 'count', label: 'Cantidad de elementos' },
    { key: 'status', label: 'Estado', render: row => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Acciones', render: row => <PreviewButton onPreview={setPreview} title={`Editar · ${row.title}`} detail="La edición de categorías estará disponible al conectar la API.">Editar</PreviewButton> },
  ]
  return <><PageHeading title="Categorías" description="Categorías del catálogo actual. Las categorías de servicios se consultan en Servicios." /><DataState state={state}>{data => <AdminTable caption="Categorías de productos" columns={columns} rows={data} rowKey="slug" />}</DataState><AdminPreviewDialog preview={preview} onClose={() => setPreview(null)} /></>
}
