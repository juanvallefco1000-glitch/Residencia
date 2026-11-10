import { defineConfig, loadEnv } from 'vite'
import { frontendBase } from './scripts/deploy-config.mjs'
import react from '@vitejs/plugin-react'
import { company } from './src/config/company.js'

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

export default defineConfig(({ command, mode, isPreview }) => ({
  base: frontendBase(process.env.VITE_BASE_PATH ?? loadEnv(mode, process.cwd(), 'VITE_').VITE_BASE_PATH, isPreview ? 'build' : command),
    server: {
  host: '127.0.0.1',
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:10002',
      changeOrigin: true,
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          const allowedOrigins = [
            'http://127.0.0.1:5173',
            'http://localhost:5173',
          ]

          if (allowedOrigins.includes(req.headers.origin)) {
            proxyReq.removeHeader('origin')
          }
        })
      },
    },
  },
},
  plugins: [
    react(),
    {
      name: 'company-metadata',
      transformIndexHtml(html) {
        return html
          .replaceAll('%COMPANY_TITLE%', escapeHtml(company.seo.title))
          .replaceAll('%COMPANY_DESCRIPTION%', escapeHtml(company.seo.description))
      },
    },
  ],
}))
