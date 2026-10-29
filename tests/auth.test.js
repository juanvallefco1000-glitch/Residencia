import test from 'node:test'
import assert from 'node:assert/strict'
import { adminEnabled, createAuthClient } from '../src/services/admin/authService.js'
const user = { id: 1, nombre: 'Temporal', email: 'test@example.test', rol: 'ADMIN' }
const session = () => ({ token: 'test-token', expiresAt: new Date(Date.now() + 60000).toISOString(), usuario: user })
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
test('producción exige HTTPS y validación explícita', () => {
  assert.equal(adminEnabled('', true, 'true'), false)
  assert.equal(adminEnabled('https://api.example.test', true, undefined), false)
  assert.equal(adminEnabled('http://localhost:8080', true, 'true'), false)
  assert.equal(adminEnabled('https://api.example.test', true, 'true'), true)
})
test('login en memoria, validación con Bearer y logout', async () => {
  const calls = []
  const client = createAuthClient('https://api.example.test', true, async (url, options) => {
    calls.push({ url, options })
    return response(url.endsWith('/login') ? session() : url.endsWith('/me') ? user : null, url.endsWith('/logout') ? 204 : 200)
  })
  await client.login({ email: user.email, password: 'solo-test' })
  assert.equal(client.getSession().usuario, user)
  await client.validateSession()
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token')
  assert.equal(calls[1].options.credentials, 'omit')
  await client.logout()
  assert.equal(client.getSession(), null)
  assert.equal(calls[2].options.headers.Authorization, 'Bearer test-token')
})
test('401 elimina sesión y 403 conserva sesión', async () => {
  let status = 200
  const client = createAuthClient('https://api.example.test', true, async () => response(status === 200 ? session() : {}, status))
  await client.login({})
  status = 403
  await assert.rejects(client.adminRequest('/api/admin/usuarios'))
  assert.ok(client.getSession())
  status = 401
  await assert.rejects(client.adminRequest('/api/auth/me'))
  assert.equal(client.getSession(), null)
})
test('logout sin red borra memoria y comunica fallo', async () => {
  let online = true
  const client = createAuthClient('https://api.example.test', true, async () => { if (!online) throw Error(); return response(session()) })
  await client.login({}); online = false
  await assert.rejects(client.logout())
  assert.equal(client.getSession(), null)
})
test('deshabilitado no transmite credenciales', async () => {
  const client = createAuthClient('', false, () => assert.fail('No debe llamar fetch'))
  await assert.rejects(client.login({}))
})

test('fallos de red, 403 y 5xx al validar no borran una sesión existente', async () => {
  for (const status of [403, 500, 503, 'network']) {
    let checking = false
    const client = createAuthClient('https://api.example.test', true, async () => {
      if (!checking) return response(session())
      if (status === 'network') throw new TypeError('Failed to fetch')
      return response({ mensaje: 'Fallo temporal' }, status)
    })
    await client.login({}); checking = true
    const token = client.getSession().token
    await assert.rejects(client.validateSession(), error => error.status === (status === 'network' ? 0 : status))
    assert.equal(client.getSession().token, token)
  }
})
test('Dashboard → Productos: un 503 de productos conserva Bearer y sesión', async () => {
  const calls = []
  const client = createAuthClient('https://api.example.test', true, async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/login')) return response(session())
    if (url.endsWith('/me')) return response(user)
    return response({ mensaje: 'La base de datos no está disponible temporalmente.' }, 503)
  })
  await client.login({})
  await client.validateSession() // Dashboard
  await client.validateSession() // Navegación protegida a Productos
  await assert.rejects(client.adminRequest('/api/admin/productos?page=0'), error => error.status === 503)
  assert.equal(client.getSession().usuario.id, user.id)
  assert.equal(calls.at(-1).options.headers.Authorization, 'Bearer test-token')
})
test('403 del módulo conserva sesión sin consultar de nuevo /me', async () => {
  let checks = 0
  const client = createAuthClient('https://api.example.test', true, async url => {
    if (url.endsWith('/login')) return response(session())
    if (url.endsWith('/me')) { checks++; return response(user) }
    return response({}, 403)
  })
  await client.login({})
  await assert.rejects(client.adminRequest('/api/admin/productos'), error => error.status === 403)
  assert.ok(client.getSession())
  assert.equal(checks, 0)
})
test('401 del módulo requiere confirmar el rechazo del JWT en /me', async () => {
  for (const status of [200, 401, 503]) {
    const calls = []
    const client = createAuthClient('https://api.example.test', true, async url => {
      calls.push(url)
      if (url.endsWith('/login')) return response(session())
      if (url.endsWith('/me')) return response(status === 200 ? user : {}, status)
      return response({ mensaje: 'Inicia sesión de nuevo.' }, 401)
    })
    await client.login({})
    await assert.rejects(client.adminRequest('/api/admin/productos'), error => error.status === 401
      && (status === 200 ? /sesión sigue activa/.test(error.message) : status === 503 ? /No se pudo verificar/.test(error.message) : true))
    assert.equal(client.getSession() === null, status === 401)
    assert.equal(calls.filter(url => url.endsWith('/me')).length, 1)
  }
})
test('validaciones simultáneas comparten una única petición y permiten reintentar', async () => {
  let checks = 0
  let release
  const client = createAuthClient('https://api.example.test', true, async url => {
    if (url.endsWith('/login')) return response(session())
    checks++
    return new Promise(resolve => { release = () => resolve(response(user)) })
  })
  await client.login({})
  const first = client.validateSession()
  const second = client.validateSession()
  assert.equal(checks, 1)
  release()
  await Promise.all([first, second])
  const third = client.validateSession()
  assert.equal(checks, 2)
  release(); await third
})
test('401 de una petición antigua no cierra una sesión más reciente', async () => {
  let release
  let logins = 0
  const client = createAuthClient('https://api.example.test', true, async url => {
    if (url.endsWith('/login')) return response({ ...session(), token: `token-${++logins}` })
    return new Promise(resolve => { release = () => resolve(response({}, 401)) })
  })
  await client.login({})
  const stale = client.validateSession()
  await client.login({})
  release()
  await assert.rejects(stale, error => error.status === 401)
  assert.equal(client.getSession().token, 'token-2')
})
test('sesión expirada o ausente bloquea solicitudes sin transmitirlas', async () => {
  let calls = 0
  const client = createAuthClient('https://api.example.test', true, async () => {
    calls++
    return response({ ...session(), expiresAt: new Date(Date.now() - 1000).toISOString() })
  })
  await assert.rejects(client.adminRequest('/api/admin/productos'), error => error.status === 401)
  assert.equal(calls, 0)
  await client.login({})
  await assert.rejects(client.adminRequest('/api/admin/productos'), error => error.status === 401)
  assert.equal(client.getSession(), null)
  assert.equal(calls, 1)
})
test('cancelar una petición no borra la sesión y conserva AbortError', async () => {
  const cancelled = new DOMException('Aborted', 'AbortError')
  const client = createAuthClient('https://api.example.test', true, async url => {
    if (url.endsWith('/login')) return response(session())
    throw cancelled
  })
  await client.login({})
  await assert.rejects(client.adminRequest('/api/admin/productos'), error => error === cancelled)
  assert.ok(client.getSession())
})
