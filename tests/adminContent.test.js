import test from 'node:test'
import assert from 'node:assert/strict'
import { createContentService } from '../src/services/admin/contentAdminService.js'
import { createPublicApi } from '../src/services/publicApi.js'

test('content service sends authenticated transport payloads and preserves false and dates', async () => {
  const calls = []
  const service = createContentService('/api/admin/promociones', async (...args) => { calls.push(args); return [] })
  await service.list()
  await service.create({ titulo: 'Campaña', activo: false, fechaInicio: null })
  await service.update(7, { activo: true, fechaFin: '2026-11-06' })
  assert.equal(calls[0][0], '/api/admin/promociones')
  assert.equal(calls[1][1].method, 'POST')
  assert.deepEqual(JSON.parse(calls[1][1].body), { titulo: 'Campaña', activo: false, fechaInicio: null })
  assert.equal(calls[2][0], '/api/admin/promociones/7')
  assert.equal(calls[2][1].method, 'PUT')
})
test('public promotions use the real endpoint without caching', async () => {
  let call
  const api = createPublicApi('https://api.example', async (...args) => {
    call = args
    return { ok: true, json: async () => [{ id: 1, titulo: 'Vigente' }] }
  })
  assert.equal((await api.obtenerPromociones())[0].titulo, 'Vigente')
  assert.equal(call[0], 'https://api.example/api/promociones')
  assert.equal(call[1].cache, 'no-store')
})
