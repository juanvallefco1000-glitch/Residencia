import { useState } from 'react'
import ProductImage from '../ProductImage'
import { imagePayload, productAdminService, announceProductChange } from '../../services/admin/productAdminService.js'

const empty = { nombre: '', slug: '', categoriaId: '', marca: '', modelo: '', descripcionCorta: '', descripcion: '', precio: '', mostrarPrecio: false, destacado: false, activo: true }
export const productSlug = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 200).replace(/^-|-$/g, '')

export default function AdminProductForm({ product, categories, onSave, onClose, onImagesChanged, canManageStatus = true }) {
  const [values, setValues] = useState(product ? { ...product, categoriaId: String(product.categoria.id), precio: product.precio ?? '' } : empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const change = (key, value) => setValues(current => ({ ...current, [key]: value, ...(key === 'nombre' && !product && (!current.slug || current.slug === productSlug(current.nombre)) ? { slug: productSlug(value) } : {}) }))
  async function submit(event) {
    event.preventDefault()
    if (!values.nombre.trim()) return setError('Indica el nombre del producto.')
    if (values.mostrarPrecio && values.precio === '') return setError('Indica un precio para mostrarlo en el catálogo.')
    if (values.precio !== '' && (!Number.isFinite(Number(values.precio)) || Number(values.precio) < 0 || Number(values.precio) > 9999999999.99 || !/^\d+(\.\d{1,2})?$/.test(String(values.precio)))) return setError('El precio debe ser positivo o cero y tener como máximo dos decimales.')
    setBusy(true); setError('')
    try {
      const { nombre, slug, marca, modelo, descripcionCorta, descripcion, mostrarPrecio, destacado, activo } = values
      await onSave({ nombre: nombre.trim(), slug, marca, modelo, descripcionCorta, descripcion, mostrarPrecio, destacado, activo, categoriaId: Number(values.categoriaId), precio: values.precio === '' ? null : Number(values.precio) })
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <section className="adminPanel adminProductEditor" aria-labelledby="product-editor-title">
    <h2 id="product-editor-title">{product ? `Editar · ${product.nombre}` : 'Agregar producto'}</h2>
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="adminProductFieldset">
        <div className="adminFormGrid">
          <label>Nombre *<input autoFocus required maxLength={200} value={values.nombre} onChange={e => change('nombre', e.target.value)} /></label>
          <label>Slug *<input required maxLength={200} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Letras minúsculas, números y guiones entre palabras" value={values.slug} onChange={e => change('slug', e.target.value)} /></label>
          <label>Categoría *<select required value={values.categoriaId} onChange={e => change('categoriaId', e.target.value)}><option value="">Selecciona una categoría</option>{categories.map(c => <option key={c.id} value={c.id} disabled={!c.activo && String(c.id) !== String(product?.categoria.id)}>{c.nombre}{!c.activo ? ' (inactiva)' : ''}</option>)}</select></label>
          <label>Precio (MXN)<input type="number" min="0" max="9999999999.99" step="0.01" required={values.mostrarPrecio} value={values.precio} onChange={e => change('precio', e.target.value)} /></label>
          <label>Marca<input maxLength={100} value={values.marca || ''} onChange={e => change('marca', e.target.value)} /></label>
          <label>Modelo<input maxLength={100} value={values.modelo || ''} onChange={e => change('modelo', e.target.value)} /></label>
          <label className="adminFullWidth">Descripción corta<textarea rows={2} maxLength={500} value={values.descripcionCorta || ''} onChange={e => change('descripcionCorta', e.target.value)} /></label>
          <label className="adminFullWidth">Descripción<textarea rows={5} maxLength={10000} value={values.descripcion || ''} onChange={e => change('descripcion', e.target.value)} /></label>
        </div>
        <div className="adminProductChecks">{[['mostrarPrecio', 'Mostrar precio'], ['destacado', 'Destacado'], ...(canManageStatus ? [['activo', 'Activo']] : [])].map(([key, text]) => <label key={key}><input type="checkbox" checked={values[key]} onChange={e => change(key, e.target.checked)} />{text}</label>)}</div>
        {error && <p role="alert" className="adminError">{error}</p>}
        <div className="adminActions"><button className="adminButton adminPrimary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</button><button type="button" className="adminButton" onClick={onClose}>Cerrar formulario</button></div>
      </fieldset>
    </form>
    {product ? <ProductImages product={product} onChange={onImagesChanged} /> : <p className="adminMuted">Guarda el producto para asociar sus imágenes.</p>}
  </section>
}

function ProductImages({ product, onChange }) {
  const [file, setFile] = useState(null)
  const [alt, setAlt] = useState('')
  const [principal, setPrincipal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function operation(action, success) {
    setBusy(true); setError(''); setNotice('')
    try { await action(); announceProductChange(); await onChange(); setNotice(success) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  function upload(event) {
    event.preventDefault()
    operation(async () => productAdminService.addImage(product.id, await imagePayload(file, alt, principal)), 'Imagen guardada.')
  }
  return <section className="adminProductImages" aria-labelledby="product-images-title">
    <h3 id="product-images-title">Imágenes del producto</h3>
    <p className="adminMuted">JPEG o PNG, máximo 3 MiB, 6000 píxeles por lado y 16 megapíxeles. Hasta 10 imágenes. Las imágenes de productos o categorías inactivos no se publican.</p>
    <div className="adminImageList">{product.imagenes.map(image => <div key={image.id} className="adminImageItem">
      <ProductImage images={[image]} name={product.nombre} /><span>{image.textoAlt || 'Imagen del producto'}{image.principal && ' · Principal'}</span>
      <button type="button" disabled={busy} className="adminButton adminButtonSmall" onClick={() => {
        if (window.confirm('¿Retirar esta imagen del producto?')) operation(() => productAdminService.removeImage(product.id, image.id), 'Imagen retirada.')
      }}>Retirar</button>
    </div>)}</div>
    <form onSubmit={upload}>
      <fieldset disabled={busy || product.imagenes.length >= 10} className="adminProductFieldset">
        <div className="adminFormGrid">
          <label>Archivo *<input required type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0] || null)} /></label>
          <label>Texto alternativo<input maxLength={255} value={alt} onChange={e => setAlt(e.target.value)} /></label>
        </div>
        <div className="adminProductChecks"><label><input type="checkbox" checked={principal} onChange={e => setPrincipal(e.target.checked)} />Usar como imagen principal</label></div>
        <button className="adminButton" disabled={busy}>{busy ? 'Procesando imagen…' : 'Subir imagen'}</button>
      </fieldset>
    </form>
    {error && <p className="adminError" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section>
}

export function AdminCategoryForm({ onSave, onClose }) {
  const [values, setValues] = useState({ nombre: '', slug: '', descripcion: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  function change(key, value) {
    setValues(current => ({ ...current, [key]: value, ...(key === 'nombre' && (!current.slug || current.slug === productSlug(current.nombre).slice(0, 120).replace(/-$/, '')) ? { slug: productSlug(value).slice(0, 120).replace(/-$/, '') } : {}) }))
  }
  async function submit(event) {
    event.preventDefault()
    if (!values.nombre.trim()) return setError('Indica el nombre de la categoría.')
    setBusy(true); setError('')
    try { await onSave({ ...values, nombre: values.nombre.trim() }) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <section className="adminPanel adminProductEditor" aria-labelledby="category-editor-title">
    <h2 id="category-editor-title">Crear categoría</h2>
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="adminProductFieldset">
        <div className="adminFormGrid">
          <label>Nombre de categoría *<input autoFocus required maxLength={120} value={values.nombre} onChange={e => change('nombre', e.target.value)} /></label>
          <label>Slug de categoría *<input required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Letras minúsculas, números y guiones entre palabras" value={values.slug} onChange={e => change('slug', e.target.value)} /></label>
          <label className="adminFullWidth">Descripción de categoría<textarea rows={2} maxLength={500} value={values.descripcion} onChange={e => change('descripcion', e.target.value)} /></label>
        </div>
        {error && <p role="alert" className="adminError">{error}</p>}
        <div className="adminActions adminProductChecks"><button className="adminButton adminPrimary" disabled={busy}>{busy ? 'Guardando categoría…' : 'Guardar categoría'}</button><button type="button" className="adminButton" onClick={onClose}>Cancelar categoría</button></div>
      </fieldset>
    </form>
  </section>
}
