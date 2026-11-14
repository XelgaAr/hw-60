export const resourceError = (status) => Object.assign(new Error(status === 400 ? 'Bad Request' : 'Not Found'), { status })

export const createCollection = (field, seed = []) => {
  const items = new Map(seed.map(({ id, ...value }) => [id, { [field]: value[field] }]))
  const validate = (body) => {
    if (typeof body?.[field] !== 'string' || !body[field].trim())
      throw resourceError(400)
    return { [field]: body[field].trim() }
  }
  const get = (id) => {
    if (!items.has(id))
      throw resourceError(404)
    return { id, ...items.get(id) }
  }
  return {
    all: () => Array.from(items, ([id, value]) => ({ id, ...value })),
    get,
    create: (body) => {
      const value = validate(body)
      const id = `${Date.now().toString(36)}-${globalThis.crypto.randomUUID()}`
      items.set(id, value)
      return { id, ...value }
    },
    update: (id, body) => {
      get(id)
      const value = validate(body)
      items.set(id, value)
      return { id, ...value }
    },
    remove: (id) => {
      if (!items.delete(id))
        throw resourceError(404)
    }
  }
}
