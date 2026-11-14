import { createCollection } from '../domain/resources.mjs'
import { users } from '../domain/seed.mjs'
import { createResourceRouter } from './resource.mjs'

export default () => createResourceRouter(createCollection('name', users), 'userId')
