// Flujo real de usuarios sobre una API/MySQL de pruebas. Nunca usar cuentas reales.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { connectBrowser } from './browser/bidiClient.mjs'
const origin = process.env.USERS_BROWSER_ORIGIN
const email = process.env.USERS_BROWSER_EMAIL
const password = process.env.USERS_BROWSER_PASSWORD
if (process.env.USERS_BROWSER_ISOLATED !== 'true' || !origin || !['localhost', '127.0.0.1'].includes(new URL(origin).hostname) || !email?.endsWith('@example.test') || !password) throw new Error('Esta prueba requiere una instancia local aislada, un ADMIN @example.test y USERS_BROWSER_ISOLATED=true.')
const browser = await connectBrowser(process.env.USERS_BROWSER_BIDI || 'ws://127.0.0.1:19223/session')
const traffic = []
browser.onEvent(event => {
  if (event.method === 'browsingContext.userPromptOpened') browser.command('browsingContext.handleUserPrompt', { context: event.params.context, accept: true }).catch(() => {})
  if (event.method === 'network.responseCompleted') {
    const url = new URL(event.params.request.url)
    if (url.pathname.startsWith('/api/')) traffic.push({ method: event.params.request.method, path: url.pathname, status: event.params.response.status })
  }
})
let admin, target
async function evaluate(context, expr) { return browser.evaluate(context, expr) }
async function wait(context, expr, label) { return browser.wait(context, expr, label) }
async function click(context, selector) { return evaluate(context, `(() => { document.querySelector(${JSON.stringify(selector)}).click(); return true })()`) }
async function button(context, text) { await browser.command('browsingContext.activate', { context }); await wait(context, `!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)} && !b.disabled)`, 'botón disponible'); return evaluate(context, `(() => { [...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click(); return true })()`) }
async function field(context, label, value) {
  await evaluate(context, `(() => { const parent=[...document.querySelectorAll('label')].find(l=>l.firstChild.textContent.trim()===${JSON.stringify(label)}); const node=parent.querySelector('input,select'); const proto=node.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(node,${JSON.stringify(value)}); node.dispatchEvent(new Event(node.tagName==='SELECT'?'change':'input',{bubbles:true})); return true })()`)
}
async function login(context, mail, pass) {
  await wait(context, `!!document.querySelector('#admin-email')`, 'login')
  await evaluate(context, `(() => { for(const [id,value] of ${JSON.stringify([['admin-email', mail], ['admin-password', pass]])}) { const node=document.getElementById(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value); node.dispatchEvent(new Event('input',{bubbles:true})); } return true })()`)
  await evaluate(context, `(() => { document.querySelector('form').requestSubmit(); return true })()`)
}
async function rowButton(text) {
  await browser.command('browsingContext.activate', { context: admin })
  await wait(admin, `!![...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes(${JSON.stringify(testEmail)}))`, 'fila objetivo')
  await evaluate(admin, `(() => { const row=[...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes(${JSON.stringify(testEmail)})); [...row.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click(); return true })()`)
  if (text === 'Cambiar rol' || text === 'Restablecer contraseña') await wait(admin, `!!document.querySelector('#user-security-title')`, 'formulario de seguridad cargado')
}
const testEmail = `users-browser-${Date.now()}@example.test`
const initial = 'usuario-browser-test-2026'
const replacement = 'usuario-browser-nueva-2026'
try {
  await browser.command('session.new', { capabilities: { alwaysMatch: { unhandledPromptBehavior: 'accept' } } })
  await browser.command('session.subscribe', { events: ['browsingContext.userPromptOpened', 'network.responseCompleted'] })
  admin = (await browser.command('browsingContext.create', { type: 'tab' })).context
  target = (await browser.command('browsingContext.create', { type: 'tab' })).context
  await browser.command('browsingContext.navigate', { context: admin, url: `${origin}/#/admin/login`, wait: 'complete' })
  await login(admin, email, password)
  await wait(admin, `!!document.querySelector('.adminSidebar a[href="#/admin/usuarios"]')`, 'ADMIN ve Usuarios')
  await click(admin, '.adminSidebar a[href="#/admin/usuarios"]')
  await wait(admin, `document.querySelector('h1')?.textContent==='Usuarios' && !!document.querySelector('table')`, 'listado de MySQL')
  await button(admin, '+ Crear usuario')
  await field(admin, 'Nombre *', 'Usuario navegador')
  await field(admin, 'Correo *', testEmail)
  await field(admin, 'Nueva contraseña *', initial)
  await field(admin, 'Confirmar contraseña *', initial)
  await button(admin, 'Guardar usuario')
  await wait(admin, `document.querySelector('tbody')?.textContent.includes(${JSON.stringify(testEmail)})`, 'usuario persistido')
  await rowButton('Editar')
  await wait(admin, `!!document.querySelector('#user-form-title')`, 'formulario edición')
  await field(admin, 'Nombre *', 'Usuario actualizado')
  await button(admin, 'Guardar usuario')
  await wait(admin, `!![...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes(${JSON.stringify(testEmail)}) && r.textContent.includes('Usuario actualizado'))`, 'edición persistida')
  await browser.command('browsingContext.navigate', { context: target, url: `${origin}/#/admin/login`, wait: 'complete' })
  await login(target, testEmail, initial)
  await wait(target, `!!document.querySelector('.adminSidebar')`, 'LECTOR entra al panel')
  assert.equal(await evaluate(target, `!!document.querySelector('.adminSidebar a[href="#/admin/usuarios"]')`), false)
  await click(target, '.adminSidebar a[href="#/admin/productos"]')
  await wait(target, `document.querySelector('h1')?.textContent==='Productos'`, 'LECTOR consulta productos')
  assert.equal(await evaluate(target, `!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Agregar producto'))`), false)
  await evaluate(target, `(() => { location.hash='/admin/usuarios'; return true })()`)
  await wait(target, `location.hash==='#/admin' && !!document.querySelector('.adminStatCard')`, 'LECTOR no accede por URL')
  await rowButton('Cambiar rol')
  await field(admin, 'Rol', 'EDITOR')
  await button(admin, 'Confirmar cambio')
  await wait(admin, `!document.querySelector('#user-security-title')`, 'rol actualizado')
  await click(target, '.adminSidebar a[href="#/admin/productos"]')
  await wait(target, `!!document.querySelector('#admin-email')`, 'rol invalida sesión anterior')
  await login(target, testEmail, initial)
  await wait(target, `!!document.querySelector('.adminSidebar')`, 'EDITOR inicia sesión')
  await click(target, '.adminSidebar a[href="#/admin/productos"]')
  await wait(target, `!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Agregar producto'))`, 'EDITOR ve alta de productos')
  assert.equal(await evaluate(target, `!!document.querySelector('.adminSidebar a[href="#/admin/usuarios"]')`), false)
  await rowButton('Desactivar')
  await wait(admin, `document.querySelector('tbody')?.textContent.includes('Inactivo')`, 'cuenta desactivada')
  await click(target, '.adminSidebar a[href="#/admin"]')
  await wait(target, `!!document.querySelector('#admin-email')`, 'desactivación invalida token')
  await rowButton('Activar')
  await wait(admin, `!document.querySelector('tbody')?.textContent.includes('Inactivo')`, 'cuenta reactivada')
  await login(target, testEmail, initial)
  await wait(target, `!!document.querySelector('.adminSidebar')`, 'login después de activar')
  await rowButton('Restablecer contraseña')
  await field(admin, 'Tu contraseña de administrador *', password)
  await field(admin, 'Nueva contraseña *', replacement)
  await field(admin, 'Confirmar contraseña *', replacement)
  await button(admin, 'Confirmar cambio')
  await wait(admin, `!document.querySelector('#user-security-title')`, 'reset confirmado')
  await click(target, '.adminSidebar a[href="#/admin/productos"]')
  await wait(target, `!!document.querySelector('#admin-email')`, 'reset invalida token')
  await login(target, testEmail, initial)
  await wait(target, `!!document.querySelector('.adminLoginCard [role="status"]')`, 'clave anterior rechazada')
  await login(target, testEmail, replacement)
  await wait(target, `!!document.querySelector('.adminSidebar')`, 'clave nueva permite login')
  await browser.command('browsingContext.setViewport', { context: admin, viewport: { width: 1365, height: 900 }, devicePixelRatio: 1 })
  const desktop = await browser.command('browsingContext.captureScreenshot', { context: admin })
  await writeFile('/tmp/segurixt-users-desktop.png', Buffer.from(desktop.data, 'base64'))
  await browser.command('browsingContext.setViewport', { context: admin, viewport: { width: 390, height: 844 }, devicePixelRatio: 1 })
  assert.ok(await evaluate(admin, `document.documentElement.scrollWidth<=innerWidth+1`))
  const mobile = await browser.command('browsingContext.captureScreenshot', { context: admin })
  await writeFile('/tmp/segurixt-users-mobile.png', Buffer.from(mobile.data, 'base64'))
  console.log('Firefox/MySQL aislado OK: CRUD, roles, navegación ADMIN/EDITOR/LECTOR, estado, reset con reautenticación, revocación y diseño responsive.')
  console.log('HTTP sin credenciales:', JSON.stringify(traffic.filter(r=>r.path.startsWith('/api/admin/usuarios'))))
} catch (error) {
  if (admin) console.error('Diagnóstico de prueba (sin campos sensibles):', await evaluate(admin, `({title:document.querySelector('h1')?.textContent,alerts:[...document.querySelectorAll('[role="alert"]')].map(n=>n.textContent),securityForm:!!document.querySelector('#user-security-title')})`).catch(()=>null))
  console.error('HTTP de prueba sin credenciales:', JSON.stringify(traffic.filter(r=>r.path.startsWith('/api/admin/usuarios'))))
  throw error
} finally {
  if (admin) await browser.command('browsingContext.close', { context: admin }).catch(() => {})
  if (target) await browser.command('browsingContext.close', { context: target }).catch(() => {})
  await browser.command('session.end').catch(() => {})
  browser.close()
}
