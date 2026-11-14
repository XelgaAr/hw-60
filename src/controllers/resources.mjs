export const createResourceController = (collection, param) => ({
  list: (req, res) => res.json(collection.all()),
  create: (req, res) => {
    const resource = collection.create(req.body)
    return res.status(201).location(`${req.baseUrl}/${resource.id}`).json(resource)
  },
  get: (req, res) => res.json(collection.get(req.params[param])),
  update: (req, res) => res.json(collection.update(req.params[param], req.body)),
  remove: (req, res) => {
    collection.remove(req.params[param])
    return res.status(204).end()
  }
})
