import { Router } from 'express'
import createUsersRouter from './users.mjs'
import createArticlesRouter from './articles.mjs'

export default () => {
  const router = Router()
  router.get('/', (req, res) => res.type('text').send('Get root route'))
  router.use('/users', createUsersRouter())
  router.use('/articles', createArticlesRouter())
  return router
}
