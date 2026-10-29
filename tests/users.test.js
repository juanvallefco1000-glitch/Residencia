import test from 'node:test'
import assert from 'node:assert/strict'
import { canReadModule, canWriteModule, canDeleteProduct, passwordError } from '../src/services/admin/permissions.js'
import { createUserAdminService } from '../src/services/admin/userAdminService.js'
import { createAuthClient } from '../src/services/admin/authService.js'

test('ADMIN, EDITOR y LECTOR tienen navegación y acciones explícitas', () => {
  for (const role of ['ADMIN', 'EDITOR', 'LECTOR']) {
    assert.equal(canReadModule(role, 'usuarios'), role === 'ADMIN')
    assert.equal(canReadModule(role, 'empresa'), role === 'ADMIN')
    for (const module of ['dashboard', 'productos', 'servicios', 'promociones', 'cotizaciones']) assert.equal(canReadModule(role, module), true)
    assert.equal(canWriteModule(role, 'usuarios'), role === 'ADMIN')
    assert.equal(canWriteModule(role, 'productos'), role !== 'LECTOR')
    assert.equal(canDeleteProduct(role), role === 'ADMIN')
  }
  assert.equal(canReadModule(undefined, 'productos'), false)
  assert.equal(canWriteModule('OTRO', 'productos'), false)
})
test('política de contraseña valida caracteres, complejidad, confirmación y bytes UTF-8', () => {
  assert.equal(passwordError('contraseña-larga-2026', 'contraseña-larga-2026'), '')
  for (const bad of ['corta', 'a'.repeat(15), 'é'.repeat(36) + '1', 'a'.repeat(73), 'valida-muy-larga\n']) assert.ok(passwordError(bad, bad))
  assert.ok(passwordError('contraseña-larga-2026', 'otra'))
})
test('API de usuarios usa los endpoints separados sin mezclar perfil, rol y estado', async () => {
  const calls = []
  const service = createUserAdminService(async (path, options) => { calls.push({ path, options }); return { id: 7 } })
  const controller = new AbortController()
  await service.list({ page: 1, size: 12, q: 'Nombre & correo', rol: 'LECTOR', activo: false }, { signal: controller.signal })
  const url = new URL(calls[0].path, 'https://example.test')
  assert.equal(url.searchParams.get('rol'), 'LECTOR')
  assert.equal(url.searchParams.get('activo'), 'false')
  assert.equal(url.searchParams.get('q'), 'Nombre & correo')
  assert.equal(calls[0].options.signal, controller.signal)
  await service.detail(7)
  await service.create({ nombre: 'Prueba' })
  await service.update(7, { nombre: 'Nuevo', email: 'nuevo@example.test' })
  await service.role(7, 'EDITOR')
  await service.status(7, false)
  await service.resetPassword(7, { currentPassword: 'solo-fixture', password: 'solo-fixture-2026', confirmPassword: 'solo-fixture-2026' })
  assert.equal(calls[2].options.method, 'POST')
  assert.equal(calls[3].options.method, 'PUT')
  assert.deepEqual(JSON.parse(calls[3].options.body), { nombre: 'Nuevo', email: 'nuevo@example.test' })
  assert.equal(calls[4].path, '/api/admin/usuarios/7/rol')
  assert.equal(calls[4].options.method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[5].options.body), { activo: false })
  assert.equal(calls[6].path, '/api/admin/usuarios/7/password')
})
test('errores de usuarios 403/409/500 no cierran la sesión', async () => {
  for (const status of [403, 409, 500]) {
    const client = createAuthClient('https://example.test', true, async url => ({ ok: url.endsWith('/login'), status: url.endsWith('/login') ? 200 : status, json: async () => url.endsWith('/login') ? { token: 'fixture', expiresAt: new Date(Date.now() + 60000).toISOString(), usuario: { rol: 'ADMIN' } } : { mensaje: 'Operación rechazada' } }))
    await client.login({})
    await assert.rejects(createUserAdminService(client.adminRequest).status(7, false), e => e.status === status)
    assert.ok(client.getSession())
  }
})
