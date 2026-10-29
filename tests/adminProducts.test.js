import test from 'node:test'
import assert from 'node:assert/strict'
import { createProductAdminService, validateImage } from '../src/services/admin/productAdminService.js'
import { createAuthClient } from '../src/services/admin/authService.js'

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
test('productos administrativos conservan filtros, paginación y cancelación', async () => {
  const calls = []
  const service = createProductAdminService(async (...args) => { calls.push(args); return { content: [] } })
  const controller = new AbortController()
  await service.list({ page: 2, size: 12, q: 'Cámara & Red', categoriaId: 3, activo: false }, { signal: controller.signal })
  const url = new URL(calls[0][0], 'https://example.test')
  assert.equal(url.searchParams.get('activo'), 'false')
  assert.equal(url.searchParams.get('q'), 'Cámara & Red')
  assert.equal(url.searchParams.get('categoriaId'), '3')
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(calls[0][1].signal, controller.signal)
})
test('CRUD e imágenes reutilizan Bearer y comunican los errores del servidor', async () => {
  const calls = []
  let fail = false
  const auth = createAuthClient('https://api.example.test', true, async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/login')) return response({ token: 'jwt-test', expiresAt: new Date(Date.now() + 60000).toISOString(), usuario: { rol: 'ADMIN' } })
    if (fail) return response({ mensaje: 'Slug duplicado.' }, 409)
    return response(options.method === 'DELETE' ? null : { id: 8 }, options.method === 'DELETE' ? 204 : 200)
  })
  await auth.login({})
  const service = createProductAdminService(auth.adminRequest)
  const product = { nombre: 'Cámara', activo: true, precio: null }
  await service.categories()
  await service.create(product)
  await service.update(8, product)
  await service.detail(8)
  await service.addImage(8, { nombreArchivo: 'camara.png', contenidoBase64: 'solo-test' })
  await service.removeImage(8, 5)
  await service.remove(8)
  for (const call of calls.slice(1)) {
    assert.equal(call.options.headers.Authorization, 'Bearer jwt-test')
    assert.equal(call.options.credentials, 'omit')
    assert.equal(call.options.cache, 'no-store')
  }
  assert.equal(calls[2].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[2].options.body), product)
  assert.equal(calls[3].options.method, 'PUT')
  assert.match(calls[6].url, /\/8\/imagenes\/5$/)
  assert.equal(calls[7].options.method, 'DELETE')
  fail = true
  await assert.rejects(service.create(product), /Slug duplicado/)
})
test('validación previa descarta formatos y tamaños inválidos de imágenes', () => {
  assert.equal(validateImage({ name: 'camara.png', type: 'image/png', size: 100 }), '')
  assert.equal(validateImage({ name: 'camara.JPG', type: 'image/jpeg', size: 3 * 1024 * 1024 }), '')
  assert.ok(validateImage({ name: 'camara.svg', type: 'image/svg+xml', size: 100 }))
  assert.ok(validateImage({ name: 'camara.png', type: 'image/png', size: 3 * 1024 * 1024 + 1 }))
  assert.ok(validateImage(null))
})

test('crear categoría usa POST protegido y conserva el error HTTP de la API', async () => {
  const calls = []
  const category = { nombre: 'Categoría nueva', slug: 'categoria-nueva', descripcion: '' }
  const service = createProductAdminService(async (path, options) => { calls.push({ path, options }); return { id: 9, ...category, activo: true } })
  const saved = await service.createCategory(category)
  assert.equal(calls[0].path, '/api/admin/productos/categorias')
  assert.equal(calls[0].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].options.body), category)
  assert.equal(saved.id, 9)
  const error = Object.assign(new Error('Categorías no disponibles'), { status: 503 })
  const failed = createProductAdminService(async () => { throw error })
  await assert.rejects(failed.categories(), e => e === error && e.status === 503)
})
