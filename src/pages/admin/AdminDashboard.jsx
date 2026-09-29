import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Wrench, BadgePercent, FileText } from 'lucide-react'
import useAdminData from '../../hooks/admin/useAdminData'
import { adminService } from '../../services/admin/adminService'
import { PageHeading, DataState } from '../../components/admin/AdminUI'
import StatCard from '../../components/admin/StatCard'
import QuoteTable from '../../components/admin/QuoteTable'
import AdminPreviewDialog from '../../components/admin/AdminPreviewDialog'
export default function AdminDashboard() {
  const state = useAdminData(adminService.getDashboard)
  const [preview, setPreview] = useState(null)
  return <><PageHeading title="Dashboard" description="Un vistazo a la actividad de SegurIXT." />
    <DataState state={state}>{data => <><div className="adminStats">
      <StatCard title="Productos" value={data.products} icon={Package} to="/admin/productos" />
      <StatCard title="Servicios" value={data.services} icon={Wrench} to="/admin/servicios" />
      <StatCard title="Promociones" value={data.promotions} icon={BadgePercent} to="/admin/promociones" />
      <StatCard title="Cotizaciones" value={data.quotes} icon={FileText} to="/admin/cotizaciones" />
    </div><section className="adminPanel"><div className="adminPanelHeading"><div><h2>Cotizaciones recientes</h2><p>Últimas solicitudes de ejemplo</p></div><Link className="adminButton" to="/admin/cotizaciones">Ver todas</Link></div><QuoteTable quotes={data.recentQuotes} compact onView={setPreview} /></section></>}</DataState>
    <AdminPreviewDialog preview={preview} onClose={() => setPreview(null)} /></>
}
