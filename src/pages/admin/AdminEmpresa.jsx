import { useState } from 'react'
import useAdminData from '../../hooks/admin/useAdminData'
import { adminService } from '../../services/admin/adminService'
import { PageHeading, DataState } from '../../components/admin/AdminUI'
const fields = [
  ['name', 'Nombre de empresa', 'text'], ['phone', 'Teléfono', 'tel'], ['whatsapp', 'WhatsApp', 'tel'],
  ['email', 'Correo', 'email'], ['location', 'Ubicación', 'text'], ['schedule', 'Horario', 'text'],
  ['facebook', 'Facebook', 'url'], ['instagram', 'Instagram', 'url'],
]
function CompanyForm({ initial }) {
  const [values, setValues] = useState(initial)
  const [message, setMessage] = useState('')
  const update = event => { setValues(previous => ({ ...previous, [event.target.name]: event.target.value })); setMessage('') }
  return <form className="adminPanel adminCompanyForm" onSubmit={event => { event.preventDefault(); setMessage('Formulario validado. El guardado estará disponible al conectar la API; el sitio público permanece sin cambios.') }}>
    <div className="adminFormGrid">{fields.map(([key, label, type]) => <label key={key} htmlFor={`company-${key}`}>{label}<input id={`company-${key}`} name={key} type={type} value={values[key]} onChange={update} placeholder={initial[key] ? undefined : 'Sin definir'} required={key === 'name'} /></label>)}
    <label className="adminFullWidth" htmlFor="company-description">Descripción<textarea id="company-description" name="description" value={values.description} onChange={update} rows={5} /></label></div>
    <p className="adminMuted">Los campos sin información se dejan vacíos. Esta vista no publica cambios.</p><button className="adminButton adminPrimary" type="submit">Guardar cambios (demo)</button>{message && <p role="status" className="adminNotice">{message}</p>}
  </form>
}
export default function AdminEmpresa() {
  const state = useAdminData(adminService.getCompany)
  return <><PageHeading title="Información de empresa" description="Datos actuales de SegurIXT y canales de contacto." /><DataState state={state}>{data => <CompanyForm initial={data} />}</DataState></>
}
