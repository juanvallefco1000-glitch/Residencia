import { useState } from 'react'
import useAdminData from '../../hooks/admin/useAdminData'
import { adminService } from '../../services/admin/adminService'
import { PageHeading, DataState, AdminTable, PreviewButton } from '../../components/admin/AdminUI'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminPreviewDialog from '../../components/admin/AdminPreviewDialog'

export default function AdminUsuarios() {
  const state = useAdminData(adminService.getUsers)
  const [preview, setPreview] = useState(null)
  const columns = [
    { key: 'name', label: 'Nombre' }, { key: 'email', label: 'Correo' }, { key: 'role', label: 'Rol' },
    { key: 'status', label: 'Estado', render: row => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Acciones', render: row => <PreviewButton onPreview={setPreview} title={`Usuario · ${row.name}`} detail={`Rol previsto: ${row.role}. La gestión de cuentas y permisos se habilitará con el backend.`}>Editar</PreviewButton> },
  ]
  return <><PageHeading title="Usuarios" description="Roles previstos: ADMIN y EDITOR. Cuentas ficticias, sin permisos ni sesiones activas." /><DataState state={state}>{data => <AdminTable caption="Usuarios de ejemplo" columns={columns} rows={data} />}</DataState><AdminPreviewDialog preview={preview} onClose={() => setPreview(null)} /></>
}
