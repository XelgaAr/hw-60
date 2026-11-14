import { readdir, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

let count = 0
for (const entry of await readdir('.', { recursive: true, withFileTypes: true })) {
  const path = resolve(entry.parentPath, entry.name)
  if (!entry.isFile() || /[/\\](node_modules|dist|reports|coverage|output)[/\\]/.test(path))
    continue
  if (/\.(mjs|js)$/.test(entry.name)) {
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' })
    if (result.status !== 0)
      throw new Error(result.stderr || result.error?.message || `Cannot check ${path}`)
    count++
  }
  if (entry.name.endsWith('.json')) {
    JSON.parse(await readFile(path, 'utf8'))
    count++
  }
}
console.log(`Syntax and JSON: ${count} files passed`)
