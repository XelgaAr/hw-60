import { STATUS_CODES } from 'node:http'

export const notFound = (req, res) => res.status(404).type('text').send('Not Found')
export const errorHandler = (error, req, res, next) => {
  if (res.headersSent)
    return next(error)
  const status = [400, 404, 413, 415].includes(error.status) ? error.status : 500
  if (status === 500)
    console.error(error)
  return res.status(status).type('text').send(STATUS_CODES[status])
}
