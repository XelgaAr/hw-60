import { Router } from 'express'
import { createResourceController } from '../controllers/resources.mjs'

export const createResourceRouter = (collection, param) => {
  const router = Router()
  const controller = createResourceController(collection, param)
  router.route('/').get(controller.list).post(controller.create)
  router.route(`/:${param}`).get(controller.get).put(controller.update).delete(controller.remove)
  return router
}
