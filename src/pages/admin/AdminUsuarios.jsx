import { useEffect, useState, useSyncExternalStore } from 'react'
import { userAdminService } from '../../services/admin/userAdminService.js'
import { getSession, subscribe, validateSession } from '../../services/admin/authService.js'
import { userRoles } from '../../services/admin/permissions.js'
import { PageHeading, DataState, AdminTable } from '../../components/admin/AdminUI'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminUserForm, { UserSecurityForm } from '../../components/admin/AdminUserForm'

export default function AdminUsuarios() {
  const session = useSyncExternalStore(subscribe, getSession)
  const [filters, setFilters] = useState({ q: '', rol: '', activo: '', page: 0, size: 12 })
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const reload = () => setRevision(v => v + 1)
  useEffect(() => {
    if (session?.usuario.rol !== 'ADMIN') return
    const controller = new AbortController()
    setState({ loading: true, error: '', data: null })
    const timer = setTimeout(() => userAdminService.list(filters, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: '' })
    }).catch(e => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: e.message }) }), filters.q ? 250 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [filters, revision, session?.usuario.rol])
  if (session?.usuario.rol !== 'ADMIN') return <p role="alert">Se requiere ADMIN para administrar usuarios.</p>
  const change = (key, value) => setFilters(v => ({ ...v, [key]: value, page: 0 }))
  async function open(user, mode) {
    setBusy(true); setError('')
    try { setEditor({ user: await userAdminService.detail(user.id), mode }) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function securityChanged(user) {
    if (user.id === session.usuario.id) await validateSession()
  }
  async function status(user) {
    if (!window.confirm(`¿${user.activo ? 'Desactivar' : 'Activar'} la cuenta ${user.email}? Se invalidarán sus sesiones anteriores.`)) return
    setBusy(true); setError(''); setNotice('')
    try { await userAdminService.status(user.id, !user.activo); await securityChanged(user); setEditor(null); setNotice('Estado actualizado; las sesiones anteriores quedaron invalidadas.'); reload() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function save(values) {
    const { user, mode } = editor
    if (mode === 'rol') { await userAdminService.role(user.id, values); await securityChanged(user) }
    else if (mode === 'password') await userAdminService.resetPassword(user.id, values)
    else if (user) await userAdminService.update(user.id, values)
    else await userAdminService.create(values)
    setEditor(null); reload(); setNotice(mode === 'rol' || mode === 'password' ? 'Cambio aplicado; sesiones anteriores invalidadas.' : 'Usuario guardado.')
  }
  const columns = [
    { key: 'nombre', label: 'Nombre' }, { key: 'email', label: 'Correo' }, { key: 'rol', label: 'Rol' },
    { key: 'activo', label: 'Estado', render: u => <StatusBadge status={u.activo ? 'Activo' : 'Inactivo'} /> },
    { key: 'acciones', label: 'Acciones', render: u => <div className="adminActions">
      <button className="adminButton adminButtonSmall" disabled={busy} onClick={() => open(u, 'perfil')}>Editar</button>
      <button className="adminButton adminButtonSmall" disabled={busy} onClick={() => open(u, 'rol')}>Cambiar rol</button>
      <button className="adminButton adminButtonSmall" disabled={busy} onClick={() => status(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
      {u.id !== session.usuario.id && <button className="adminButton adminButtonSmall" disabled={busy} onClick={() => open(u, 'password')}>Restablecer contraseña</button>}
    </div> },
  ]
  return <>
    <PageHeading title="Usuarios" description="Administra cuentas, roles y acceso al panel."><button className="adminButton adminPrimary" disabled={busy} onClick={() => { setEditor({ user: null, mode: 'crear' }); setError(''); setNotice('') }}>+ Crear usuario</button></PageHeading>
    <p className="adminMuted">ADMIN: acceso completo. EDITOR: edición de contenido y gestión de cotizaciones, sin usuarios ni baja de productos. LECTOR: solo consulta. Siempre debe existir un ADMIN activo.</p>
    {notice && <p role="status" className="adminNotice">{notice}</p>}{error && <p role="alert" className="adminError">{error}</p>}{busy && <p role="status">Cargando usuario…</p>}
    {editor && (editor.mode === 'rol' || editor.mode === 'password' ? <UserSecurityForm key={`${editor.user.id}-${editor.mode}`} user={editor.user} mode={editor.mode} onSave={save} onClose={() => setEditor(null)} /> : <AdminUserForm key={editor.user?.id || 'crear'} user={editor.user} onSave={save} onClose={() => setEditor(null)} />)}
    <div className="adminFilters"><label>Buscar por nombre o correo<input type="search" maxLength={150} value={filters.q} onChange={e => change('q', e.target.value)} /></label>
      <label>Rol<select value={filters.rol} onChange={e => change('rol', e.target.value)}><option value="">Todos</option>{userRoles.map(rol => <option key={rol}>{rol}</option>)}</select></label>
      <label>Estado<select value={filters.activo} onChange={e => change('activo', e.target.value)}><option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></select></label>
    </div>
    <DataState state={{ ...state, retry: reload }}>{data => <><AdminTable caption="Usuarios" columns={columns} rows={data.content} /><nav className="adminProductPagination" aria-label="Paginación de usuarios">
      <button className="adminButton" disabled={!filters.page} onClick={() => setFilters(v => ({ ...v, page: v.page - 1 }))}>Anterior</button>
      <span>{data.totalElements} usuarios · Página {data.page + 1} de {Math.max(1, data.totalPages)}</span>
      <button className="adminButton" disabled={data.page + 1 >= data.totalPages} onClick={() => setFilters(v => ({ ...v, page: v.page + 1 }))}>Siguiente</button>
    </nav></>}</DataState>
  </>
}
