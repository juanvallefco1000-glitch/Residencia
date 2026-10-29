export default function ProductPrice({ price }) {
  if (price == null) return <span>Solicitar cotización</span>
  const amount = Number(price)
  if (!Number.isFinite(amount) || amount < 0) return <span>Solicitar cotización</span>
  return <span>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)}</span>
}
