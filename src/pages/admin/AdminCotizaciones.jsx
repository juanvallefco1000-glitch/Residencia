import { useState } from 'react'
import useAdminData from '../../hooks/admin/useAdminData'
import { adminService } from '../../services/admin/adminService'
import { PageHeading, DataState } from '../../components/admin/AdminUI'
import QuoteTable from '../../components/admin/QuoteTable'
import AdminPreviewDialog from '../../components/admin/AdminPreviewDialog'
export default function AdminCotizaciones() {
  const state = useAdminData(adminService.getQuotes)
  const [preview, setPreview] = useState(null)
  return <><PageHeading title="Cotizaciones" description="Consulta las solicitudes y su estado de seguimiento." /><DataState state={state}>{data => <QuoteTable quotes={data} onView={setPreview} />}</DataState><AdminPreviewDialog preview={preview} onClose={() => setPreview(null)} /></>
}
