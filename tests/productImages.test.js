import test from 'node:test'
import assert from 'node:assert/strict'
import { primaryProductImage, resolveProductImage } from '../src/services/productImages.js'
test('elige la imagen principal real sin cambiar el orden de los datos', () => {
  const images = [{ url: '/otra.jpg' }, { url: '/principal.jpg', principal: true }]
  assert.equal(primaryProductImage(images), images[1]); assert.equal(images[0].url, '/otra.jpg')
  assert.equal(primaryProductImage([]), undefined)
})
test('resuelve imágenes públicas por API o proxy y respeta /Residencia/', () => {
  const path = '/api/productos/imagenes/imagen.png'
  assert.equal(resolveProductImage(path, 'https://api.example.test', '/Residencia/'), `https://api.example.test${path}`)
  assert.equal(resolveProductImage(path, '', '/Residencia/'), path)
  assert.equal(resolveProductImage('imagenes/camara.jpg', '', '/Residencia/'), '/Residencia/imagenes/camara.jpg')
  assert.equal(resolveProductImage('https://cdn.example.test/foto.png'), 'https://cdn.example.test/foto.png')
})
test('rechaza protocolos inseguros, rutas privadas y rutas de disco', () => {
  for (const path of ['file:///home/private.png', '/home/user/foto.jpg', '/var/uploads/foto.jpg', 'C:\\uploads\\foto.jpg', 'javascript:alert(1)', '//external.test/photo.jpg', '../private.jpg']) {
    assert.equal(resolveProductImage(path), '', path)
  }
})
