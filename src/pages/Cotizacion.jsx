import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addQuoteItem, updateQuoteQuantity, removeQuoteItem, canAdvanceQuote, validQuantity, quoteItemSubtotal, quoteSelectionSubtotal, deriveQuoteBudget, validInstallation, cameraRunsFor } from '../services/quoteSelection'
import ProductImage from '../components/ProductImage'
import ProductPrice from '../components/ProductPrice'
import { company } from '../config/company'
import { quoteMoney as money, quoteRequest, quoteCatalog } from '../services/quoteService'

export default function Cotizacion() {
  const [params] = useSearchParams()
  const [step, setStep] = useState(1)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [catalog, setCatalog] = useState({ content: [], totalPages: 0 })
  const [items, setItems] = useState([])
  const [draftQuantities, setDraftQuantities] = useState({})
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [installation, setInstallation] = useState({ areaM2: '', cameras: 1, environment: 'INTERIOR', heightMetres: '', layoutAssumption: 'UNKNOWN' })
  const [runOverrides, setRunOverrides] = useState([])
  const [installationPolicy, setInstallationPolicy] = useState(null)
  const [policyError, setPolicyError] = useState('')
  const [estimateResponse, setEstimateResponse] = useState(null)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [contact, setContact] = useState({ name: '', phone: '', email: '', message: params.get('servicio') || '' })
  const reference = params.get('producto')
  useEffect(() => {
    const controller=new AbortController()
    quoteRequest('/instalacion',null,controller.signal).then(data => { if (!controller.signal.aborted) { setInstallationPolicy(data); setPolicyError('') } }).catch(error => { if (!controller.signal.aborted) setPolicyError(error.message) })
    return () => controller.abort()
  }, [])
  const cameraRuns = useMemo(() => cameraRunsFor(installation,runOverrides), [installation,runOverrides])

  useEffect(() => {
    const controller = new AbortController()
    setCatalogLoading(true); setCatalogError(''); setCatalog({ content: [], totalPages: 0 })
    const timer = setTimeout(() => {
      quoteCatalog.list(search, page, controller.signal).then(data => {
        if (!controller.signal.aborted) setCatalog(data)
      }).catch(e => { if (!controller.signal.aborted) setCatalogError(e.message) })
        .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false) })
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [search, page, catalogAttempt])
  useEffect(() => {
    if (!reference) return
    const controller = new AbortController()
    // La referencia del catálogo es solo un ID: el servidor valida existencia y precio.
    quoteCatalog.detail(reference, controller.signal).then(p => {
      if (!controller.signal.aborted) setItems(current => current.some(item => item.productId === p.id) ? current : addQuoteItem(current, p))
    }).catch(e => { if (!controller.signal.aborted) setCatalogError(e.message) })
    return () => controller.abort()
  }, [reference])
  const configuration = useMemo(() => ({
    items: items.map(({ productId, quantity }) => ({ productId, quantity: Number(quantity) })),
    installation: { ...installation, areaM2: Number(installation.areaM2), cameras: Number(installation.cameras), heightMetres: Number(installation.heightMetres), cameraRuns: cameraRuns.map(({distanceMetres}) => ({distanceMetres})) },
  }), [items, installation, cameraRuns])
  const configurationKey = JSON.stringify(configuration)
  const estimate = estimateResponse?.key === configurationKey ? estimateResponse.data : null
  const budget = useMemo(() => deriveQuoteBudget(items, estimate), [items, estimate])
  const selectionSubtotal = useMemo(() => quoteSelectionSubtotal(items), [items])
  const selectionValid = canAdvanceQuote(items)
  const valid = selectionValid && validInstallation(configuration.installation)
  useEffect(() => {
    setEstimateResponse(null); setReceipt(null); setError('')
    if (!valid) { setBusy(false); return }
    const controller = new AbortController()
    setBusy(true)
    const timer = setTimeout(() => {
      quoteRequest('/estimar', JSON.parse(configurationKey), controller.signal).then(result => { if (!controller.signal.aborted) setEstimateResponse({ key: configurationKey, data: result }) })
        .catch(e => { if (!controller.signal.aborted) setError(e.message) })
        .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    }, 400)
    return () => { clearTimeout(timer); controller.abort() }
  }, [configurationKey, valid])
  function add(product) {
    setItems(current => addQuoteItem(current, product, draftQuantities[product.id] ?? 1))
  }
  function field(key, value) {
    setInstallation(current => ({ ...current, [key]: value }))
    if (key==='cameras' && Number.isInteger(Number(value)) && Number(value)>=1 && Number(value)<=256) setRunOverrides(current => current.slice(0,Number(value)))
  }
  async function submit(event) {
    event.preventDefault(); if (!selectionValid || !estimate || busy || saving) return; setSaving(true); setError('')
    try {
      const result = await quoteRequest('/solicitudes', { configuration, ...contact })
      setEstimateResponse({ key: configurationKey, data: result.estimate }); setReceipt(result.id)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const summary = estimate ? `Hola SegurIXT, solicito revisión de mi instalación. ${installation.areaM2} m², ${installation.cameras} cámaras, altura ${installation.heightMetres || 'pendiente'} m. Recorridos: ${cameraRuns.map((run,index) => `Cámara ${index+1}: ${run.distanceMetres ?? 'pendiente'} m`).join(', ')}.\n${estimate.lines.map(l => `${l.description}: ${l.quantity} ${l.unit} · ${money(l.amount)}${l.pending ? ` (${l.pending})` : ''}`).join('\n')}\nTotal conocido estimado: ${money(estimate.knownTotal)} MXN. Sujeto a confirmación.${receipt ? ` Folio: ${receipt}` : ''}` : ''
  return <main>
    <section className="pageHero"><span className="sectionKicker">Cotizador de instalaciones</span><h1>Arma tu proyecto, paso a paso</h1><p>Selecciona equipos del catálogo real y conoce los importes disponibles. El presupuesto final requiere revisión de SegurIXT.</p></section>
    <section className="section quoteBuilder">
      <div>
        <nav className="quoteSteps" aria-label="Pasos de la cotización">{['Equipos', 'Instalación', 'Solicitud'].map((label, i) => <button key={label} className="button secondary" aria-current={step === i + 1 ? 'step' : undefined} disabled={saving || (i > 0 && !selectionValid)} onClick={() => setStep(i + 1)}>{i + 1}. {label}</button>)}</nav>
        {step === 1 && <div className="quoteForm"><h2>1. Elige tus equipos</h2><label>Buscar en el catálogo<input type="search" value={search} maxLength={200} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Cámara, grabador, disco…" /></label>
          {catalogLoading && <p role="status">Cargando productos…</p>}{catalogError && <div role="alert"><p>{catalogError}</p><button className="button secondary" onClick={() => setCatalogAttempt(v => v + 1)}>Reintentar</button></div>}
          <ul className="quoteProductList">{catalog.content.map(p => <li key={p.id} className="quoteProductRow">
            <div className="quoteProductImage"><ProductImage images={p.images} name={p.name} showFallback /></div>
            <div className="quoteProductInfo">
            <h3>{p.name}</h3>
            {(p.brand || p.model) && <p className="quoteProductMeta">{[p.brand, p.model].filter(Boolean).join(' · ')}</p>}
            {p.description && <p className="quoteProductDescription">{p.description}</p>}
            </div>
            <div className="quoteProductActions">
            <p className="quoteProductPrice"><ProductPrice price={p.price} /></p>
            <label className="quoteProductQuantity">Cantidad<input aria-label={`Cantidad de ${p.name}`} type="number" min="1" max="1000" step="1" value={draftQuantities[p.id] ?? 1} onChange={e => setDraftQuantities(current => ({ ...current, [p.id]: e.target.value }))} /></label>
            <button className="button primary" disabled={saving || !validQuantity(draftQuantities[p.id] ?? 1) || Number(items.find(i => i.productId === p.id)?.quantity || 0) + Number(draftQuantities[p.id] ?? 1) > 1000} onClick={() => add(p)}>Agregar a cotización</button>
            {items.some(i => i.productId === p.id) && <small className="quoteAdded" role="status">En tu selección: {items.find(i => i.productId === p.id).quantity || 0}</small>}
            </div>
          </li>)}</ul>
          {!catalogLoading && !catalog.content.length && !catalogError && <p>{search ? 'No hay productos para esta búsqueda.' : 'El catálogo público está vacío.'}</p>}
          <div className="quoteSteps"><button className="button secondary" disabled={page === 0 || catalogLoading} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page + 1}</span><button className="button secondary" disabled={catalogLoading || page + 1 >= catalog.totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button></div>
        </div>}
        {step === 2 && <div className="quoteForm"><h2>2. Cuéntanos sobre la instalación</h2><div className="formGrid">
          <label>Superficie aproximada (m²)<input disabled={saving} type="number" min="0.01" max="1000000" step="0.01" value={installation.areaM2} onChange={e => field('areaM2', e.target.value)} /></label>
          <label>Cámaras por instalar<input disabled={saving} type="number" min="1" max="256" value={installation.cameras} onChange={e => field('cameras', e.target.value)} /></label>
          <label>Ubicación<select disabled={saving} value={installation.environment} onChange={e => field('environment', e.target.value)}><option value="INTERIOR">Interior</option><option value="EXTERIOR">Exterior</option><option value="MIXTO">Interior y exterior</option></select></label>
          <label>Altura aproximada de instalación (metros)<input disabled={saving} type="number" min="0.01" max="500" step="0.01" value={installation.heightMetres} onChange={e => field('heightMetres',e.target.value)} /></label>
          <label>Hipótesis para sugerir recorridos<select disabled={saving} value={installation.layoutAssumption} onChange={e => field('layoutAssumption',e.target.value)}><option value="UNKNOWN">Sin datos suficientes: medir cada recorrido</option><option value="SQUARE_CENTER">Planta cuadrada · grabador en el centro</option><option value="SQUARE_CORNER">Planta cuadrada · grabador en una esquina</option></select></label>
        </div>
        <p>La superficie no determina por sí sola el cableado. Si eliges una hipótesis, se aproximan cámaras distribuidas por el perímetro, grabador a nivel de suelo y trazado ortogonal más la subida a la altura indicada. Confirma geometría, obstáculos y posición real del grabador.</p>
        <p>{installationPolicy ? `Longitud incluida configurada: ${installationPolicy.includedLength} m por cámara.` : 'Longitud incluida propuesta: 18 m por cámara, pendiente de confirmar con la configuración de la empresa.'}</p>
        {policyError && <p role="status">Configuración de instalación no disponible. Los costos permanecen pendientes de valoración.</p>}
        {installationPolicy?.maxAutoHeight && Number(installation.heightMetres)>Number(installationPolicy.maxAutoHeight) && <p className="quotePending">La altura supera {installationPolicy.maxAutoHeight} m. Requiere valoración técnica.</p>}
        <div className="cameraRunList">{cameraRuns.map((run,index) => <div className="cameraRunRow" key={index}>
          <label>Cámara {index+1} — recorrido (m lineales)<input disabled={saving} type="number" min="0.01" max="100000" step="0.01" value={run.distanceMetres ?? ''} placeholder="Pendiente de medición" onChange={e => setRunOverrides(current => { const next=[...current]; next[index]=e.target.value; return next })} /></label>
          <span>{run.source==='suggestion' ? 'Aproximación: confirmar recorrido' : run.source==='manual' ? 'Recorrido indicado por el cliente' : 'Pendiente de valoración'}</span>
          <button className="button secondary" type="button" disabled={saving || run.source!=='manual'} onClick={() => setRunOverrides(current => { const next=[...current]; next[index]=null; return next })}>Usar hipótesis</button>
        </div>)}</div>
        </div>}
        <div className="quoteForm quoteSelection"><h2>Tu selección</h2>
          {!items.length && <p>Agrega al menos un producto para continuar.</p>}
          {items.map(item => <div className="quoteSelectedItem" key={item.productId}>
            <div className="quoteSelectedProduct"><div className="quoteSelectedImage"><ProductImage images={item.images} name={item.name} showFallback /></div><div><strong>{item.name}</strong><p>Precio unitario: <ProductPrice price={item.unitPrice} /></p><p>Subtotal: <b>{money(quoteItemSubtotal(item))}</b></p>{item.unitPrice == null && <small>Precio pendiente de cotizar</small>}</div></div>
            <div className="quoteQuantityControls">
              <label>Cantidad de {item.name}<input disabled={saving} type="number" min="1" max="1000" step="1" value={item.quantity} onChange={e => setItems(current => updateQuoteQuantity(current, item.productId, e.target.value))} /></label>
              <div><button className="button secondary" aria-label={`Disminuir cantidad de ${item.name}`} disabled={saving || Number(item.quantity) <= 1} onClick={() => setItems(current => updateQuoteQuantity(current, item.productId, Number(item.quantity) - 1))}>−</button><button className="button secondary" aria-label={`Aumentar cantidad de ${item.name}`} disabled={saving || Number(item.quantity) >= 1000} onClick={() => setItems(current => updateQuoteQuantity(current, item.productId, Number(item.quantity) + 1))}>+</button></div>
            </div>
            <button className="button secondary" disabled={saving} onClick={() => setItems(current => removeQuoteItem(current, item.productId))} aria-label={`Quitar ${item.name}`}>Quitar</button>
          </div>)}
          {!!items.length && <p className="quoteSelectionTotal" aria-live="polite">Subtotal de equipos con precio: <strong>{money(selectionSubtotal.known)} MXN</strong>{selectionSubtotal.pending > 0 && <small>{selectionSubtotal.pending} concepto(s) pendiente(s) de precio o cantidad.</small>}</p>}
          {!!items.length && <small className="formNote">Precios informativos del catálogo público. El servidor confirmará los importes y el contenido de kits al calcular la instalación.</small>}
        </div>
        {step === 3 && <form className="quoteForm" onSubmit={submit}><h2>3. Solicita tu cotización formal</h2><div className="formGrid"><label>Nombre<input required maxLength={150} value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} /></label><label>Teléfono<input required type="tel" pattern="[+0-9 ()-]{7,30}" maxLength={30} value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} /></label><label>Correo (opcional)<input type="email" maxLength={150} value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} /></label></div><label>Detalles de tu proyecto<textarea rows="4" maxLength={4000} value={contact.message} onChange={e => setContact({ ...contact, message: e.target.value })} /></label><p>Al enviar, SegurIXT recibirá tus datos de contacto y la configuración para atender tu solicitud. Los precios se consultarán nuevamente para guardar el presupuesto vigente.</p><button className="button primary" disabled={!selectionValid || !estimate || busy || saving || !!receipt}>{saving ? 'Guardando…' : 'Solicitar cotización formal'}</button>{receipt && <p role="status">Solicitud guardada. Folio: {receipt}. Nuestro equipo revisará tu presupuesto.</p>}</form>}
        {step < 3 && <button className="button primary quoteContinue" disabled={!selectionValid || saving} onClick={() => setStep(s => s + 1)}>Continuar</button>}
      </div>
      <aside className="quoteSummary" aria-label="Desglose estimado">
        <h2>Tu presupuesto estimado</h2>
        <section aria-labelledby="budget-equipment-title">
          <h3 id="budget-equipment-title">Equipos seleccionados</h3>
          {!items.length && <p>Agrega productos para ver tu presupuesto.</p>}
          <ul className="quoteBreakdown quoteEquipmentBreakdown">{budget.equipment.map(line => <li key={line.productId}>
            <strong>{line.description}</strong>
            <span>{line.quantity || 'Cantidad pendiente'} {line.unit} × <ProductPrice price={line.unitPrice} /></span>
            <b>{line.amount == null ? 'Pendiente de confirmación' : `${money(line.amount)} MXN`}</b>
            {line.pending && <small className="quotePending">{line.pending}</small>}
          </li>)}</ul>
        </section>
        <section aria-labelledby="budget-installation-title">
          <h3 id="budget-installation-title">Costos de instalación</h3>
          <p>{installation.cameras || 'Pendiente'} cámaras · altura {installation.heightMetres || 'pendiente'} m</p>
          {estimate?.cableRuns?.length > 0 && <ul className="quoteBreakdown">{estimate.cableRuns.map(run => <li key={run.camera}>
            <strong>Cámara {run.camera}: {run.distanceMetres == null ? 'Recorrido pendiente' : `${run.distanceMetres} m lineales`}</strong>
            <span>Incluidos: {run.includedMetres} m · Adicionales: {run.additionalMetres ?? 'pendiente'} m</span>
            {run.additionalSegments != null && run.additionalSegments>0 && <span>{run.additionalSegments} tramo(s) adicional(es), {run.billedMetres} m comerciales</span>}
            <b>Adicional: {run.amount == null ? 'Pendiente de valoración' : `${money(run.amount)} MXN`}</b>
            {run.pending && <small className="quotePending">{run.pending}</small>}
          </li>)}</ul>}
          <p role="status" aria-live="polite">{valid && !estimate && !error ? 'Consultando tarifas y materiales…' : !estimate ? 'Pendiente de estimación. Completa los datos de instalación para consultar las tarifas reales.' : ''}</p>
          {error && <p role="alert">{error} Los costos de instalación e impuestos permanecen pendientes.</p>}
          {!estimate && <small>La superficie en m² y el recorrido de cable en metros lineales son medidas independientes.</small>}
          <ul className="quoteBreakdown">{budget.installation.filter(line => line.kind!=='CABLE').map((line, index) => <li key={index}>
            <strong>{line.description}</strong><span>{line.quantity} {line.unit} × {line.unitPrice == null ? 'Pendiente de estimación' : `${money(line.unitPrice)} MXN`}</span>
            <b>{line.amount == null ? 'Pendiente de estimación' : `${money(line.amount)} MXN`}</b>
            {line.pending && <small className="quotePending">{line.pending}</small>}
          </li>)}</ul>
        </section>
        <h3>Resumen</h3>
        <dl aria-live="polite" aria-atomic="true">
          <div><dt>Subtotal conocido de equipos</dt><dd className="quoteEquipmentSubtotal">{money(budget.equipmentSubtotal)} MXN</dd></div>
          <div><dt>Subtotal de cableado adicional</dt><dd>{budget.cableSubtotal == null ? 'Pendiente de valoración' : `${money(budget.cableSubtotal)} MXN`}</dd></div>
          <div><dt>Subtotal de mano de obra</dt><dd>{budget.labourSubtotal == null ? 'Pendiente de valoración' : `${money(budget.labourSubtotal)} MXN`}</dd></div>
          <div><dt>Otros costos conocidos</dt><dd>{budget.otherSubtotal == null ? 'Pendiente de valoración' : `${money(budget.otherSubtotal)} MXN`}</dd></div>
          <div><dt>{estimate && !estimate.taxEnabled ? 'Impuestos no aplicados según configuración' : 'Impuestos'}</dt><dd>{budget.tax == null ? 'Pendiente de estimación' : `${money(budget.tax)} MXN`}</dd></div>
          <div className="quoteTotal"><dt>{budget.incomplete ? 'Total parcial conocido' : 'Total estimado'}</dt><dd className="quoteBudgetTotal">{money(budget.total)} MXN</dd></div>
        </dl>
        {budget.incomplete && <p className="quoteBudgetPending"><strong>Presupuesto incompleto.</strong> Los conceptos pendientes de precio, instalación o impuestos no se incluyen en el total conocido.</p>}
        <small>Estimación informativa, sujeta a revisión y confirmación de SegurIXT. El servidor vuelve a validar los precios al guardar la solicitud.</small>
        {estimate && <>
          {estimate.warnings.map(warning => <p key={warning}>{warning}</p>)}
          <a className="button secondary" href={`https://wa.me/${company.whatsapp.number}?text=${encodeURIComponent(summary)}`} target="_blank" rel="noreferrer">Compartir resumen por WhatsApp</a>
          <small className="formNote">WhatsApp abre un borrador; envíalo cuando lo hayas revisado.</small>
        </>}
      </aside>
    </section>
  </main>
}
