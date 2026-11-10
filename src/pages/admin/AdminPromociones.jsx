import AdminContentManager from '../../components/admin/AdminContentManager'
import { promotionAdminService } from '../../services/admin/contentAdminService.js'
const fields = [
  { key: 'titulo', label: 'Título', required: true, maxLength: 200 },
  { key: 'descripcion', label: 'Descripción', type: 'textarea', maxLength: 10000 },
  { key: 'imagenUrl', label: 'URL de imagen (http, https o ruta del sitio)', maxLength: 500 },
  { key: 'fechaInicio', label: 'Fecha de inicio', type: 'date' },
  { key: 'fechaFin', label: 'Fecha de finalización', type: 'date' },
]
export default function AdminPromociones() {
  return <AdminContentManager title="Promociones" module="promociones" service={promotionAdminService} fields={fields} initial={{ titulo: '', descripcion: '', imagenUrl: '', fechaInicio: '', fechaFin: '', activo: true }} />
}
