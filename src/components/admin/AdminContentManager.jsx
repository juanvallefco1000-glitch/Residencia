import { useState, useSyncExternalStore } from 'react'
import { getSession, subscribe } from '../../services/admin/authService.js'
import { canWriteModule } from '../../services/admin/permissions.js'
import { announceContentChange } from '../../services/admin/contentAdminService.js'
import useAdminData from '../../hooks/admin/useAdminData'
import { PageHeading, DataState, AdminTable } from './AdminUI'

export default function AdminContentManager({ title, module, service, fields, initial, categories = [], categoryError = '', retryCategories }) {
  const session = useSyncExternalStore(subscribe, getSession)
  const role = session?.usuario.rol
  const canWrite = canWriteModule(role, module)
  const canStatus = module === 'promociones' ? canWrite : role === 'ADMIN'
  const state = useAdminData(service.list)
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  function open(row) {
    setEditor(row ? { ...initial, ...row } : { ...initial })
    setError(''); setNotice('')
  }
  async function submit(event) {
    event.preventDefault()
    const value = { ...editor }
    for (const field of fields) {
      if (field.type === 'number' || field.type === 'category') value[field.key] = Number(value[field.key])
      else if (field.type === 'date') value[field.key] = value[field.key] || null
      else value[field.key] = (value[field.key] || '').trim()
    }
    if (value.fechaInicio && value.fechaFin && value.fechaFin < value.fechaInicio) return setError('La fecha final debe ser igual o posterior al inicio.')
    setBusy(true); setError(''); setNotice('')
    try {
      if (editor.id) await service.update(editor.id, value)
      else await service.create(value)
      announceContentChange(); setEditor(null); state.retry(); setNotice('Cambios guardados correctamente.')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  const columns = [
    { key: fields[0].key, label: fields[0].label },
    ...(module === 'servicios' ? [{ key: 'categoria', label: 'Categoría' }, { key: 'orden', label: 'Orden' }] : []),
    ...(module === 'categorias' ? [{ key: 'slug', label: 'Slug' }, { key: 'orden', label: 'Orden' }] : []),
    ...(module === 'promociones' ? [{ key: 'fechaInicio', label: 'Inicio', render: r => r.fechaInicio || 'Sin límite' }, { key: 'fechaFin', label: 'Finalización', render: r => r.fechaFin || 'Sin límite' }] : []),
    { key: 'activo', label: 'Estado', render: row => row.activo ? 'Activo' : 'Inactivo' },
    { key: 'actions', label: 'Acciones', render: row => canWrite && <button className="adminButton" onClick={() => open(row)}>Editar</button> },
  ]
  return <>
    <PageHeading title={title} description={module === 'categorias' ? 'Categorías de productos. Desactivar una categoría oculta sus productos del catálogo público.' : module === 'servicios' ? 'Administra servicios dentro de las cuatro categorías principales.' : 'Las promociones activas se publican durante su vigencia; las fechas vacías no limitan la publicación.'}>
      {canWrite && <button className="adminButton adminPrimary" disabled={busy} onClick={() => open(null)}>Agregar</button>}
    </PageHeading>
    {notice && <p role="status">{notice}</p>}
    {editor && <section className="adminPanel adminProductEditor" aria-labelledby="content-editor-title">
      <h2 id="content-editor-title">{editor.id ? 'Editar' : 'Agregar'} · {title}</h2>
      {categoryError && <p role="alert">{categoryError} <button type="button" onClick={retryCategories}>Reintentar categorías</button></p>}
      <form onSubmit={submit}><fieldset disabled={busy} className="adminProductFieldset">
        <div className="adminFormGrid">{fields.map(field => {
          const props = { id: `content-${field.key}`, value: editor[field.key] ?? '', required: field.required, maxLength: field.maxLength, onChange: e => setEditor(current => ({ ...current, [field.key]: e.target.value })) }
          return <label key={field.key} htmlFor={props.id}>{field.label}{field.required ? ' *' : ''}
            {field.type === 'textarea' ? <textarea {...props} rows={4} />
              : field.type === 'category' ? <select {...props}><option value="">Selecciona una categoría</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
                : <input {...props} type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} max={field.type === 'number' ? 2147483647 : undefined} step={field.type === 'number' ? 1 : undefined} pattern={field.key === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined} />}
          </label>
        })}</div>
        <div className="adminProductChecks">
          {canStatus && <label><input type="checkbox" checked={editor.activo} onChange={e => setEditor(current => ({ ...current, activo: e.target.checked }))} />Activo</label>}
          {module === 'servicios' && <label><input type="checkbox" checked={editor.destacado} onChange={e => setEditor(current => ({ ...current, destacado: e.target.checked }))} />Destacado</label>}
        </div>
        {error && <p role="alert" className="adminError">{error}</p>}
        <div className="adminActions"><button disabled={busy || (module === 'servicios' && !categories.length)} className="adminButton adminPrimary">{busy ? 'Guardando…' : 'Guardar'}</button><button type="button" className="adminButton" onClick={() => setEditor(null)}>Cancelar</button></div>
      </fieldset></form>
    </section>}
    <DataState state={state}>{rows => <AdminTable caption={title} rows={rows} columns={columns} />}</DataState>
  </>
}
