import { loadEnv } from 'vite'
import { validateFrontendProduction } from './deploy-config.mjs'
try {
  validateFrontendProduction({ ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env })
  console.log('Configuración pública de Vercel validada; no se han mostrado secretos.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
