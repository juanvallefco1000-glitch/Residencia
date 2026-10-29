// Opt-in: Firefox con WebDriver BiDi y una API/base de pruebas aisladas.
// Nunca ejecutar contra registros reales. Las credenciales se reciben por entorno y no se imprimen.
import assert from 'node:assert/strict'
import { writeFile, unlink } from 'node:fs/promises'

const origin = process.env.PRODUCTS_BROWSER_ORIGIN
const email = process.env.PRODUCTS_BROWSER_EMAIL
const password = process.env.PRODUCTS_BROWSER_PASSWORD
const createCategory = process.env.PRODUCTS_BROWSER_CREATE_CATEGORY === 'true'
if (!origin || !email || !password) throw new Error('Configura PRODUCTS_BROWSER_ORIGIN, PRODUCTS_BROWSER_EMAIL y PRODUCTS_BROWSER_PASSWORD para una instancia aislada.')
const socket = new WebSocket(process.env.PRODUCTS_BROWSER_BIDI || 'ws://127.0.0.1:19223/session')
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error('No se pudo conectar con Firefox BiDi.')) })
let nextId = 0
const pending = new Map()
const errors = []
const traffic = []
socket.onmessage = event => {
  const data = JSON.parse(event.data)
  if (data.id) {
    const request = pending.get(data.id)
    if (request) { pending.delete(data.id); clearTimeout(request.timer); data.type === 'error' ? request.reject(new Error(`${data.error}: ${data.message}`)) : request.resolve(data.result) }
  } else if (data.method === 'browsingContext.userPromptOpened') {
    command('browsingContext.handleUserPrompt', { context: data.params.context, accept: true }).catch(() => {})
  } else if (data.method === 'network.responseCompleted') {
    const event = data.params
    const url = new URL(event.request.url)
    if (url.pathname.startsWith('/api/')) traffic.push({ method: event.request.method, path: url.pathname + url.search, status: event.response.status })
  } else if (data.method === 'log.entryAdded' && data.params.level === 'error' && data.params.type === 'javascript') {
    errors.push(data.params.text)
  }
}
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Tiempo agotado: ${method}`)) }, 20000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(context, expression) {
  const result = await command('script.evaluate', { expression: `(async () => JSON.stringify(await (${expression})))()`, target: { context }, awaitPromise: true })
  if (result.type === 'exception') throw new Error('Falló una operación del navegador.')
  return result.result.value === undefined ? undefined : JSON.parse(result.result.value)
}
async function wait(context, expression, description) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (await evaluate(context, expression).catch(() => false)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`No se cumplió: ${description}`)
}
async function click(context, text) {
  await evaluate(context, `(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw new Error('Botón no encontrado'); button.click(); return true })()`)
}
function field(label, value) {
  return `(() => { const label = [...document.querySelectorAll('.adminProductEditor label')].find(l => l.firstChild.textContent.trim() === ${JSON.stringify(label)}); const input = label.querySelector('input,select,textarea'); const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true})); return true })()`
}
let admin, catalog
const imagePath = `/tmp/segurixt-browser-image-${Date.now()}.png`
try {
  await command('session.new', { capabilities: { alwaysMatch: { acceptInsecureCerts: true } } })
  await command('session.subscribe', { events: ['browsingContext.userPromptOpened', 'log.entryAdded', 'network.responseCompleted'] })
  admin = (await command('browsingContext.create', { type: 'tab' })).context
  catalog = (await command('browsingContext.create', { type: 'tab' })).context
  await command('browsingContext.navigate', { context: catalog, url: `${origin}/#/catalogo`, wait: 'complete' })
  await wait(catalog, createCategory ? `!!document.querySelector('.catalogTools select')` : `!!document.querySelector('.catalogTools select option[value="browser-tests"]')`, 'catálogo conectado a la API')
  await command('browsingContext.navigate', { context: admin, url: `${origin}/#/admin/login`, wait: 'complete' })
  await wait(admin, `!!document.querySelector('#admin-email')`, 'formulario de login')
  await evaluate(admin, `(() => { for (const [id,value] of ${JSON.stringify([['admin-email', email], ['admin-password', password]])}) { const input=document.getElementById(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } return true })()`)
  await evaluate(admin, `(() => { document.querySelector('form').requestSubmit(); return true })()`)
  await wait(admin, `!!document.querySelector('a[href="#/admin/productos"]')`, 'login JWT y dashboard existentes')
  await evaluate(admin, `(() => { document.querySelector('.adminStatCard[href="#/admin/productos"]').click(); return true })()`)
  if (createCategory) {
    await wait(admin, `!![...document.querySelectorAll('button')].find(b=>b.textContent==='Crear categoría' && !b.disabled)`, 'categorías vacías cargadas')
    assert.ok(await evaluate(admin, `document.body.textContent.includes('No hay categorías activas')`))
    assert.ok(await evaluate(admin, `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Agregar producto')).disabled`))
    await click(admin, 'Crear categoría')
    await evaluate(admin, field('Nombre de categoría *', 'Navegador'))
    await evaluate(admin, field('Slug de categoría *', 'browser-tests'))
    await click(admin, 'Guardar categoría')
  }
  await wait(admin, `!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Agregar producto') && !b.disabled)`, 'pantalla administrativa')
  await click(admin, '+ Agregar producto')
  const name = `Prueba navegador ${Date.now()}`
  await evaluate(admin, field('Nombre *', name))
  const categoryId = await evaluate(admin, `document.querySelector('.adminProductEditor option:not([disabled])') && [...document.querySelectorAll('.adminProductEditor option')].find(o=>o.textContent==='Navegador').value`)
  await evaluate(admin, field('Categoría *', categoryId))
  await evaluate(admin, field('Precio (MXN)', '100.50'))
  await click(admin, 'Guardar producto')
  await wait(admin, `!!document.querySelector('#product-images-title')`, 'alta persistida y formulario de imágenes')
  await wait(admin, `document.querySelector('tbody').textContent.includes(${JSON.stringify(name)})`, 'tabla actualizada')
  await wait(catalog, `document.body.textContent.includes(${JSON.stringify(name)})`, 'alta reflejada en otra pestaña del catálogo')

  // PNG válida de 1x1. Se comprueba la subida real mediante el control de archivo.
  await writeFile(imagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'))
  const fileNode = await command('script.evaluate', { expression: `document.querySelector('.adminProductImages input[type=file]')`, target: { context: admin }, awaitPromise: false })
  await command('input.setFiles', { context: admin, element: { sharedId: fileNode.result.sharedId }, files: [imagePath] })
  await click(admin, 'Subir imagen')
  await wait(admin, `document.querySelectorAll('.adminImageItem').length === 1`, 'imagen asociada')
  await wait(catalog, `!![...document.querySelectorAll('img')].find(i=>i.src.includes('/api/productos/imagenes/') && i.complete && i.naturalWidth>0)`, 'imagen pública desde API')

  const editedName = `${name} editado`
  await evaluate(admin, field('Nombre *', editedName))
  await click(admin, 'Guardar producto')
  await wait(admin, `document.querySelector('tbody').textContent.includes(${JSON.stringify(editedName)})`, 'edición reflejada en tabla')
  await wait(catalog, `document.body.textContent.includes(${JSON.stringify(editedName)})`, 'edición reflejada en catálogo')
  await click(admin, 'Cerrar formulario')
  await command('browsingContext.setViewport', { context: admin, viewport: { width: 1365, height: 900 }, devicePixelRatio: 1 })
  const desktop = await command('browsingContext.captureScreenshot', { context: admin })
  await writeFile('/tmp/segurixt-products-desktop.png', Buffer.from(desktop.data, 'base64'))
  await command('browsingContext.setViewport', { context: admin, viewport: { width: 390, height: 844 }, devicePixelRatio: 1 })
  assert.ok(await evaluate(admin, `document.documentElement.scrollWidth <= innerWidth + 1`), 'La pantalla móvil no debe desbordar horizontalmente')
  const mobile = await command('browsingContext.captureScreenshot', { context: admin })
  await writeFile('/tmp/segurixt-products-mobile.png', Buffer.from(mobile.data, 'base64'))
  await click(admin, 'Dar de baja')
  await wait(admin, `document.querySelector('tbody').textContent.includes('Inactivo')`, 'baja lógica visible en administración')
  await wait(catalog, `!document.body.textContent.includes(${JSON.stringify(editedName)})`, 'baja oculta en catálogo')
  await evaluate(admin, `(() => { location.hash='/admin/servicios'; return true })()`)
  await wait(admin, `document.querySelector('h1')?.textContent === 'Servicios'`, 'ruta existente de servicios')
  assert.deepEqual(errors, [], 'No debe haber excepciones JavaScript')
  assert.ok(traffic.some(r => r.method === 'GET' && r.path === '/api/admin/productos/categorias' && r.status === 200))
  assert.ok(traffic.some(r => r.method === 'POST' && r.path === '/api/admin/productos' && r.status === 201))
  if (createCategory) assert.ok(traffic.some(r => r.method === 'POST' && r.path === '/api/admin/productos/categorias' && r.status === 201))
  console.log('HTTP real del navegador (sin cabeceras ni credenciales):', JSON.stringify(traffic))
  console.log('Firefox: login, categorías, alta, tabla, imagen, edición, sincronización entre pestañas, baja lógica, responsive y ruta de servicios: OK.')
} finally {
  await unlink(imagePath).catch(() => {})
  if (admin) await command('browsingContext.close', { context: admin }).catch(() => {})
  if (catalog) await command('browsingContext.close', { context: catalog }).catch(() => {})
  await command('session.end').catch(() => {})
  socket.close()
}
