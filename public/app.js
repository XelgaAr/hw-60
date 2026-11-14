import { live } from './config.js'
import { createCollection } from './domain/resources.mjs'
import * as seed from './domain/seed.mjs'

const $ = (selector) => document.querySelector(selector)
const labels = {
  users: { title: 'Пользователи', field: 'name', label: 'Имя', create: 'Новый пользователь', action: 'Создать пользователя →', example: 'Например, Alex Morgan' },
  articles: { title: 'Статьи', field: 'title', label: 'Название', create: 'Новая статья', action: 'Создать статью →', example: 'Например, A practical guide to REST' }
}
let collections = Object.fromEntries(Object.entries(labels).map(([key, value]) => [key, createCollection(value.field, seed[key])]))
let resource = 'users', editingId, deletingId, data = { users: [], articles: [] }, busy = false
$('#mode').lastChild.textContent = live ? ' Настоящий Express API' : ' Локальное демо'
$('#mode-note').textContent = live ? 'Запросы отправляются в Express API на этом сервере. Данные хранятся в Map до перезапуска.' : 'GitHub Pages / деморежим. Общая логика коллекций выполняется в браузере; это не Node.js-сервер. Изменения исчезнут при обновлении страницы.'
$('#reset').hidden = live
const call = async (method, path, body) => {
  if (live) {
    const response = await fetch(new URL(`..${path}`, location.href), { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), signal: AbortSignal.timeout(8000) })
    const type = response.headers.get('content-type') ?? ''
    return { status: response.status, body: response.status === 204 ? null : type.includes('application/json') ? await response.json() : await response.text(), type }
  }
  try {
    if (path === '/' && method === 'GET')
      return { status: 200, body: 'Get root route', type: 'text/plain' }
    const [, key, id] = path.split('/')
    const collection = collections[key]
    if (!collection)
      throw Object.assign(new Error('Not Found'), { status: 404 })
    const actions = id ? { GET: () => collection.get(id), PUT: () => collection.update(id, body), DELETE: () => collection.remove(id) } : { GET: () => collection.all(), POST: () => collection.create(body) }
    if (!actions[method])
      throw Object.assign(new Error('Not Found'), { status: 404 })
    return { status: method === 'POST' ? 201 : method === 'DELETE' ? 204 : 200, body: actions[method]() ?? null, type: method === 'DELETE' ? '' : 'application/json' }
  } catch (error) {
    return { status: error.status ?? 500, body: error.status ? error.message : 'Internal Server Error', type: 'text/plain' }
  }
}
const inspect = (method, path, result, elapsed) => {
  $('#request-label').textContent = `${method} ${path}`
  $('#response-code').textContent = result.status
  $('#response-code').classList.toggle('bad', result.status >= 400)
  $('#response-meta').textContent = `${live ? 'HTTP' : 'Локальный вызов'} · ${elapsed.toFixed(1)} ms · ${result.type || 'No Content'}`
  $('#response').textContent = result.status === 204 ? '(пустое тело ответа)' : typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)
}
const execute = async (method, path, body) => {
  const started = performance.now()
  const result = await call(method, path, body)
  inspect(method, path, result, performance.now() - started)
  return result
}
const render = () => {
  for (const key of ['users', 'articles']) {
    $(`#${key}-count`).textContent = String(data[key].length).padStart(2, '0')
    $(`#nav-${key}`).textContent = data[key].length
  }
  const query = $('#search').value.trim().toLocaleLowerCase()
  const field = labels[resource].field
  const shown = data[resource].filter((value) => `${value[field]} ${value.id}`.toLocaleLowerCase().includes(query))
  $('#rows').replaceChildren(...shown.map((value) => {
    const row = document.createElement('tr')
    row.innerHTML = '<td class="entry-value"></td><td class="entry-id"></td><td class="row-actions"><button type="button" data-action="edit">Изменить</button><button type="button" data-action="delete" aria-label="Удалить запись">×</button></td>'
    row.querySelector('.entry-value').textContent = value[field]
    row.querySelector('.entry-id').textContent = value.id
    row.querySelector('.entry-id').title = value.id
    for (const button of row.querySelectorAll('button')) {
      button.dataset.id = value.id
      button.disabled = busy
    }
    row.classList.toggle('editing', value.id === editingId)
    return row
  }))
  $('#empty').hidden = shown.length > 0
  $('#rows-count').textContent = `${shown.length} / ${data[resource].length} записей`
}
const refresh = async () => {
  const results = await Promise.all(['users', 'articles'].map((key) => call('GET', `/${key}`)))
  if (results.some((result) => result.status !== 200 || !Array.isArray(result.body)))
    throw new Error('Не удалось загрузить коллекции.')
  data = { users: results[0].body, articles: results[1].body }
  render()
}
const form = () => {
  const value = labels[resource]
  $('#form-title').textContent = editingId ? 'Изменить запись' : value.create
  $('#form-method').textContent = `${editingId ? 'PUT' : 'POST'} /${resource}${editingId ? '/:id' : ''}`
  $('#value-label').textContent = value.label
  $('#schema').textContent = JSON.stringify({ id: '…', [value.field]: '…' })
  $('#value').placeholder = value.example
  $('#save').textContent = editingId ? 'Сохранить изменения →' : value.action
  $('#cancel-edit').hidden = !editingId
}
const setBusy = (value) => {
  busy = value
  for (const button of document.querySelectorAll('main button, .sidebar button'))
    button.disabled = value
  $('#value').disabled = value
}
const showError = (error) => {
  $('#status').textContent = `Ошибка: ${error.message}. ${live ? 'Проверьте, что сервер запущен.' : ''}`
  $('#status').classList.add('error')
}
for (const button of document.querySelectorAll('[data-resource]')) {
  button.addEventListener('click', () => {
    resource = button.dataset.resource
    editingId = undefined
    $('#value').value = $('#search').value = ''
    $('#collection-title').textContent = labels[resource].title
    $('#field-heading').textContent = labels[resource].label
    $('#endpoint').textContent = `GET /${resource}`
    $('#search').placeholder = resource === 'users' ? 'Поиск по имени или ID' : 'Поиск по названию или ID'
    for (const item of document.querySelectorAll('[data-resource]')) {
      item.classList.toggle('active', item === button)
      item.setAttribute('aria-pressed', String(item === button))
    }
    form()
    render()
  })
}
$('#search').addEventListener('input', render)
$('#resource-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  setBusy(true)
  try {
    const result = await execute(editingId ? 'PUT' : 'POST', `/${resource}${editingId ? `/${editingId}` : ''}`, { [labels[resource].field]: $('#value').value })
    if (result.status >= 400) {
      $('#status').textContent = result.status === 400 ? 'Введите непустую строку.' : `Ошибка ${result.status}: ${result.body}`
      $('#status').classList.add('error')
      return
    }
    $('#status').textContent = editingId ? 'Изменения сохранены.' : 'Запись создана.'
    $('#status').classList.remove('error')
    editingId = undefined
    $('#value').value = ''
    form()
    await refresh()
  } catch (error) {
    showError(error)
  } finally {
    setBusy(false)
    render()
  }
})
$('#cancel-edit').addEventListener('click', () => { editingId = undefined; $('#value').value = ''; form(); render() })
$('#rows').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]')
  if (!button || busy)
    return
  const value = data[resource].find(({ id }) => id === button.dataset.id)
  if (button.dataset.action === 'edit') {
    editingId = value.id
    $('#value').value = value[labels[resource].field]
    form()
    render()
    $('#value').focus()
  } else {
    deletingId = value.id
    $('#delete-name').textContent = value[labels[resource].field]
    $('#confirm').returnValue = ''
    $('#confirm').showModal()
  }
})
$('#confirm').addEventListener('close', async () => {
  if ($('#confirm').returnValue !== 'delete' || !deletingId)
    return
  setBusy(true)
  try {
    const result = await execute('DELETE', `/${resource}/${deletingId}`)
    if (result.status !== 204)
      throw new Error(`${result.status}: ${result.body}`)
    if (editingId === deletingId) {
      editingId = undefined
      $('#value').value = ''
      form()
    }
    $('#status').textContent = 'Запись удалена.'
    $('#status').classList.remove('error')
    await refresh()
  } catch (error) {
    showError(error)
  } finally {
    deletingId = undefined
    setBusy(false)
    render()
  }
})
$('#refresh').addEventListener('click', async () => {
  setBusy(true)
  try {
    await execute('GET', `/${resource}`)
    await refresh()
  } catch (error) { showError(error) } finally { setBusy(false); render() }
})
for (const button of document.querySelectorAll('[data-probe]')) {
  button.addEventListener('click', async () => {
    setBusy(true)
    try {
      const type = button.dataset.probe
      await execute(type === 'invalid' ? 'POST' : 'GET', type === 'root' ? '/' : `/${resource}${type === 'missing' ? '/missing-resource' : ''}`, type === 'invalid' ? {} : undefined)
    } catch (error) { showError(error) } finally { setBusy(false); render() }
  })
}
$('#reset').addEventListener('click', async () => {
  collections = Object.fromEntries(Object.entries(labels).map(([key, value]) => [key, createCollection(value.field, seed[key])]))
  editingId = undefined
  $('#value').value = $('#search').value = ''
  $('#status').textContent = 'Начальные данные восстановлены.'
  $('#status').classList.remove('error')
  form()
  await refresh()
  await execute('GET', `/${resource}`)
})
try {
  await refresh()
  await execute('GET', '/users')
} catch (error) {
  showError(error)
}
