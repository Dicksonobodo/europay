import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
  ]) {
    if (env[key]) process.env[key] = env[key]
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-app-api',
        configureServer(server) {
          server.middlewares.use('/api/withdrawal-requirement-email', async (request, response, next) => {
            if (request.method !== 'POST') {
              next()
              return
            }

            try {
              const chunks = []
              for await (const chunk of request) chunks.push(chunk)
              request.body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            } catch {
              response.statusCode = 400
              response.setHeader('Content-Type', 'application/json; charset=utf-8')
              response.end(JSON.stringify({ error: 'Invalid email request; no email was sent.' }))
              return
            }

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
              const { default: handler } = await import('./api/withdrawal-requirement-email.js')
              await handler(request, apiResponse)
            } catch {
              server.config.logger.error('Withdrawal requirement email handler failed.')
              if (!response.headersSent) {
                response.statusCode = 500
                response.setHeader('Content-Type', 'application/json; charset=utf-8')
                response.end(JSON.stringify({ error: 'Email delivery failed; no email was confirmed as sent.' }))
              }
            }
          })
          server.middlewares.use('/api/transfer', async (request, response, next) => {
            if (!['GET', 'POST'].includes(request.method)) {
              next()
              return
            }

            const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
            request.query = Object.fromEntries(url.searchParams.entries())
            if (request.method === 'POST') {
              try {
                const chunks = []
                for await (const chunk of request) chunks.push(chunk)
                request.body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
              } catch {
                response.statusCode = 400
                response.setHeader('Content-Type', 'application/json; charset=utf-8')
                response.end(JSON.stringify({ error: 'Invalid transfer request.' }))
                return
              }
            }

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
              const { default: handler } = await import('./api/transfer.js')
              await handler(request, apiResponse)
            } catch {
              server.config.logger.error('Transfer API handler failed.')
              if (!response.headersSent) {
                response.statusCode = 500
                response.setHeader('Content-Type', 'application/json; charset=utf-8')
                response.end(JSON.stringify({ error: 'Transfer failed. Please try again.' }))
              }
            }
          })
        },
      },
    ],
  }
})
