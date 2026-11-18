import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import bankDirectoryHandler from './api/bank-directory.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'APIVERVE_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ]) {
    if (env[key]) process.env[key] = env[key]
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-bank-directory-api',
        configureServer(server) {
          server.middlewares.use('/api/bank-directory', async (request, response, next) => {
            if (request.method !== 'GET') {
              next()
              return
            }

            const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
            request.query = Object.fromEntries(url.searchParams.entries())
            const apiResponse = {
              status(statusCode) {
                response.statusCode = statusCode
                return this
              },
              setHeader(name, value) {
                response.setHeader(name, value)
              },
              json(body) {
                response.setHeader('Content-Type', 'application/json; charset=utf-8')
                response.end(JSON.stringify(body))
                return this
              },
            }

            try {
              await bankDirectoryHandler(request, apiResponse)
            } catch (error) {
              server.config.logger.error('Bank directory API handler failed.')
              if (!response.headersSent) {
                response.statusCode = 500
                response.setHeader('Content-Type', 'application/json; charset=utf-8')
                response.end(JSON.stringify({ error: 'Bank directory lookup failed. You can enter details manually.' }))
              }
            }
          })
        },
      },
    ],
  }
})
