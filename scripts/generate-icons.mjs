/**
 * Generates favicon.ico, logo192.png, and logo512.png from src/assets/logo.png
 * Uses nearest-neighbor resizing to preserve pixel art style.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const sourceLogo = path.resolve(projectRoot, 'src/assets/logo.png')
const publicDir = path.resolve(projectRoot, 'public')

const NEAREST = sharp.kernel.nearest

async function generateIcons() {
  const inputBuffer = await fs.readFile(sourceLogo)

  // Generate favicon.ico (16, 32, 48 sizes)
  const faviconSizes = [16, 32, 48]
  const faviconBuffers = await Promise.all(
    faviconSizes.map((size) =>
      sharp(inputBuffer)
        .resize(size, size, { kernel: NEAREST })
        .png()
        .toBuffer()
    )
  )
  const icoBuffer = await toIco(faviconBuffers)
  await fs.writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer)
  console.log('Created public/favicon.ico')

  // Generate logo192.png
  await sharp(inputBuffer)
    .resize(192, 192, { kernel: NEAREST })
    .png()
    .toFile(path.join(publicDir, 'logo192.png'))
  console.log('Created public/logo192.png')

  // Generate logo512.png
  await sharp(inputBuffer)
    .resize(512, 512, { kernel: NEAREST })
    .png()
    .toFile(path.join(publicDir, 'logo512.png'))
  console.log('Created public/logo512.png')
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err)
  process.exit(1)
})
