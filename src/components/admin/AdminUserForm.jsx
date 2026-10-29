import { useState } from 'react'
import { passwordError, userRoles } from '../../services/admin/permissions.js'

export default function AdminUserForm({ user, onSave, onClose }) {
  const [values, setValues] = useState(user ? { nombre: user.nombre, email: user.email } : { nombre: '', email: '', rol: 'LECTOR', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const change = (name, value) => setValues(v => ({ ...v, [name]: value }))
  async function submit(event) {
    event.preventDefault()
    const invalid = !values.nombre.trim() ? 'Indica el nombre.' : !user ? passwordError(values.password, values.confirmPassword) : ''
    if (invalid) return setError(invalid)
    if (!user && values.rol === 'ADMIN' && !window.confirm('¿Crear una cuenta con acceso completo de administrador?')) return
    setError(''); setBusy(true)
    try { await onSave({ ...values, nombre: values.nombre.trim(), email: values.email.trim() }) }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  return <section className="adminPanel adminProductEditor" aria-labelledby="user-form-title">
    <h2 id="user-form-title">{user ? `Editar usuario · ${user.nombre}` : 'Crear usuario'}</h2>
    <form onSubmit={submit}><fieldset disabled={busy} className="adminProductFieldset"><div className="adminFormGrid">
      <label>Nombre *<input autoFocus required maxLength={100} autoComplete="off" value={values.nombre} onChange={e => change('nombre', e.target.value)} /></label>
      <label>Correo *<input type="email" required maxLength={150} autoComplete="off" value={values.email} onChange={e => change('email', e.target.value)} /></label>
      {!user && <><label>Rol *<select value={values.rol} onChange={e => change('rol', e.target.value)}>{userRoles.map(rol => <option key={rol}>{rol}</option>)}</select></label><PasswordFields values={values} change={change} /></>}
    </div>
    {!user && <p className="adminMuted">Mínimo 14 caracteres, máximo 72 bytes UTF-8; combina letras con números, símbolos o espacios. La cuenta se crea activa. Entrega la contraseña por un canal privado.</p>}
    {error && <p role="alert" className="adminError">{error}</p>}
    <div className="adminActions adminProductChecks"><button className="adminButton adminPrimary">{busy ? 'Guardando…' : 'Guardar usuario'}</button><button type="button" className="adminButton" onClick={onClose}>Cancelar</button></div>
    </fieldset></form>
  </section>
}
function PasswordFields({ values, change }) {
  return <><label>Nueva contraseña *<input type="password" autoComplete="new-password" required maxLength={72} value={values.password} onChange={e => change('password', e.target.value)} /></label>
    <label>Confirmar contraseña *<input type="password" autoComplete="new-password" required maxLength={72} value={values.confirmPassword} onChange={e => change('confirmPassword', e.target.value)} /></label></>
}
export function UserSecurityForm({ user, mode, onSave, onClose }) {
  const [rol, setRol] = useState(user.rol)
  const [values, setValues] = useState({ currentPassword: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    if (mode === 'password') {
      const invalid = passwordError(values.password, values.confirmPassword)
      if (invalid) return setError(invalid)
    }
    if (!window.confirm(mode === 'rol' ? `¿Cambiar el rol de ${user.email} a ${rol}? Se invalidarán sus sesiones.` : `¿Restablecer la contraseña de ${user.email}? Se invalidarán sus sesiones.`)) return
    setBusy(true); setError('')
    try { await onSave(mode === 'rol' ? rol : values) }
    catch (e) { setError(e.message) }
    finally { setBusy(false); setValues({ currentPassword: '', password: '', confirmPassword: '' }) }
  }
  return <section className="adminPanel adminProductEditor" aria-labelledby="user-security-title">
    <h2 id="user-security-title">{mode === 'rol' ? 'Cambiar rol' : 'Restablecer contraseña'} · {user.email}</h2>
    <form onSubmit={submit}><fieldset disabled={busy} className="adminProductFieldset">
      <div className="adminFormGrid">{mode === 'rol' ? <label>Rol<select value={rol} onChange={e => setRol(e.target.value)}>{userRoles.map(role => <option key={role}>{role}</option>)}</select></label> : <>
        <label>Tu contraseña de administrador *<input autoComplete="current-password" type="password" required maxLength={72} value={values.currentPassword} onChange={e => setValues(v => ({ ...v, currentPassword: e.target.value }))} /></label>
        <PasswordFields values={values} change={(name, value) => setValues(v => ({ ...v, [name]: value }))} /></>}
      </div>
      {mode === 'password' && <p className="adminMuted">Solo para otra cuenta. La nueva contraseña requiere mínimo 14 caracteres y máximo 72 bytes UTF-8, con letras y algún número, símbolo o espacio.</p>}
      {error && <p role="alert" className="adminError">{error}</p>}
      <div className="adminActions adminProductChecks"><button className="adminButton adminPrimary">{busy ? 'Aplicando…' : 'Confirmar cambio'}</button><button type="button" className="adminButton" onClick={onClose}>Cancelar</button></div>
    </fieldset></form>
  </section>
}
