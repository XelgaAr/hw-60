import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createApp } from './app.mjs'

const app = createApp()
const server = createServer(app)
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT ?? 3000)
  const host = process.env.HOST ?? '127.0.0.1'
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('PORT must be an integer between 0 and 65535')
  server.listen(port, host, () => console.log(`API: http://${host}:${server.address().port}/ | UI: /demo/`))
  server.on('error', (error) => {
    console.error(`${error.code ?? 'ERROR'}: ${error.message}`)
    process.exitCode = 1
  })
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close((error) => { process.exitCode = error ? 1 : 0 })
      setTimeout(() => server.closeAllConnections(), 5000).unref()
    })
  }
}
export { app, server }
