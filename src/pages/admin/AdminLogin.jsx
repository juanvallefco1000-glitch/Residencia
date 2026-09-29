import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import logo from '../../assets/segurixt-logo-oficial.jpeg'
import { login } from '../../services/admin/authService'
import '../../styles/admin.css'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event) {
    event.preventDefault()
    const next = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Ingresa un correo electrónico válido.'
    if (!password) next.password = 'Ingresa tu contraseña.'
    setErrors(next); setMessage('')
    if (Object.keys(next).length) return
    setPending(true)
    try { await login({ email: email.trim(), password }) }
    catch (error) { setMessage(error.message) }
    finally { setPending(false); setPassword('') }
  }
  return <main className="adminRoot adminLogin"><section className="adminLoginCard">
    <img className="adminLoginLogo" src={logo} alt="SegurIXT" /><span className="adminLoginIcon"><LockKeyhole /></span>
    <h1>Panel de Administración</h1><p className="adminMuted">Gestiona el contenido de SegurIXT desde un solo lugar.</p>
    <form onSubmit={submit} noValidate>
      <label htmlFor="admin-email">Correo electrónico</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} required />
      {errors.email && <p id="email-error" className="adminError" role="alert">{errors.email}</p>}
      <label htmlFor="admin-password">Contraseña</label><div className="adminPassword"><input id="admin-password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} required /><button type="button" className="adminIconButton" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}>{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
      {errors.password && <p id="password-error" className="adminError" role="alert">{errors.password}</p>}
      <button className="adminButton adminPrimary" disabled={pending}>{pending ? 'Validando…' : 'Iniciar sesión'}</button>
      {message && <p className="adminNotice" role="status">{message}</p>}
    </form>
    <p className="adminMuted">Acceso todavía no habilitado. No ingreses credenciales reales.</p><Link className="adminButton" to="/admin">Explorar demostración</Link><Link className="adminBackLink" to="/">Volver al sitio</Link>
  </section></main>
}
