import { createCollection } from '../domain/resources.mjs'
import { articles } from '../domain/seed.mjs'
import { createResourceRouter } from './resource.mjs'

export default () => createResourceRouter(createCollection('title', articles), 'articleId')
