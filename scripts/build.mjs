import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = join(root, 'dist')
await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(join(root, 'public'), dist, { recursive: true })
await cp(join(root, 'src/domain'), join(dist, 'domain'), { recursive: true })
await writeFile(join(dist, '.nojekyll'), '')
console.log('Built Routebook: static demo with the shared collection logic; no Express server is embedded')
