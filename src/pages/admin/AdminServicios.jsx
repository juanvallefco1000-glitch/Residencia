import { useState } from 'react'
import useAdminData from '../../hooks/admin/useAdminData'
import { adminService } from '../../services/admin/adminService'
import { PageHeading, DataState, PreviewButton } from '../../components/admin/AdminUI'
import ServiceIcon from '../../components/ServiceIcon'
import AdminPreviewDialog from '../../components/admin/AdminPreviewDialog'
export default function AdminServicios() {
  const state = useAdminData(adminService.getServices)
  const [preview, setPreview] = useState(null)
  return <><PageHeading title="Servicios" description="Las cuatro categorías y todos sus servicios actuales."><PreviewButton onPreview={setPreview} title="Agregar servicio" detail="El alta de servicios estará disponible al conectar la API.">+ Agregar servicio</PreviewButton></PageHeading>
    <DataState state={state}>{data => <div className="adminServiceGrid">{data.map(category => <section className="adminPanel" key={category.slug}>
      <div className="adminPanelHeading"><ServiceIcon icon={category.icon} /><h2>{category.title}</h2></div>
      <div className="adminServiceGroups">{category.serviceGroups.map(group => <div key={group.id}><h3>{group.title}</h3><ul>{group.services.map(service => <li key={service}>{service}</li>)}</ul></div>)}</div>
      <div className="adminActions"><PreviewButton onPreview={setPreview} title={`Editar · ${category.title}`} detail="La edición de esta categoría estará disponible al conectar la API.">Editar</PreviewButton><PreviewButton onPreview={setPreview} title={`Estado · ${category.title}`} detail="El control de activación se conectará a la API. No se modifica la visibilidad de los servicios públicos.">Activar/desactivar</PreviewButton></div>
    </section>)}</div>}</DataState><AdminPreviewDialog preview={preview} onClose={() => setPreview(null)} /></>
}
