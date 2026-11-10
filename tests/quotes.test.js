import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuoteClient, createQuoteCatalog, quoteMoney } from '../src/services/quoteService.js'
import { addQuoteItem, updateQuoteQuantity, removeQuoteItem, canAdvanceQuote, quoteItemSubtotal, quoteSelectionSubtotal, deriveQuoteBudget, validInstallation, cameraRunsFor } from '../src/services/quoteSelection.js'

test('cotizador sin API falla sin recurrir a datos locales', async () => {
  let requests = 0
  const request = createQuoteClient('', () => { requests++; throw new Error('No debe consultar') })
  await assert.rejects(request('/productos'), /catálogo real/)
  assert.equal(requests, 0)
})
test('cotizador transmite configuración y no usa credenciales ni caché', async () => {
  const configuration = { items: [{ productId: 5, quantity: 2 }], installation: { areaM2: 100, cableMetres: null } }
  const controller = new AbortController()
  const request = createQuoteClient('https://api.example.test', async (url, options) => {
    assert.equal(url, 'https://api.example.test/api/cotizador/estimar')
    assert.equal(options.method, 'POST'); assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store')
    assert.equal(options.signal, controller.signal)
    assert.deepEqual(JSON.parse(options.body), configuration)
    return { ok: true, json: async () => ({ knownTotal: 246.9 }) }
  })
  assert.deepEqual(await request('/estimar', configuration, controller.signal), { knownTotal: 246.9 })
})
test('errores HTTP no se transforman en estimaciones locales', async () => {
  const request = createQuoteClient('https://api.example.test', async () => ({ ok: false, json: async () => ({ mensaje: 'Producto no disponible' }) }))
  await assert.rejects(request('/estimar', { items: [] }), /Producto no disponible/)
})

const publicProduct = { id: 7, nombre: 'Cámara pública', precio: 123.45, mostrarPrecio: true, categoria: { id: 1 } }
test('equipos reutiliza /api/productos con búsqueda y paginación sin JWT', async () => {
  const client = createQuoteCatalog('https://api.example.test', async (url, options) => {
    const endpoint = new URL(url)
    assert.equal(endpoint.pathname, '/api/productos')
    assert.equal(endpoint.searchParams.get('q'), 'cámara & DVR')
    assert.equal(endpoint.searchParams.get('page'), '1')
    assert.equal(endpoint.searchParams.get('size'), '24')
    assert.equal(options.headers.Authorization, undefined)
    assert.equal(options.credentials, undefined)
    return { ok: true, json: async () => ({ content: [publicProduct], totalPages: 2, totalElements: 25 }) }
  })
  const result = await client.list('cámara & DVR', 1)
  assert.deepEqual(result.content, [{ id: 7, name: 'Cámara pública', price: 123.45, brand: '', model: '', description: '', images: [] }])
})
test('catálogo vacío es una respuesta correcta, no un error de autenticación', async () => {
  const client = createQuoteCatalog('https://api.example.test', async () => ({ ok: true, json: async () => ({ content: [], totalPages: 0, totalElements: 0 }) }))
  assert.deepEqual((await client.list()).content, [])
})
for (const status of [401, 403, 404]) test(`catálogo distingue HTTP ${status} y no propaga mensajes administrativos`, async () => {
  const client = createQuoteCatalog('https://api.example.test', async () => ({ ok: false, status, json: async () => ({ mensaje: 'Inicia sesión de nuevo' }) }))
  await assert.rejects(client.list(), error => error.status === status && error.message.includes(String(status)) && !error.message.includes('Inicia sesión de nuevo'))
})
test('error de red se distingue de catálogo vacío y de autenticación', async () => {
  const client = createQuoteCatalog('https://api.example.test', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(client.list(), /No se pudo conectar/)
})
test('precio oculto no se muestra en la selección', async () => {
  const client = createQuoteCatalog('https://api.example.test', async () => ({ ok: true, json: async () => ({ ...publicProduct, mostrarPrecio: false, precio: 9999 }) }))
  assert.equal((await client.detail(7)).price, null)
})

test('agrega productos con cantidad, conserva otros y evita duplicar un producto', () => {
  const first = addQuoteItem([], { id: 7, name: 'Cámara', price: 123.45 }, 3)
  assert.equal(first[0].quantity, 3)
  assert.equal(quoteItemSubtotal(first[0]), '370.35')
  const repeated = addQuoteItem(first, { id: 7, name: 'Cámara', price: 123.45 }, 1)
  assert.equal(repeated.length, 1); assert.equal(repeated[0].quantity, 4)
  assert.equal(quoteItemSubtotal(repeated[0]), '493.80')
  const second = addQuoteItem(first, { id: 8, name: 'Disco', price: 900 }, 1)
  assert.equal(second.length, 2); assert.deepEqual(second[0], first[0])
})
test('aumenta, disminuye y elimina cantidades y bloquea selección vacía', () => {
  let items = addQuoteItem([], { id: 7, name: 'Conector', price: 0.1 })
  items = updateQuoteQuantity(items, 7, 3)
  assert.equal(quoteItemSubtotal(items[0]), '0.30')
  items = updateQuoteQuantity(items, 7, 2)
  assert.equal(quoteItemSubtotal(items[0]), '0.20')
  assert.equal(canAdvanceQuote(items), true)
  assert.equal(updateQuoteQuantity(items, 7, -1), items)
  assert.equal(updateQuoteQuantity(items, 7, 1001), items)
  assert.equal(canAdvanceQuote(updateQuoteQuantity(items, 7, '')), false)
  items = removeQuoteItem(items, 7)
  assert.equal(items.length, 0); assert.equal(canAdvanceQuote(items), false)
})
test('precios pendientes y cantidades inválidas no generan subtotales ficticios', () => {
  assert.equal(quoteItemSubtotal({ unitPrice: null, quantity: 5 }), null)
  assert.equal(quoteItemSubtotal({ unitPrice: 0, quantity: 5 }), '0.00')
  assert.equal(quoteItemSubtotal({ unitPrice: 123.45, quantity: '' }), null)
  assert.deepEqual(addQuoteItem([], { id: 1 }, 0), [])
})

test('adaptador conserva fotografías reales, marca, modelo y descripción', async () => {
  const images = [{ id: 12, url: '/api/productos/imagenes/foto-real.png', principal: true, textoAlt: 'Cámara' }]
  const client = createQuoteCatalog('https://api.example.test', async () => ({ ok: true, json: async () => ({ ...publicProduct, marca: 'Marca real', modelo: 'Modelo', descripcionCorta: 'Descripción', imagenes: images }) }))
  const product = await client.detail(7)
  assert.deepEqual(product.images, images)
  assert.equal(product.brand, 'Marca real'); assert.equal(product.model, 'Modelo'); assert.equal(product.description, 'Descripción')
  const selection = addQuoteItem([], product, 2)
  assert.deepEqual(selection[0].images, images)
  const repeated = addQuoteItem(selection, product, 3)
  assert.equal(repeated.length, 1); assert.equal(repeated[0].quantity, 5)
  assert.deepEqual(repeated[0].images, images)
  assert.equal(quoteSelectionSubtotal(repeated).known, '617.25')
})
test('subtotal general se actualiza sin redondeo binario ni precios ficticios', () => {
  let items = addQuoteItem([], { id: 1, price: 0.10 }, 3)
  items = addQuoteItem(items, { id: 2, price: 0.20 }, 2)
  items = addQuoteItem(items, { id: 3, price: null }, 1)
  assert.deepEqual(quoteSelectionSubtotal(items), { known: '0.70', pending: 1 })
  assert.deepEqual(quoteSelectionSubtotal(removeQuoteItem(items, 2)), { known: '0.30', pending: 1 })
  assert.equal(addQuoteItem(items, { id: 1, price: 0.10 }, 1000), items)
})

test('presupuesto deriva equipos inmediatamente sin requerir instalación ni duplicar estado', () => {
  let items = addQuoteItem([], { id: 1, name: 'Cámara', price: 123.45 }, 5)
  let budget = deriveQuoteBudget(items)
  assert.equal(budget.equipment.length, 1)
  assert.equal(budget.equipment[0].quantity, 5)
  assert.equal(budget.equipmentSubtotal, '617.25'); assert.equal(budget.total, '617.25')
  assert.equal(budget.installationSubtotal, null); assert.equal(budget.tax, null); assert.equal(budget.incomplete, true)
  items = updateQuoteQuantity(items, 1, 2)
  assert.equal(deriveQuoteBudget(items).total, '246.90')
  assert.equal(deriveQuoteBudget(removeQuoteItem(items, 1)).total, '0.00')
})
test('presupuesto mantiene ocultos y cantidades inválidas como pendientes', () => {
  const items = [{ productId: 1, name: 'Oculto', quantity: 2, unitPrice: null }, { productId: 2, name: 'Sin cantidad', quantity: '', unitPrice: 100 }]
  const budget = deriveQuoteBudget(items)
  assert.equal(budget.pendingEquipment, 2); assert.equal(budget.incomplete, true)
  assert.equal(budget.equipment[0].amount, null); assert.equal(budget.equipment[1].amount, null)
  assert.equal(budget.equipmentSubtotal, '0.00')
})
test('usa importes del servidor y separa adicionales sin duplicar productos seleccionados', () => {
  const items = [{ productId: 1, name: 'Cámara', quantity: 5, unitPrice: 123.45 }]
  const estimate = { lines: [
    { productId: 1, description: 'Cámara', quantity: 5, unitPrice: 125, amount: 625, pending: null },
    { productId: 9, description: 'Cable', quantity: 20, unitPrice: 10, amount: 200, pending: null },
    { productId: null, description: 'Mano de obra', quantity: 5, unitPrice: 100, amount: 500, pending: null },
  ], knownTotal: 1537, tax: 212, taxEnabled: true, complete: true }
  const budget = deriveQuoteBudget(items, estimate)
  assert.equal(budget.equipmentSubtotal, '625.00'); assert.equal(budget.installationSubtotal, '700.00')
  assert.equal(budget.equipment[0].unitPrice, 125)
  assert.equal(budget.installation.length, 2); assert.equal(budget.total, 1537)
  assert.equal(budget.tax, 212); assert.equal(budget.incomplete, false)
})
test('respeta valoración de kits y tarifas ausentes sin recuperar costos excluidos', () => {
  const items = [{ productId: 1, name: 'Componente incluido', quantity: 2, unitPrice: 100 }]
  const estimate = { lines: [
    { productId: 1, description: 'Componente incluido', quantity: 2, unitPrice: 100, amount: null, pending: 'Revisar kit' },
    { productId: null, description: 'Mano de obra', quantity: 1, unitPrice: null, amount: null, pending: 'Tarifa no configurada' },
  ], knownTotal: 0, tax: 0, complete: false }
  const budget = deriveQuoteBudget(items, estimate)
  assert.equal(budget.equipmentSubtotal, '0.00'); assert.equal(budget.equipment[0].amount, null)
  assert.equal(budget.pendingInstallation, 1); assert.equal(budget.installationSubtotal, null); assert.equal(budget.incomplete, true)
})
test('datos de instalación se validan sin convertir superficie a cableado', () => {
  const base = { areaM2: '100', cameras: 5, environment: 'INTERIOR', difficulty: 'NORMAL', cableMetres: '' }
  assert.equal(validInstallation(base), true); assert.equal(base.cableMetres, '')
  for (const change of [{ areaM2: '' }, { areaM2: -1 }, { areaM2: '100.001' }, { cameras: 0 }, { cameras: 1.5 }, { cableMetres: -10 }, { difficulty: 'INVALIDA' }]) {
    assert.equal(validInstallation({ ...base, ...change }), false)
  }
})
test('formato de importes nunca muestra NaN, infinitos o importes negativos', () => {
  for (const value of [null, undefined, '', NaN, Infinity, -1, false, 'no-numero']) assert.equal(quoteMoney(value), 'Pendiente de estimación')
  assert.equal(quoteMoney('617.25'), '$617.25')
})

test('recorridos por cámara son independientes y cambian con una hipótesis explícita', () => {
  const input={areaM2:100,cameras:5,heightMetres:2.5,environment:'INTERIOR',layoutAssumption:'UNKNOWN'}
  assert.equal(cameraRunsFor(input).length,5)
  assert.ok(cameraRunsFor(input).every(run=>run.distanceMetres===null))
  const hypothesis={...input,layoutAssumption:'SQUARE_CENTER'}
  const suggested=cameraRunsFor(hypothesis)
  assert.ok(suggested.every(run=>run.distanceMetres>0 && run.source==='suggestion'))
  assert.notDeepEqual(cameraRunsFor({...hypothesis,areaM2:400}),suggested)
  assert.notDeepEqual(cameraRunsFor({...hypothesis,heightMetres:5}),suggested)
  assert.equal(cameraRunsFor({...hypothesis,cameras:3}).length,3)
  const edited=cameraRunsFor(hypothesis,['12','18','25','30','15'])
  assert.deepEqual(edited.map(run=>run.distanceMetres),[12,18,25,30,15])
  assert.equal(cameraRunsFor({...hypothesis,areaM2:900},['12'])[0].distanceMetres,12)
})
test('validación de altura y recorridos permite distancias desconocidas sin convertir superficie', () => {
  const input={areaM2:100,cameras:2,heightMetres:2.5,environment:'INTERIOR',layoutAssumption:'UNKNOWN',cameraRuns:[{distanceMetres:12},{distanceMetres:null}]}
  assert.equal(validInstallation(input),true)
  assert.equal(validInstallation({...input,heightMetres:0}),false)
  assert.equal(validInstallation({...input,cameraRuns:[{distanceMetres:12}]}),false)
  assert.equal(validInstallation({...input,cameraRuns:[{distanceMetres:-1},{distanceMetres:18}]}),false)
  assert.equal(cameraRunsFor({...input,cameras:257}).length,0)
})
test('resumen usa categorías monetarias del backend sin volver a calcular las tarifas', () => {
  const estimate={lines:[{kind:'CABLE',amount:71.75},{kind:'CABLE',amount:123},{kind:'LABOUR',amount:500},{kind:'MATERIAL',amount:100}],knownTotal:794.75,tax:0,complete:true}
  const result=deriveQuoteBudget([],estimate)
  assert.equal(result.cableSubtotal,'194.75');assert.equal(result.labourSubtotal,'500.00');assert.equal(result.otherSubtotal,'100.00')
})
