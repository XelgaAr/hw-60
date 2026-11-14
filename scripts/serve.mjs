import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const createPreview = ({ root = fileURLToPath(new URL('../dist/', import.meta.url)), base = '/' } = {}) => {
  const folder = resolve(root)
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.gz': 'application/gzip', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png' }
  return createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method Not Allowed')
        return
      }
      if (!pathname.startsWith(base) || pathname.includes('\0')) {
        res.writeHead(404).end('Not Found')
        return
      }
      let path = resolve(folder, pathname.slice(base.length) || 'index.html')
      if (path !== folder && !path.startsWith(folder + sep)) {
        res.writeHead(403).end('Forbidden')
        return
      }
      if ((await stat(path)).isDirectory())
        path = resolve(path, 'index.html')
      const content = await readFile(path)
      res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Content-Length': content.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' })
      res.end(req.method === 'HEAD' ? undefined : content)
    } catch (error) {
      const status = error instanceof URIError ? 400 : ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500
      res.writeHead(status).end(status === 400 ? 'Bad Request' : status === 404 ? 'Not Found' : 'Internal Server Error')
    }
  })
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const index = process.argv.indexOf('--port')
  const port = Number(index < 0 ? process.env.PORT ?? 4173 : process.argv[index + 1])
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('Invalid port')
  const server = createPreview()
  server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${server.address().port}/`))
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
}
