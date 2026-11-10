import test from 'node:test'
import assert from 'node:assert/strict'
import { frontendBase, validateFrontendProduction } from '../scripts/deploy-config.mjs'

test('base de Vercel es raíz y desarrollo/Pages conservan rutas configurables', () => {
  assert.equal(frontendBase(undefined, 'build'), '/')
  assert.equal(frontendBase(undefined, 'serve'), '/Residencia/')
  assert.equal(frontendBase(undefined, 'preview'), '/')
  assert.equal(frontendBase('/Residencia/', 'build'), '/Residencia/')
  for (const bad of ['https://example.com/', '//example/', '/ruta', '/a/../', '/?q=1']) assert.throws(() => frontendBase(bad))
})
test('build de Vercel exige origen público correcto y decisión explícita sobre ADMIN', () => {
  const valid = { VITE_API_URL: 'https://api.example.com', VITE_BASE_PATH: '/', VITE_ADMIN_AUTH_VALIDATED: 'false' }
  assert.doesNotThrow(() => validateFrontendProduction(valid))
  assert.doesNotThrow(() => validateFrontendProduction({ ...valid, VITE_ADMIN_AUTH_VALIDATED: 'true' }))
  for (const url of ['', 'http://api.example.com', 'https://localhost:8080', 'https://127.0.0.1', 'https://api.example.com/api', 'https://api.example.com?token=canary', 'https://user:canary@api.example.com']) {
    assert.throws(() => validateFrontendProduction({ ...valid, VITE_API_URL: url }), error => !error.message.includes('canary'))
  }
  assert.throws(() => validateFrontendProduction({ ...valid, VITE_BASE_PATH: '/Residencia/' }))
  assert.throws(() => validateFrontendProduction({ ...valid, VITE_ADMIN_AUTH_VALIDATED: undefined }))
})
