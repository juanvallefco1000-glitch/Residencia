import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { canWriteModule, canDeleteProduct } from '../../services/admin/permissions.js'
import useAdminData from '../../hooks/admin/useAdminData'
import { productAdminService, announceProductChange } from '../../services/admin/productAdminService.js'
import { getSession, subscribe } from '../../services/admin/authService.js'
import { PageHeading, DataState, AdminTable } from '../../components/admin/AdminUI'
import StatusBadge from '../../components/admin/StatusBadge'
import ProductImage from '../../components/ProductImage'
import AdminProductForm, { AdminCategoryForm } from '../../components/admin/AdminProductForm'

const money = value => value == null ? 'Sin precio' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
export default function AdminProductos() {
  const session = useSyncExternalStore(subscribe, getSession)
  const canWrite = canWriteModule(session?.usuario.rol, 'productos')
  const canDelete = canDeleteProduct(session?.usuario.rol)
  const categories = useAdminData(productAdminService.categories)
  const [filters, setFilters] = useState({ q: '', categoriaId: '', activo: '', page: 0, size: 12 })
  const [state, setState] = useState({ data: null, loading: true, error: '', status: null })
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null)
  const [categoryEditor, setCategoryEditor] = useState(false)
  const hasActiveCategories = categories.data?.some(c => c.activo) === true
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const retry = useCallback(() => setRevision(v => v + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setState({ data: null, loading: true, error: '', status: null })
    const timer = setTimeout(() => {
      productAdminService.list(filters, { signal: controller.signal }).then(data => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: '', status: null })
      }).catch(e => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: e.message, status: e.status ?? null }) })
    }, filters.q ? 250 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [filters, revision])
  const change = (key, value) => setFilters(current => ({ ...current, [key]: value, page: 0 }))
  async function edit(id) {
    setBusy(true); setError(''); setNotice('')
    try { setEditor({ product: await productAdminService.detail(id) }) } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  async function save(payload) {
    const saved = editor.product ? await productAdminService.update(editor.product.id, payload) : await productAdminService.create(payload)
    setEditor({ product: saved }); setNotice('Producto guardado. El catálogo público ya puede consultar los cambios.')
    announceProductChange(); retry()
  }
  async function remove(product) {
    if (!window.confirm(`¿Dar de baja “${product.nombre}”? Se ocultará del catálogo; sus imágenes y referencias se conservarán.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      await productAdminService.remove(product.id)
      if (editor?.product?.id === product.id) setEditor(null)
      setNotice('Producto dado de baja. Puedes reactivarlo desde Editar.')
      announceProductChange(); retry()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const columns = [
    { key: 'imagen', label: 'Imagen', render: p => <div className="adminThumbnail"><ProductImage images={p.imagenes} name={p.nombre} /></div> },
    { key: 'nombre', label: 'Producto' }, { key: 'categoria', label: 'Categoría', render: p => <>{p.categoria.nombre}{!p.categoria.activo && ' (inactiva)'}</> },
    { key: 'precio', label: 'Precio', render: p => <>{money(p.precio)}{!p.mostrarPrecio && <small className="adminMuted"> · Oculto</small>}</> },
    { key: 'activo', label: 'Estado', render: p => <StatusBadge status={p.activo ? 'Activo' : 'Inactivo'} /> },
    ...(canWrite ? [{ key: 'acciones', label: 'Acciones', render: p => <div className="adminActions"><button disabled={busy} className="adminButton adminButtonSmall" onClick={() => edit(p.id)}>Editar</button>{canDelete && <button disabled={busy || !p.activo} className="adminButton adminButtonSmall" onClick={() => remove(p)}>Dar de baja</button>}</div> }] : []),
  ]
  return <>
    <PageHeading title="Productos" description="Administra el catálogo conectado a la base de datos.">{canWrite && <div className="adminActions"><button className="adminButton" disabled={busy || categories.loading || !!categories.error} onClick={() => setCategoryEditor(true)}>Crear categoría</button><button className="adminButton adminPrimary" disabled={busy || categories.loading || !!categories.error || !hasActiveCategories} onClick={() => { setEditor({ product: null }); setNotice(''); setError('') }}>+ Agregar producto</button></div>}</PageHeading>
    {notice && <p role="status" className="adminNotice">{notice}</p>}{error && <p role="alert" className="adminError">{error}</p>}{busy && <p role="status">Procesando…</p>}
    {!categories.loading && !categories.error && !hasActiveCategories && <p className="adminNotice" role="status">No hay categorías activas en la base de datos. {canWrite ? 'Crea una categoría para poder agregar productos.' : 'Un administrador debe crear o activar una categoría antes de registrar productos.'}</p>}
    {categoryEditor && canWrite && <AdminCategoryForm onClose={() => setCategoryEditor(false)} onSave={async values => {
      await productAdminService.createCategory(values)
      setCategoryEditor(false); categories.retry(); announceProductChange()
      setNotice('Categoría creada. Ya puedes agregar productos.')
    }} />}
    {editor && canWrite && <AdminProductForm key={editor.product?.id || 'new'} product={editor.product} canManageStatus={canDelete} categories={categories.data || []} onSave={save} onClose={() => setEditor(null)} onImagesChanged={async () => { setEditor({ product: await productAdminService.detail(editor.product.id) }); retry() }} />}
    <div className="adminFilters">
      <label>Buscar por nombre<input type="search" maxLength={200} placeholder="Nombre del producto…" value={filters.q} onChange={e => change('q', e.target.value)} /></label>
      <label>Categoría<select value={filters.categoriaId} onChange={e => change('categoriaId', e.target.value)}><option value="">Todas las categorías</option>{categories.data?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <label>Estado<select value={filters.activo} onChange={e => change('activo', e.target.value)}><option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label>
    </div>
    {categories.error && <p role="alert">No se pudieron cargar las categorías{categories.status ? ` (HTTP ${categories.status})` : ''}: {categories.error} <button className="adminButton" onClick={categories.retry}>Reintentar categorías</button></p>}
    <DataState state={{ ...state, error: state.error && `${state.error}${state.status ? ` (HTTP ${state.status})` : ''}`, retry }}>{data => <><AdminTable caption="Productos" columns={columns} rows={data.content} /><nav className="adminProductPagination" aria-label="Paginación de productos"><button className="adminButton" disabled={filters.page === 0} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Anterior</button><span>{data.totalElements} productos · Página {data.page + 1} de {Math.max(data.totalPages, 1)}</span><button className="adminButton" disabled={data.page + 1 >= data.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Siguiente</button></nav></>}</DataState>
  </>
}
