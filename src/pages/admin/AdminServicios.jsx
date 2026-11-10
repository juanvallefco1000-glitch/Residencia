import AdminContentManager from '../../components/admin/AdminContentManager'
import { serviceAdminService, getServiceCategories } from '../../services/admin/contentAdminService.js'
import useAdminData from '../../hooks/admin/useAdminData'
const fields = [
  { key: 'nombre', label: 'Nombre', required: true, maxLength: 150 },
  { key: 'slug', label: 'Slug', required: true, maxLength: 150 },
  { key: 'categoriaId', label: 'Categoría de servicios', type: 'category', required: true },
  { key: 'orden', label: 'Orden', type: 'number', required: true },
  { key: 'descripcionCorta', label: 'Descripción corta', type: 'textarea', maxLength: 500 },
  { key: 'descripcion', label: 'Descripción', type: 'textarea', maxLength: 10000 },
  { key: 'imagenUrl', label: 'URL de imagen (http, https o ruta del sitio)', maxLength: 500 },
]
export default function AdminServicios() {
  const categories = useAdminData(getServiceCategories)
  return <AdminContentManager title="Servicios" module="servicios" service={serviceAdminService} fields={fields} categories={categories.data || []} categoryError={categories.error} retryCategories={categories.retry} initial={{ nombre: '', slug: '', categoriaId: '', descripcionCorta: '', descripcion: '', imagenUrl: '', orden: 0, destacado: false, activo: true }} />
}
