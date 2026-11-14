import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { spawnSync } from 'node:child_process'
import { createPreview } from '../scripts/serve.mjs'

let server, url
before(async () => {
  const build = spawnSync(process.execPath, ['scripts/build.mjs'], { encoding: 'utf8' })
  assert.equal(build.status, 0, build.stderr)
  server = createPreview({ base: '/repository-check/' })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  url = `http://127.0.0.1:${server.address().port}`
})
after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
for (const path of ["index.html", "styles.css", "base.css", "app.js", "favicon.svg", "config.js", "domain/resources.mjs", "domain/seed.mjs"]) {
  test(`static HTTP: /repository-check/${path}`, async () => {
    const response = await fetch(`${url}/repository-check/${path}`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.ok((await response.arrayBuffer()).byteLength > 0)
    assert.ok(response.headers.get('content-type'))
  })
}
test('static HTTP: index and HEAD response', async () => {
  assert.equal((await fetch(`${url}/repository-check/`)).status, 200)
  const head = await fetch(`${url}/repository-check/index.html`, { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  assert.ok(Number(head.headers.get('content-length')) > 0)
})
test('static HTTP: unknown paths and paths outside repository are 404', async () => {
  assert.equal((await fetch(`${url}/repository-check/missing`)).status, 404)
  assert.equal((await fetch(`${url}/index.html`)).status, 404)
})
test('static HTTP: unsafe path cannot escape the public root', async () => {
  const response = await fetch(`${url}/repository-check/..%2Fpackage.json`)
  assert.equal(response.status, 403)
})
test('static HTTP: invalid percent encoding is 400', async () => {
  assert.equal((await fetch(`${url}/repository-check/%ZZ`)).status, 400)
})
test('static HTTP: POST is not exposed', async () => {
  const response = await fetch(`${url}/repository-check/`, { method: 'POST' })
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'GET, HEAD')
})
