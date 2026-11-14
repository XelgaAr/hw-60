import express from 'express'
import { fileURLToPath } from 'node:url'
import createRouter from './routes/index.mjs'
import { notFound, errorHandler } from './middleware/errors.mjs'

export const createApp = () => {
  const app = express()
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    })
    next()
  })
  app.use(express.json({ limit: '32kb' }))
  app.use(createRouter())
  app.get('/demo/config.js', (req, res) => res.type('js').send('export const live = true'))
  app.use('/demo/domain', express.static(fileURLToPath(new URL('./domain/', import.meta.url))))
  app.use('/demo', express.static(fileURLToPath(new URL('../public/', import.meta.url))))
  app.use(notFound)
  app.use(errorHandler)
  return app
}
