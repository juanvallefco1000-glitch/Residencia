import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicApi, resolveApiUrl } from '../src/services/publicApi.js'
import { localCatalog, adaptProduct } from '../src/services/catalogService.js'

test('HTTP conserva filtros, paginación y AbortSignal', async () => {
  const controller = new AbortController()
  let request
  const api = createPublicApi('http://localhost:8080', async (url, options) => {
    request = { url: new URL(url), options }
    return { ok: true, json: async () => ({ content: [], totalPages: 0, totalElements: 0, page: 1, size: 2 }) }
  })
  await api.obtenerProductos({ page: 1, size: 2, q: 'cámara & router', categoria: 'redes', destacado: false }, { signal: controller.signal })
  assert.equal(request.url.searchParams.get('q'), 'cámara & router')
  assert.equal(request.url.searchParams.get('destacado'), 'false')
  assert.equal(request.url.searchParams.get('categoria'), 'redes')
  assert.equal(request.url.searchParams.get('page'), '1')
  assert.equal(request.options.signal, controller.signal)
})

test('HTTP maneja conexión, abortos, respuestas inválidas y 404', async () => {
  const offline = createPublicApi('https://api.example.com', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(offline.obtenerCategoriasProducto(), /No se pudo conectar/)
  const notFound = createPublicApi('https://api.example.com', async () => ({ ok: false, status: 404 }))
  await assert.rejects(notFound.obtenerProductoPorId(99), error => error.status === 404)
  const abort = new DOMException('Aborted', 'AbortError')
  const cancelled = createPublicApi('https://api.example.com', async () => { throw abort })
  await assert.rejects(cancelled.obtenerServicios(), error => error === abort)
  const invalid = createPublicApi('https://api.example.com', async () => ({ ok: true, json: async () => ({ content: 'incorrecto' }) }))
  await assert.rejects(invalid.obtenerProductos(), /formato inesperado/)
})

test('catálogo local filtra, busca sin acentos y pagina sin precios inventados', () => {
  const result = localCatalog({ q: 'camara', categoria: 'videovigilancia' })
  assert.equal(result.totalElements, 1)
  assert.equal(result.products[0].price, null)
  const first = localCatalog({ size: 2, page: 0 })
  const second = localCatalog({ size: 2, page: 1 })
  assert.equal(first.totalPages, 3)
  assert(!second.products.some(p => first.products.some(f => f.id === p.id)))
  assert.equal(localCatalog({ q: 'inexistente' }).totalElements, 0)
})

test('respeta mostrar_precio y conserva categoría e imágenes remotas', () => {
  const dto = { id: 5, nombre: 'Router', categoria: { slug: 'redes', nombre: 'Redes' }, imagenes: [{ id: 9, url: 'imagen.png' }], precio: 500, mostrarPrecio: false }
  assert.equal(adaptProduct(dto).price, null)
  assert.equal(adaptProduct({ ...dto, mostrarPrecio: true }).price, 500)
  assert.equal(adaptProduct(dto).images[0].id, 9)
  assert.equal(adaptProduct(dto).categoryName, 'Redes')
})

test('producción nunca consulta localhost y admite futura API HTTPS', () => {
  assert.equal(resolveApiUrl('http://localhost:8080', true), '')
  assert.equal(resolveApiUrl('https://127.0.0.1:8080', true), '')
  assert.equal(resolveApiUrl('', true), '')
  assert.equal(resolveApiUrl('https://api.example.com/', true), 'https://api.example.com')
})
