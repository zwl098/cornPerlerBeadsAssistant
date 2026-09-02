export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MAX_IMAGE_EDGE = 8000

export const ACCEPT_ATTR = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/jpg'])
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp'])

export type FileRejectCode = 'type' | 'size' | 'empty' | 'decode' | 'dimension'

export type FileCheckResult =
  | { ok: true; mime: string }
  | { ok: false; code: FileRejectCode; message: string }

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  if (i < 0) return ''
  return name.slice(i + 1).toLowerCase()
}

export function normalizeMime(file: File): string {
  if (file.type === 'image/jpg') return 'image/jpeg'
  return file.type
}

export function displayFormat(mime: string, fileName: string): string {
  if (mime === 'image/png') return 'PNG'
  if (mime === 'image/webp') return 'WEBP'
  if (mime === 'image/jpeg') {
    return extensionOf(fileName) === 'jpg' ? 'JPG' : 'JPEG'
  }
  const ext = extensionOf(fileName).toUpperCase()
  return ext || '图片'
}

export function nameFromFile(fileName: string): string {
  const trimmed = fileName.trim()
  const i = trimmed.lastIndexOf('.')
  const base = (i > 0 ? trimmed.slice(0, i) : trimmed).trim()
  const name = base || '未命名图纸'
  return name.slice(0, 40)
}

export function inspectFile(file: File): FileCheckResult {
  if (!file || file.size <= 0) {
    return { ok: false, code: 'empty', message: '没有读到文件，请再选一次' }
  }

  const mime = normalizeMime(file)
  const ext = extensionOf(file.name)
  const typeOk = ALLOWED_MIME.has(mime) || ALLOWED_EXT.has(ext)

  if (!typeOk) {
    return { ok: false, code: 'type', message: '请选 PNG、JPG 或 WEBP 图片' }
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      code: 'size',
      message: '这张图有点大，换一张 20MB 以内的',
    }
  }

  const resolvedMime = ALLOWED_MIME.has(mime)
    ? mime === 'image/jpg'
      ? 'image/jpeg'
      : mime
    : ext === 'webp'
      ? 'image/webp'
      : ext === 'png'
        ? 'image/png'
        : 'image/jpeg'

  return { ok: true, mime: resolvedMime }
}

export type DecodedImage = {
  objectUrl: string
  width: number
  height: number
  mime: string
}

export async function decodeImageFile(file: File, mime: string): Promise<DecodedImage> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.decoding = 'async'

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('decode'))
      image.src = objectUrl
    })

    const width = image.naturalWidth
    const height = image.naturalHeight

    if (!width || !height) {
      throw new Error('decode')
    }

    if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE) {
      URL.revokeObjectURL(objectUrl)
      const error = new Error('dimension') as Error & { code: FileRejectCode }
      error.code = 'dimension'
      throw error
    }

    return { objectUrl, width, height, mime }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

export function isDimensionError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'dimension')
}
