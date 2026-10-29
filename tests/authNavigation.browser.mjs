// Prueba aislada: arranca una API simulada, Vite y Firefox con un perfil temporal.
// No conecta a MySQL ni recibe credenciales reales ni modifica endpoints del proyecto.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { connectBrowser } from './browser/bidiClient.mjs'

const apiPort = 19081
const vitePort = 15175
const bidiPort = 19224
const origin = `http://127.0.0.1:${vitePort}/Residencia`
let meStatus = 200
let productsStatus = 200
let categoriesStatus = 200
let expireOnProducts = false
let token = ''
let role = 'ADMIN'
let logins = 0
const requests = []
const user = () => ({ id: 1, nombre: 'Prueba aislada', email: 'navigation@example.test', rol: role })
const api = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', `http://127.0.0.1:${vitePort}`)
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Content-Type', 'application/json')
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return }
  const path = new URL(request.url, 'http://test.local').pathname
  requests.push({ path, authorization: request.headers.authorization })
  const send = (status, body) => { response.writeHead(status); response.end(JSON.stringify(body)) }
  if (path === '/api/auth/login') {
    token = `isolated-navigation-token-${++logins}`
    send(200, { token, expiresAt: new Date(Date.now() + 900000).toISOString(), usuario: user() }); return
  }
  if (request.headers.authorization !== `Bearer ${token}` || !token) { send(401, { mensaje: 'Inicia sesión de nuevo.' }); return }
  if (path === '/api/auth/logout') { response.writeHead(204); response.end(); return }
  if (path === '/api/auth/me') {
    if (meStatus === 'network') { request.socket.destroy(); return }
    send(meStatus, meStatus === 200 ? user() : { mensaje: 'Error de validación de prueba.' }); return
  }
  if (path === '/api/admin/productos/categorias') { send(categoriesStatus, categoriesStatus === 200 ? [] : { mensaje: 'Categorías no disponibles en la prueba.' }); return }
  if (path === '/api/admin/productos') {
    if (expireOnProducts) { meStatus = 401; send(401, { mensaje: 'Inicia sesión de nuevo.' }); return }
    send(productsStatus, productsStatus === 200 ? { content: [], page: 0, size: 12, totalPages: 0, totalElements: 0 }
      : { mensaje: productsStatus === 403 ? 'No tienes permisos para esta operación.' : 'Error de carga de productos de prueba.' }); return
  }
  send(404, {})
})
let vite, firefox, browser, context
async function ready(url) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (await fetch(url).then(() => true).catch(() => false)) return
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error('El servidor temporal no inició.')
}
async function click(selector) {
  await browser.evaluate(context, `(() => { const node=document.querySelector(${JSON.stringify(selector)}); if(!node) throw new Error('Elemento no encontrado'); node.click(); return true })()`)
}
async function button(text) {
  await browser.evaluate(context, `(() => { const node=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}); if(!node) throw new Error('Botón no encontrado'); node.click(); return true })()`)
}
async function dashboard() {
  await click('.adminSidebar a[href="#/admin"]')
  await browser.wait(context, `!!document.querySelector('.adminStatCard[href="#/admin/productos"]')`, 'dashboard protegido')
}
async function products() { await click('.adminStatCard[href="#/admin/productos"]') }
async function productHeading() { await browser.wait(context, `document.querySelector('h1')?.textContent==='Productos'`, 'módulo Productos') }
async function login() {
  await browser.wait(context, `!!document.querySelector('#admin-email')`, 'login')
  await browser.evaluate(context, `(() => { for(const [id,value] of [['admin-email','navigation@example.test'],['admin-password','isolated-test-only']]) { const input=document.getElementById(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); } return true })()`)
  await browser.evaluate(context, `(() => { document.querySelector('form').requestSubmit(); return true })()`)
  await browser.wait(context, `!!document.querySelector('.adminStatCard[href="#/admin/productos"]')`, 'login y dashboard')
}
try {
  await new Promise((resolve, reject) => { api.once('error', reject); api.listen(apiPort, '127.0.0.1', resolve) })
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'], {
    env: { ...process.env, VITE_API_URL: `http://127.0.0.1:${apiPort}` }, stdio: 'ignore',
  })
  const profile = await mkdtemp(join(tmpdir(), 'segurixt-auth-firefox-'))
  firefox = spawn(process.env.FIREFOX_BINARY || 'firefox', ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', String(bidiPort)], { stdio: 'ignore' })
  await ready(`${origin}/`)
  await ready(`http://127.0.0.1:${bidiPort}`)
  browser = await connectBrowser(`ws://127.0.0.1:${bidiPort}/session`)
  await browser.command('session.new', { capabilities: {} })
  context = (await browser.command('browsingContext.create', { type: 'tab' })).context
  await browser.command('browsingContext.navigate', { context, url: `${origin}/#/admin/productos`, wait: 'complete' })
  await browser.wait(context, `location.hash==='#/admin/login' && !!document.querySelector('#admin-email')`, 'redirección de acceso sin sesión')
  assert.equal(requests.filter(r => r.path.startsWith('/api/admin/')).length, 0)
  await login()
  await browser.evaluate(context, `(() => { window.__navigationMarker='same-document'; return true })()`)
  await products(); await productHeading()
  await browser.wait(context, `!!document.querySelector('table')`, 'productos cargados con Bearer')
  assert.equal(await browser.evaluate(context, 'window.__navigationMarker'), 'same-document', 'Navegar no debe recargar el documento')
  assert.ok(requests.filter(r => r.path.startsWith('/api/admin/')).every(r => r.authorization === `Bearer ${token}`))
  assert.equal(await browser.evaluate(context, `Object.values(localStorage).concat(Object.values(sessionStorage)).some(value=>value.includes(${JSON.stringify(token)}))`), false)

  // La regresión original: validar al navegar con 503/403/red no debe cerrar sesión.
  for (const status of [503, 403, 'network']) {
    await dashboard()
    const before = requests.filter(r => r.path.startsWith('/api/admin/productos')).length
    meStatus = status
    await products()
    await browser.wait(context, `!!document.querySelector('[role="alert"]') && document.body.textContent.includes('La sesión se conserva')`, 'error recuperable de validación')
    assert.equal(await browser.evaluate(context, 'location.hash'), '#/admin/productos')
    assert.equal(requests.filter(r => r.path.startsWith('/api/admin/productos')).length, before, 'No cargar datos sin verificar la sesión')
    meStatus = 200
    await button('Reintentar validación'); await productHeading()
    assert.equal(logins, 1, 'Reintentar no debe exigir otro login')
  }
  for (const status of [503, 403, 401]) {
    await dashboard()
    productsStatus = status
    await products(); await productHeading()
    await browser.wait(context, `!!document.querySelector('[role="alert"]')`, 'error de carga dentro del módulo')
    assert.equal(await browser.evaluate(context, 'location.hash'), '#/admin/productos')
    assert.equal(await browser.evaluate(context, 'window.__navigationMarker'), 'same-document')
    if (status === 401) assert.ok(await browser.evaluate(context, `document.body.textContent.includes('sesión sigue activa')`))
    productsStatus = 200
    await button('Reintentar')
    await browser.wait(context, `!!document.querySelector('table')`, 'recuperación de carga de productos')
    assert.equal(logins, 1)
  }
  for (const status of [404, 403, 503]) {
    await dashboard(); categoriesStatus = status
    await products(); await productHeading()
    await browser.wait(context, `document.body.textContent.includes('HTTP ${status}') && document.body.textContent.includes('Categorías no disponibles en la prueba.')`, 'código y causa del error de categorías')
    assert.equal(await browser.evaluate(context, 'location.hash'), '#/admin/productos')
    assert.ok(await browser.evaluate(context, `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Agregar producto')).disabled`))
    categoriesStatus = 200
    await button('Reintentar categorías')
    await browser.wait(context, `document.body.textContent.includes('No hay categorías activas') && !document.body.textContent.includes('HTTP ${status}')`, 'estado vacío real tras recuperar categorías')
    assert.equal(logins, 1)
  }
  await dashboard(); expireOnProducts = true
  await products()
  await browser.wait(context, `location.hash==='#/admin/login' && !!document.querySelector('#admin-email')`, '401 del módulo y /me sí invalidan sesión')
  meStatus = 200; productsStatus = 200; expireOnProducts = false; role = 'EDITOR'
  await login()
  await products(); await productHeading()
  assert.equal(await browser.evaluate(context, `!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Agregar producto'))`), true)
  await browser.evaluate(context, `(() => { location.hash='/admin/usuarios'; return true })()`)
  await browser.wait(context, `location.hash==='#/admin' && !!document.querySelector('.adminStatCard')`, 'restricción de autorización para EDITOR')
  await click('.adminSidebarBottom button')
  role = 'LECTOR'
  await login(); await products(); await productHeading()
  assert.equal(await browser.evaluate(context, `!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Agregar producto'))`), false)
  assert.equal(await browser.evaluate(context, `!!document.querySelector('.adminSidebar a[href="#/admin/usuarios"]')`), false)
  assert.equal(await browser.evaluate(context, `!!document.querySelector('.adminSidebar a[href="#/admin/empresa"]')`), false)
  await browser.evaluate(context, `(() => { location.hash='/admin/usuarios'; return true })()`)
  await browser.wait(context, `location.hash==='#/admin' && !!document.querySelector('.adminStatCard')`, 'restricción de autorización para LECTOR')
  console.log('Firefox OK: Dashboard → Productos sin recarga; acceso sin sesión; 503/403/red recuperables; categorías 404/403/503 con diagnóstico y reintento; 401 confirmado; Bearer; autorización EDITOR; token solo en memoria.')
} finally {
  if (browser) {
    if (context) await browser.command('browsingContext.close', { context }).catch(() => {})
    await browser.command('session.end').catch(() => {})
    browser.close()
  }
  vite?.kill('SIGTERM')
  firefox?.kill('SIGTERM')
  api.closeAllConnections()
  await new Promise(resolve => api.close(resolve))
}
