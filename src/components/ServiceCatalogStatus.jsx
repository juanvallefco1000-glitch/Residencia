export default function ServiceCatalogStatus({ loading, error }) {
  if (!loading && !error) return null
  return <p role="status">{loading ? 'Actualizando servicios…' : error}</p>
}
