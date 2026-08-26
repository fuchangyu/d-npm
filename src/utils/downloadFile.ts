import axios from 'axios'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'

const DOWNLOAD_TIMEOUT = 120_000

function verifyIntegrity (filePath: string, integrity: string): boolean {
  const dashIndex = integrity.indexOf('-')
  if (dashIndex === -1) return false

  const algo = integrity.slice(0, dashIndex)
  const expected = integrity.slice(dashIndex + 1)
  const actual = crypto.createHash(algo).update(fs.readFileSync(filePath)).digest('base64')

  return actual === expected
}

function isGzipFile (filePath: string): boolean {
  const header = Buffer.alloc(2)
  const fd = fs.openSync(filePath, 'r')
  try {
    fs.readSync(fd, header, 0, 2, 0)
  } finally {
    fs.closeSync(fd)
  }
  return header[0] === 0x1f && header[1] === 0x8b
}

export async function downloadTgz (
  url: string,
  destPath: string,
  integrity?: string
): Promise<void> {
  const destDir = path.dirname(destPath)
  const tempPath = destPath + '.tmp'

  fs.mkdirSync(destDir, { recursive: true })

  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath)
  }

  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: DOWNLOAD_TIMEOUT,
      maxRedirects: 5,
      validateStatus: (status) => status === 200,
    })

    const contentLength = response.headers['content-length']

    await pipeline(response.data, fs.createWriteStream(tempPath))

    const { size } = fs.statSync(tempPath)

    if (size === 0) {
      throw new Error('Downloaded file is empty')
    }

    if (contentLength && parseInt(contentLength, 10) !== size) {
      throw new Error(`Incomplete download: expected ${contentLength} bytes, got ${size}`)
    }

    if (!isGzipFile(tempPath)) {
      throw new Error('Downloaded file is not a valid gzip archive')
    }

    if (integrity && !verifyIntegrity(tempPath, integrity)) {
      throw new Error('Integrity check failed')
    }

    fs.renameSync(tempPath, destPath)
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath)
    }
    throw error
  }
}
