import test from 'node:test'
import assert from 'node:assert/strict'
import { createCollection } from '../src/domain/resources.mjs'
import { createResourceController } from '../src/controllers/resources.mjs'
import { errorHandler, notFound } from '../src/middleware/errors.mjs'
import * as seed from '../src/domain/seed.mjs'

for (const [resource, field] of [['users', 'name'], ['articles', 'title']]) {
  test(`${resource}: seeded Map returns independent records`, () => {
    const collection = createCollection(field, seed[resource])
    assert.ok(collection.all().length > 0)
    const first = collection.all()[0]
    assert.deepEqual(collection.get(first.id), first)
    first[field] = 'changed externally'
    assert.notEqual(collection.get(first.id)[field], first[field])
  })
  test(`${resource}: complete CRUD lifecycle`, () => {
    const collection = createCollection(field)
    const created = collection.create({ [field]: 'First value', id: 'ignored', extra: true })
    assert.equal(created[field], 'First value')
    assert.notEqual(created.id, 'ignored')
    assert.deepEqual(Object.keys(created).sort(), [field, 'id'].sort())
    assert.deepEqual(collection.get(created.id), created)
    assert.deepEqual(collection.update(created.id, { [field]: 'Updated' }), { id: created.id, [field]: 'Updated' })
    collection.remove(created.id)
    assert.deepEqual(collection.all(), [])
    assert.throws(() => collection.get(created.id), { status: 404, message: 'Not Found' })
  })
  test(`${resource}: trims whitespace and accepts Unicode`, () => {
    const collection = createCollection(field)
    const created = collection.create({ [field]: '  Привіт 🌍  ' })
    assert.equal(created[field], 'Привіт 🌍')
  })
  for (const value of [undefined, null, '', '   ', '\t\r\n', 0, false, [], {}, ['text']]) {
    test(`${resource}: rejects ${JSON.stringify(value)} for create and update`, () => {
      const collection = createCollection(field)
      const created = collection.create({ [field]: 'Original' })
      assert.throws(() => collection.create({ [field]: value }), { status: 400 })
      assert.throws(() => collection.update(created.id, { [field]: value }), { status: 400 })
      assert.deepEqual(collection.all(), [created])
    })
  }
  for (const body of [undefined, null, {}, 5, []]) {
    test(`${resource}: rejects invalid body ${JSON.stringify(body)}`, () => {
      assert.throws(() => createCollection(field).create(body), { status: 400 })
    })
  }
  test(`${resource}: missing IDs return 404`, () => {
    const collection = createCollection(field)
    assert.throws(() => collection.get('__proto__'), { status: 404 })
    assert.throws(() => collection.update('absent', { [field]: 'Value' }), { status: 404 })
    assert.throws(() => collection.remove('absent'), { status: 404 })
  })
  test(`${resource}: independent collections and returned objects`, () => {
    const first = createCollection(field, seed[resource])
    const second = createCollection(field, seed[resource])
    const created = first.create({ [field]: 'New' })
    created[field] = 'Mutation'
    assert.equal(first.get(created.id)[field], 'New')
    assert.equal(second.all().length, seed[resource].length)
  })
  test(`${resource}: IDs remain unique within the same millisecond`, (t) => {
    t.mock.method(Date, 'now', () => 123456)
    const collection = createCollection(field)
    const records = Array.from({ length: 1000 }, (_, n) => collection.create({ [field]: `Value ${n}` }))
    assert.equal(new Set(records.map(({ id }) => id)).size, 1000)
  })
  test(`${resource}: unexpected ID failure does not mutate the Map`, (t) => {
    const collection = createCollection(field)
    t.mock.method(Date, 'now', () => { throw new Error('Test internal error') })
    assert.throws(() => collection.create({ [field]: 'Value' }), /Test internal error/)
    assert.deepEqual(collection.all(), [])
  })
}
const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this },
  type(value) { this.contentType = value; return this },
  location(value) { this.locationHeader = value; return this },
  json(value) { this.body = value; return this },
  send(value) { this.body = value; return this },
  end() { this.body = undefined; return this }
})
test('controllers use 201 + Location, 200, and empty 204', () => {
  const controller = createResourceController(createCollection('name'), 'userId')
  const created = response()
  controller.create({ body: { name: 'Test' }, baseUrl: '/users' }, created)
  assert.equal(created.statusCode, 201)
  assert.equal(created.locationHeader, `/users/${created.body.id}`)
  const req = { params: { userId: created.body.id }, body: { name: 'Updated' } }
  const read = response()
  controller.get(req, read)
  assert.deepEqual(read.body, created.body)
  const updated = response()
  controller.update(req, updated)
  assert.equal(updated.body.name, 'Updated')
  const listed = response()
  controller.list({}, listed)
  assert.deepEqual(listed.body, [updated.body])
  const removed = response()
  controller.remove(req, removed)
  assert.equal(removed.statusCode, 204)
  assert.equal(removed.body, undefined)
})
test('unknown route handler returns a text 404', () => {
  const res = response()
  notFound({}, res)
  assert.equal(res.statusCode, 404)
  assert.equal(res.body, 'Not Found')
  assert.equal(res.contentType, 'text')
})
for (const [status, text] of [[400, 'Bad Request'], [404, 'Not Found'], [413, 'Payload Too Large'], [415, 'Unsupported Media Type'], [500, 'Internal Server Error'], [418, 'Internal Server Error']]) {
  test(`error middleware: ${status}`, (t) => {
    t.mock.method(console, 'error', () => {})
    const res = response()
    errorHandler(Object.assign(new Error('private details'), { status }), {}, res, () => assert.fail('Unexpected next'))
    assert.equal(res.statusCode, [500, 418].includes(status) ? 500 : status)
    assert.equal(res.body, text)
    assert.ok(!res.body.includes('private details'))
  })
}
test('error middleware delegates after headers are sent', () => {
  const error = new Error('original')
  let received
  errorHandler(error, {}, { headersSent: true }, (value) => { received = value })
  assert.equal(received, error)
})
