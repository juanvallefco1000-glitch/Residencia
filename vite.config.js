import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { company } from './src/config/company.js'

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

export default defineConfig({
  base: '/Residencia/',
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
})
