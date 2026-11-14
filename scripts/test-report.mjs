import { spawnSync } from 'node:child_process'
import { mkdir, writeFile, readdir } from 'node:fs/promises'

const native = process.argv.includes('--native')
const args = native ? ['--test', ...(await readdir('tests')).filter((name) => name.endsWith('.test.mjs')).map((name) => `tests/${name}`)] : ['node_modules/vitest/vitest.mjs', 'run']
const env = { ...process.env, NO_COLOR: '1' }
delete env.FORCE_COLOR
const result = spawnSync(process.execPath, args, { encoding: 'utf8', env })
const text = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`
await mkdir('reports', { recursive: true })
const title = native ? 'Node.js native tests' : 'Original Vitest tests'
const escape = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const html = `<!doctype html><meta charset="utf-8"><title>${title}</title><style>body{margin:0;padding:40px;background:#101c2d;color:#dce9f5;font:13px/1.7 monospace}h1{font:600 24px Arial}p{color:#91a9c5}pre{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #32455e;padding:24px;border-radius:12px}</style><h1>${title}</h1><p>Node ${escape(process.version)} · Exit ${result.status ?? 1} · ${new Date().toISOString()}</p><pre>${escape(text)}</pre>`
await writeFile('reports/test-output.txt', text)
await writeFile('reports/test-report.html', html)
console.log(text)
let browser
try {
  const { chromium } = await import('playwright')
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  await page.setContent(html)
  await page.screenshot({ path: 'reports/tests.png', fullPage: true })
  console.log('Screenshot: reports/tests.png')
} catch (error) {
  console.error(`Screenshot not created: ${error.message}. Text and HTML reports are available.`)
} finally {
  await browser?.close()
}
process.exitCode = result.status ?? 1
