// Los precios en esta selección son informativos. El backend recalcula la solicitud.
export const validQuantity = value => /^\d+$/.test(String(value)) && Number(value) >= 1 && Number(value) <= 1000
export function addQuoteItem(items, product, quantity = 1) {
  if (!validQuantity(quantity)) return items
  const existing = items.find(item => item.productId === product.id)
  if (existing) {
    const combined = Number(existing.quantity || 0) + Number(quantity)
    if (!validQuantity(combined)) return items
    return updateQuoteQuantity(items, product.id, combined)
  }
  return [...items, { productId: product.id, name: product.name, images: product.images || [], unitPrice: product.price, quantity: Number(quantity) }]
}
export function updateQuoteQuantity(items, id, quantity) {
  if (quantity !== '' && !validQuantity(quantity)) return items
  return items.map(item => item.productId === id ? { ...item, quantity: quantity === '' ? '' : Number(quantity) } : item)
}
export const removeQuoteItem = (items, id) => items.filter(item => item.productId !== id)
export const canAdvanceQuote = items => items.length > 0 && items.every(item => validQuantity(item.quantity))
export function quoteItemSubtotal(item) {
  if (item.unitPrice == null || !validQuantity(item.quantity)) return null
  const price = String(item.unitPrice)
  if (!/^\d+(?:\.\d{1,2})?$/.test(price)) return null
  const [whole, fraction = ''] = price.split('.')
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  const total = cents * BigInt(item.quantity)
  return `${total / 100n}.${String(total % 100n).padStart(2, '0')}`
}

export function quoteSelectionSubtotal(items) {
  let cents = 0n
  let pending = 0
  for (const item of items) {
    const subtotal = quoteItemSubtotal(item)
    if (subtotal == null) { pending++; continue }
    cents += BigInt(subtotal.replace('.', ''))
  }
  return { known: `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`, pending }
}

// Solo desglose y sumas visuales: las tarifas, impuestos y sugerencias vienen del backend.
function amountCents(value) {
  if (value == null || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) return null
  const [whole, decimal = ''] = String(value).split('.')
  return BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'))
}
const centsAmount = cents => `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
const sumAmounts = lines => centsAmount(lines.reduce((sum, line) => sum + (amountCents(line.amount) ?? 0n), 0n))

export function deriveQuoteBudget(items, estimate = null) {
  const selectedIds = new Set(items.map(item => item.productId))
  const serverLines = Array.isArray(estimate?.lines) ? estimate.lines : []
  const equipment = items.map(item => {
    const confirmed = serverLines.find(line => line.productId === item.productId)
    if (confirmed) return { ...confirmed, amount: amountCents(confirmed.amount) == null ? null : confirmed.amount }
    const amount = quoteItemSubtotal(item)
    return { productId: item.productId, description: item.name, quantity: item.quantity, unit: 'unidad',
      unitPrice: item.unitPrice, amount, pending: amount == null ? (validQuantity(item.quantity) ? 'Precio pendiente de confirmación' : 'Indica una cantidad válida') : null }
  })
  const installation = serverLines.filter(line => !selectedIds.has(line.productId))
  const equipmentSubtotal = sumAmounts(equipment)
  const hasKnownInstallation = installation.some(line => amountCents(line.amount) != null)
  const installationSubtotal = estimate && (hasKnownInstallation || !installation.some(line => line.pending || amountCents(line.amount) == null)) ? sumAmounts(installation) : null
  const tax = amountCents(estimate?.tax) == null ? null : estimate.tax
  const total = estimate && amountCents(estimate.knownTotal) != null ? estimate.knownTotal : equipmentSubtotal
  const pendingEquipment = equipment.filter(line => line.pending || amountCents(line.amount) == null).length
  const pendingInstallation = installation.filter(line => line.pending || amountCents(line.amount) == null).length
  const subtotalKind = kind => {
    const lines=installation.filter(line => line.kind===kind)
    return lines.some(line => amountCents(line.amount)!=null) ? sumAmounts(lines) : null
  }
  const otherLines=installation.filter(line => !['CABLE','LABOUR'].includes(line.kind))
  return { equipment, installation, equipmentSubtotal, installationSubtotal, tax, total,
    cableSubtotal: subtotalKind('CABLE'), labourSubtotal: subtotalKind('LABOUR'),
    otherSubtotal: otherLines.some(line => amountCents(line.amount)!=null) ? sumAmounts(otherLines) : null,
    pendingEquipment, pendingInstallation, incomplete: !estimate || !estimate.complete || pendingEquipment > 0 || pendingInstallation > 0 || tax == null }
}

export function validInstallation(installation) {
  const decimal = (value, max) => /^\d+(?:\.\d{1,2})?$/.test(String(value)) && Number(value) > 0 && Number(value) <= max
  return decimal(installation.areaM2, 1000000) && /^\d+$/.test(String(installation.cameras))
    && Number(installation.cameras) >= 1 && Number(installation.cameras) <= 256
    && ['INTERIOR', 'EXTERIOR', 'MIXTO'].includes(installation.environment)
    && (installation.cameraRuns != null
      ? decimal(installation.heightMetres, 500) && Array.isArray(installation.cameraRuns) && installation.cameraRuns.length === Number(installation.cameras)
        && installation.cameraRuns.every(run => run.distanceMetres == null || decimal(run.distanceMetres, 100000))
      : ['NORMAL', 'ALTA'].includes(installation.difficulty) && (installation.cableMetres === '' || installation.cableMetres == null || decimal(installation.cableMetres, 100000)))
}

// Hipótesis explícita: planta cuadrada, cámaras en perímetro, grabador a nivel de suelo,
// trazado ortogonal. No es una conversión de m² a metros de cable.
export function cameraRunsFor(installation, overrides = []) {
  const count=Number(installation.cameras)
  if (!Number.isInteger(count) || count<1 || count>256) return []
  const side=Math.sqrt(Number(installation.areaM2))
  const height=Number(installation.heightMetres)
  const approximate=['SQUARE_CENTER','SQUARE_CORNER'].includes(installation.layoutAssumption) && side>0 && height>0
  return Array.from({ length:count }, (_,index) => {
    if (overrides[index] != null) return { distanceMetres: overrides[index]==='' ? null : Number(overrides[index]), source:'manual' }
    if (!approximate) return { distanceMetres:null, source:'pending' }
    const perimeterPosition=((index+.5)/count)*4*side
    let x,y
    if(perimeterPosition<side) { x=perimeterPosition; y=0 }
    else if(perimeterPosition<2*side) { x=side; y=perimeterPosition-side }
    else if(perimeterPosition<3*side) { x=3*side-perimeterPosition; y=side }
    else { x=0; y=4*side-perimeterPosition }
    const recorder=installation.layoutAssumption==='SQUARE_CENTER' ? side/2 : 0
    return { distanceMetres:Math.round((Math.abs(x-recorder)+Math.abs(y-recorder)+height)*100)/100, source:'suggestion' }
  })
}
