import AdminContentManager from '../../components/admin/AdminContentManager'
import { categoryAdminService } from '../../services/admin/contentAdminService.js'
const fields = [
  { key: 'nombre', label: 'Nombre', required: true, maxLength: 120 },
  { key: 'slug', label: 'Slug', required: true, maxLength: 120 },
  { key: 'descripcion', label: 'Descripción', type: 'textarea', maxLength: 500 },
  { key: 'orden', label: 'Orden', type: 'number', required: true },
]
export default function AdminCategorias() {
  return <AdminContentManager title="Categorías" module="categorias" service={categoryAdminService} fields={fields} initial={{ nombre: '', slug: '', descripcion: '', orden: 0, activo: true }} />
}
