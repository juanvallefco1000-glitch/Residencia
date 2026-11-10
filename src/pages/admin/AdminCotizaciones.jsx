import { useState, useSyncExternalStore, useEffect } from 'react'
import useAdminData from '../../hooks/admin/useAdminData'
import { adminRequest, getSession, subscribe } from '../../services/admin/authService'
import { productAdminService } from '../../services/admin/productAdminService'
import { canWriteModule } from '../../services/admin/permissions'
import { PageHeading, DataState } from '../../components/admin/AdminUI'
import InstallationTariffForm from '../../components/admin/InstallationTariffForm'
import { quoteMoney as money } from '../../services/quoteService'

const loadInstallation = () => adminRequest('/api/admin/cotizaciones/instalacion')
const loadSettings = () => adminRequest('/api/admin/cotizaciones/configuracion')
const loadList = () => adminRequest('/api/admin/cotizaciones?page=0')
const initialProfile = { productId: '', role: 'OTHER', family: '', channels: 0 }
const roles = { CAMERA: 'Cámara', RECORDER: 'DVR/NVR', DISK: 'Disco', CABLE: 'Cable por metro', CONNECTOR: 'Conector por unidad', ACCESSORY: 'Accesorio', KIT: 'Kit (revisión manual)', OTHER: 'Sin clasificar' }
export default function AdminCotizaciones() {
  const [page, setPage] = useState(0)
  const [requests, setRequests] = useState(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [profile, setProfile] = useState(initialProfile)
  const [productSearch, setProductSearch] = useState('')
  const [productOptions, setProductOptions] = useState([])
  const [productError, setProductError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      productAdminService.list({ q: productSearch, page: 0, size: 20 }, { signal: controller.signal }).then(result => {
        setProductOptions(result.content); setProductError('')
      }).catch(e => { if (e.name !== 'AbortError') setProductError(e.message) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [productSearch])
  const installationState = useAdminData(loadInstallation)
  const state = useAdminData(loadSettings)
  const list = useAdminData(loadList)
  async function navigate(next) {
    setBusy(true); setError('')
    try { setRequests(await adminRequest(`/api/admin/cotizaciones?page=${next}`)); setPage(next) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function view(id) {
    setError(''); setBusy(true)
    try { setDetail(await adminRequest(`/api/admin/cotizaciones/${id}`)) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function saveSettings(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    const data = new FormData(event.currentTarget)
    const body = Object.fromEntries(['labourPerCamera','highDifficultyMultiplier','exteriorMultiplier','taxRate'].map(k => [k, data.get(k) === '' ? null : Number(data.get(k))]))
    body.taxEnabled = data.get('taxEnabled') === 'on'
    try { await adminRequest('/api/admin/cotizaciones/configuracion', { method: 'PUT', body: JSON.stringify(body) }); setNotice('Tarifas guardadas.'); state.retry() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function readProfile(id = profile.productId) {
    setBusy(true); setError(''); setNotice('')
    try { setProfile(await adminRequest(`/api/admin/cotizaciones/perfiles/${Number(id)}`)); setNotice('Ficha cargada. OTHER indica producto sin clasificación técnica.'); }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function saveProfile(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { await adminRequest('/api/admin/cotizaciones/perfiles', { method: 'PUT', body: JSON.stringify({ ...profile, productId: Number(profile.productId), channels: Number(profile.channels) }) }); setNotice('Ficha técnica guardada. El precio del material se edita en Productos.'); }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const session = useSyncExternalStore(subscribe, getSession)
  const writable = canWriteModule(session?.usuario?.rol, 'cotizaciones')
  const rows = requests || list.data || []
  return <><PageHeading title="Cotizaciones" description="Solicitudes reales, tarifas de instalación y compatibilidad verificada." />
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <DataState state={list}>{() => <><div className="adminTableWrap"><table><caption>Solicitudes del cotizador</caption><thead><tr><th>Cliente</th><th>Contacto</th><th>Fecha</th><th>Estado</th><th>Total conocido</th><th>Detalle</th></tr></thead><tbody>{!rows.length && <tr><td colSpan="6">No hay solicitudes en esta página.</td></tr>}{rows.map(row => <tr key={row.id}><td>{row.nombre}</td><td>{row.telefono}<br />{row.email}</td><td>{String(row.fecha)}</td><td>{row.estado}</td><td>{money(row.total)}</td><td><button className="adminButton" disabled={busy} onClick={() => view(row.id)}>Ver conceptos</button></td></tr>)}</tbody></table></div><div className="adminPageHeading"><button className="adminButton" disabled={!page || busy} onClick={() => navigate(page - 1)}>Anterior</button><span>Página {page + 1}</span><button className="adminButton" disabled={rows.length < 50 || busy} onClick={() => navigate(page + 1)}>Siguiente</button><button className="adminButton" disabled={busy} onClick={() => navigate(page)}>Actualizar</button></div></>}</DataState>
    {detail && <section className="adminPanel adminQuotePanel"><h2>Solicitud {detail.id}</h2><p>{detail.nombre} · {detail.telefono} · {detail.email}</p><p>{detail.mensaje}</p><p>{detail.area_m2} m² · {detail.cameras} cámaras · {detail.cable_metres ?? 'Pendiente'} m lineales · {detail.environment} · {detail.difficulty}</p><ul>{detail.lines.map(l => <li key={l.id}>{l.descripcion}: {l.cantidad} {l.unidad} × {money(l.precio_unitario)} = {money(l.importe)} {l.pendiente && `· Pendiente: ${l.pendiente}`}</li>)}</ul><p>Subtotal: {money(detail.subtotal)} · Impuestos: {money(detail.tax)} · Total conocido: {money(detail.total)}</p>{detail.height_metres!=null && <p>Altura: {detail.height_metres} m · Hipótesis: {detail.layout_assumption || 'Sin hipótesis'}</p>}
      {detail.cameraRuns?.length>0 && <ul>{detail.cameraRuns.map(run=><li key={run.camera_number}>Cámara {run.camera_number}: {run.distance_metres??'pendiente'} m; incluidos {run.included_metres} m; adicionales {run.additional_metres??'pendiente'} m; {run.additional_segments??'pendiente'} tramo(s) · {money(run.amount)} {run.pending}</li>)}</ul>}
      {detail.installation_tariff_snapshot && <details><summary>Configuración utilizada al guardar</summary><p>{detail.installation_tariff_snapshot}</p></details>}
      <p>{detail.warnings}</p><button className="adminButton" onClick={() => setDetail(null)}>Cerrar detalle</button></section>}
    <DataState state={installationState}>{tariffs => <InstallationTariffForm tariffs={tariffs} writable={writable} />}</DataState>
    <DataState state={state}>{settings => <section className="adminPanel adminQuotePanel"><h2>Configuración fiscal y tarifas anteriores</h2><p>Las tarifas anteriores se conservan para solicitudes antiguas. Las nuevas instalaciones utilizan los rangos de altura del apartado Tarifas de instalación. El factor exterior/mixto y los impuestos también se aplican al nuevo cálculo.</p><form onSubmit={saveSettings}><fieldset disabled={!writable || busy}><div className="formGrid">{[
      ['labourPerCamera','Instalación por cámara (MXN)', '0.01', '1000000'],
      ['highDifficultyMultiplier','Factor de dificultad alta (mínimo 1)', '0.0001', '100'],
      ['exteriorMultiplier','Factor exterior/mixto (mínimo 1)', '0.0001', '100'],
      ['taxRate','Tasa fiscal (0.16 equivale a 16%)', '0.000001', '1'],
    ].map(([key,label,step,max]) => <label key={key}>{label}<input name={key} type="number" min={key.includes('Multiplier') ? '1' : '0'} max={max} step={step} defaultValue={settings[key] ?? ''} /></label>)}</div><label className="adminQuoteCheckbox"><input name="taxEnabled" type="checkbox" defaultChecked={settings.taxEnabled} /> Aplicar impuesto configurado sobre conceptos conocidos</label><button className="adminButton adminPrimary">Guardar tarifas</button></fieldset></form></section>}</DataState>
    {writable && <section className="adminPanel adminQuotePanel"><h2>Ficha técnica del producto</h2><p>Busca un producto real o usa su ID del módulo Productos. La familia debe identificar un conjunto cuya compatibilidad completa haya sido verificada: protocolo, resolución, entradas, alimentación y almacenamiento. El cable debe tener precio por metro lineal y los conectores por unidad. Los kits siempre requieren revisión manual.</p><label>Buscar producto para clasificar<input type="search" maxLength={200} value={productSearch} onChange={e => setProductSearch(e.target.value)} /></label>{productError && <p role="alert">{productError}</p>}<label>Productos (primeros 20 resultados)<select disabled={busy} value={productOptions.some(p => String(p.id) === String(profile.productId)) ? profile.productId : ''} onChange={e => { if (e.target.value) { setProfile({ ...initialProfile, productId: e.target.value }); readProfile(e.target.value) } }}><option value="">Selecciona para cargar su ficha</option>{productOptions.map(p => <option key={p.id} value={p.id}>#{p.id} · {p.nombre}</option>)}</select></label><form onSubmit={saveProfile}><fieldset disabled={busy}><div className="formGrid"><label>ID del producto<input required type="number" min="1" value={profile.productId} onChange={e => setProfile({ ...profile, productId: e.target.value })} /></label><label>Tipo<select value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })}>{Object.entries(roles).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Familia compatible verificada<input maxLength={80} value={profile.family} onChange={e => setProfile({ ...profile, family: e.target.value })} /></label><label>Canales del grabador<input required type="number" min="0" max="256" value={profile.channels} onChange={e => setProfile({ ...profile, channels: e.target.value })} /></label></div><button type="button" className="adminButton" disabled={!profile.productId} onClick={() => readProfile()}>Cargar ficha actual</button><button className="adminButton adminPrimary">Guardar ficha técnica</button></fieldset></form></section>}
  </>
}
