import { build } from '/home/claude/frontend_project/Frontend/node_modules/esbuild/lib/main.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true })
fs.mkdirSync(path.join(__dirname, 'dist/assets'), { recursive: true })

let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
html = html.replace('/src/main.tsx', '/assets/main.js')
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html)

const result = await build({
  entryPoints: [path.join(__dirname, 'src/main.tsx')],
  bundle: true,
  format: 'esm',
  outfile: path.join(__dirname, 'dist/assets/main.js'),
  minify: false,
  sourcemap: false,
  jsx: 'automatic',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.css': 'empty',  // skip CSS for now
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.VITE_API_URL': '"/api"',
    'import.meta.env.MODE': '"production"',
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
    'import.meta.env.SSR': 'false',
  },
  alias: {
    '@': path.join(__dirname, 'src'),
  },
  target: 'esnext',
  platform: 'browser',
})

if (result.errors.length > 0) {
  console.error('Build errors:', result.errors)
  process.exit(1)
}
console.log('Build complete!')
