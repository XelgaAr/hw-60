import assert from 'node:assert/strict'
import { once } from 'node:events'
import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createPreview } from './serve.mjs'
import { createApp } from '../src/app.mjs'

assert.equal(spawnSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' }).status, 0)
await mkdir('reports', { recursive: true })
const servers = [createPreview({ base: '/repository-check/' }), createApp().listen(0, '127.0.0.1')]
servers[0].listen(0, '127.0.0.1')
let browser
try {
  await Promise.all(servers.map((server) => server.listening ? undefined : once(server, 'listening')))
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
  for (const [index, server] of servers.entries()) {
    const mode = index ? 'live' : 'static'
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`http://127.0.0.1:${server.address().port}/${index ? 'demo' : 'repository-check'}/`)
    await page.waitForFunction(() => document.querySelectorAll('#rows tr').length === 3)
    assert.match(await page.locator('#mode').innerText(), index ? /Express API/ : /Локальное демо/)
    for (const resource of ['users', 'articles']) {
      await page.locator(`[data-resource="${resource}"]`).click()
      const name = `Browser ${resource}`
      await page.locator('#value').fill(name)
      await page.locator('#save').click()
      await page.waitForFunction((text) => document.querySelector('#rows').innerText.includes(text), name)
      assert.equal(await page.locator('#response-code').innerText(), '201')
      await page.locator('#rows tr').filter({ hasText: name }).locator('[data-action="edit"]').click()
      await page.locator('#value').fill(`${name} updated`)
      await page.locator('#save').click()
      await page.waitForFunction((text) => document.querySelector('#rows').innerText.includes(text), `${name} updated`)
      assert.equal(await page.locator('#response-code').innerText(), '200')
      await page.locator('#search').fill('no-matching-record')
      assert.ok(await page.locator('#empty').isVisible())
      await page.locator('#search').fill('')
      await page.locator('#rows tr').filter({ hasText: `${name} updated` }).locator('[data-action="delete"]').click()
      await page.locator('#delete-confirm').click()
      await page.waitForFunction(() => document.querySelector('#response-code').textContent === '204')
      await page.waitForFunction(() => document.querySelectorAll('#rows tr').length === 3)
      await page.locator('#rows tr').first().locator('[data-action=delete]').click()
      await page.keyboard.press('Escape')
      await page.waitForFunction(() => !document.querySelector('#confirm').open)
      assert.equal(await page.locator('#rows tr').count(), 3)
    }
    for (const [probe, code] of [['invalid', '400'], ['missing', '404'], ['root', '200']]) {
      await page.locator(`[data-probe="${probe}"]`).click()
      await page.waitForFunction((value) => document.querySelector('#response-code').textContent === value, code)
    }
    await page.screenshot({ path: `reports/${mode}-desktop.png`, fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `reports/${mode}-mobile.png`, fullPage: true })
    assert.deepEqual(errors, [])
    await page.close()
    console.log(`Browser checks passed: ${mode}, users/articles CRUD, validation, 404, root, mobile layout`)
  }
} finally {
  await browser?.close()
  await Promise.all(servers.map((server) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() })))
}
