import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApp } from '../../src/app.mjs'

const open = async (t) => {
  const server = createApp().listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
  const url = `http://127.0.0.1:${server.address().port}`
  return (path, options) => fetch(url + path, options)
}
test('root route returns exact text and hardened headers', async (t) => {
  const request = await open(t)
  const response = await request('/')
  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'Get root route')
  assert.match(response.headers.get('content-type'), /text\/plain/)
  assert.equal(response.headers.get('x-powered-by'), null)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
})
for (const [path, field] of [['users', 'name'], ['articles', 'title']]) {
  test(`${path}: real HTTP CRUD and status codes`, async (t) => {
    const request = await open(t)
    const list = await request(`/${path}`)
    assert.equal(list.status, 200)
    assert.ok((await list.json()).length)
    const created = await request(`/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: 'New entry' }) })
    assert.equal(created.status, 201)
    const value = await created.json()
    assert.equal(created.headers.get('location'), `/${path}/${value.id}`)
    const one = await request(`/${path}/${value.id}`)
    assert.deepEqual(await one.json(), value)
    const updated = await request(`/${path}/${value.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: 'Updated entry' }) })
    assert.equal(updated.status, 200)
    assert.deepEqual(await updated.json(), { id: value.id, [field]: 'Updated entry' })
    const removed = await request(`/${path}/${value.id}`, { method: 'DELETE' })
    assert.equal(removed.status, 204)
    assert.equal(await removed.text(), '')
    assert.equal((await request(`/${path}/${value.id}`)).status, 404)
  })
  for (const method of ['POST', 'PUT']) {
    test(`${path}: ${method} rejects whitespace and missing data`, async (t) => {
      const request = await open(t)
      const pathId = method === 'PUT' ? `/${(await (await request(`/${path}`)).json())[0].id}` : ''
      for (const body of [{}, { [field]: '   ' }, { [field]: null }, { [field]: 10 }]) {
        const response = await request(`/${path}${pathId}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        assert.equal(response.status, 400)
        assert.equal(await response.text(), 'Bad Request')
      }
    })
  }
  for (const method of ['GET', 'PUT', 'DELETE']) {
    test(`${path}: ${method} missing resource returns 404`, async (t) => {
      const request = await open(t)
      const response = await request(`/${path}/absent`, { method, ...(method === 'PUT' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: 'Valid' }) } : {}) })
      assert.equal(response.status, 404)
      assert.equal(await response.text(), 'Not Found')
    })
  }
}
test('malformed JSON is 400, oversized JSON is 413, unknown route is 404', async (t) => {
  const request = await open(t)
  assert.equal((await request('/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' })).status, 400)
  assert.equal((await request('/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x'.repeat(40000) }) })).status, 413)
  assert.equal((await request('/unknown')).status, 404)
})
test('unexpected route error reaches the global 500 middleware', async (t) => {
  const request = await open(t)
  t.mock.method(console, 'error', () => {})
  t.mock.method(globalThis.crypto, 'randomUUID', () => { throw new Error('Private test failure') })
  const response = await request('/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"Test"}' })
  assert.equal(response.status, 500)
  assert.equal(await response.text(), 'Internal Server Error')
})
test('live demo and shared domain modules are served', async (t) => {
  const request = await open(t)
  for (const path of ['/demo/', '/demo/styles.css', '/demo/app.js', '/demo/domain/resources.mjs'])
    assert.equal((await request(path)).status, 200)
  assert.equal(await (await request('/demo/config.js')).text(), 'export const live = true')
})
