import { useState } from 'react'
import useAdminData from '../../hooks/admin/useAdminData'
import { adminService } from '../../services/admin/adminService'
import { PageHeading, DataState, AdminTable, PreviewButton, MediaPreview } from '../../components/admin/AdminUI'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminPreviewDialog from '../../components/admin/AdminPreviewDialog'

const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
export default function AdminProductos() {
  const state = useAdminData(adminService.getProducts)
  const categories = useAdminData(adminService.getCategories)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [preview, setPreview] = useState(null)
  const columns = [
    { key: 'image', label: 'Imagen', render: row => <MediaPreview image={row.image} title={row.name} /> },
    { key: 'name', label: 'Producto' }, { key: 'categoryName', label: 'Categoría' },
    { key: 'price', label: 'Precio', render: row => money(row.price) },
    { key: 'status', label: 'Estado', render: row => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Acciones', render: row => <div className="adminActions"><PreviewButton onPreview={setPreview} title={`Editar · ${row.name}`} detail={`Categoría: ${row.categoryName}. Precio de ejemplo: ${money(row.price)}. La edición se habilitará al conectar la API.`}>Editar</PreviewButton><PreviewButton onPreview={setPreview} title={`Eliminar · ${row.name}`} detail="La eliminación todavía no está habilitada. El producto permanece en el listado.">Eliminar</PreviewButton></div> },
  ]
  return <><PageHeading title="Productos" description="Consulta y organiza el catálogo de productos."><PreviewButton onPreview={setPreview} title="Nuevo producto" detail="El formulario de alta y su guardado se habilitarán en la siguiente etapa.">+ Nuevo producto</PreviewButton></PageHeading>
    <div className="adminFilters"><label>Buscar producto<input type="search" placeholder="Nombre del producto…" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Categoría<select aria-label="Categoría" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas las categorías</option>{categories.data?.map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label></div>
    {categories.error && <p role="alert">{categories.error} <button className="adminButton" onClick={categories.retry}>Reintentar categorías</button></p>}
    <DataState state={state}>{data => <AdminTable caption="Productos" columns={columns} rows={data.filter(p => p.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')) && (!category || p.category === category))} />}</DataState>
    <AdminPreviewDialog preview={preview} onClose={() => setPreview(null)} /></>
}
