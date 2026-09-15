import type { CropMode, Lang, VerseWallpaper } from './types.ts'

export const STORAGE = {
  favorites: 'tcw-favorites',
  lang: 'tcw-lang',
  crop: 'tcw-crop',
  rotateHours: 'tcw-rotate-hours',
  notify: 'tcw-notify',
  splashSeen: 'tcw-splash-seen',
  church: 'tcw-church',
  notifyDate: 'tcw-notify-date',
} as const

export const DEFAULT_CHURCH = 'New Jerusalem Church Belgium'

export function readString(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function writeString(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore quota / private mode.
  }
}

export function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE.favorites)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writeFavorites(ids: string[]) {
  writeString(STORAGE.favorites, JSON.stringify(ids))
}

export function todayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function verseOfTheDay(verses: VerseWallpaper[]): VerseWallpaper | undefined {
  if (verses.length === 0) {
    return undefined
  }
  const key = todayKey()
  let hash = 0
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return verses[hash % verses.length]
}

export function cdnUrl(url: string): string {
  return url.replace(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/,
    'https://cdn.jsdelivr.net/gh/$1/$2@$3/$4',
  )
}

export function displayRef(verse: VerseWallpaper, lang: Lang): string {
  return lang === 'en' ? verse.referenceEn || verse.reference : verse.reference
}

export function displayText(verse: VerseWallpaper, lang: Lang): string {
  return lang === 'en' ? verse.textEn || verse.text : verse.text
}

export function missingLabels(verse: VerseWallpaper): string[] {
  const missing: string[] = []
  if (!verse.landscape) {
    missing.push('landscape')
  }
  if (!verse.portrait) {
    missing.push('portrait')
  }
  return missing
}

export function nextSunday(from = new Date()): Date {
  const date = new Date(from)
  const add = date.getDay() === 0 ? 0 : 7 - date.getDay()
  date.setDate(date.getDate() + add)
  return date
}

export function sundayLabel(lang: Lang): string {
  const locale = lang === 'en' ? 'en-GB' : 'ta-IN'
  return nextSunday().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export async function loadBitmap(url: string): Promise<HTMLImageElement> {
  const response = await fetch(cdnUrl(url))
  if (!response.ok) {
    throw new Error('Could not load image')
  }
  const blob = await response.blob()
  const image = new Image()
  image.src = URL.createObjectURL(blob)
  await image.decode()
  return image
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  crop: CropMode,
) {
  const imageRatio = image.width / image.height
  const targetRatio = width / height
  let drawWidth = width
  let drawHeight = height
  let x = 0
  let y = 0

  if (imageRatio > targetRatio) {
    drawHeight = height
    drawWidth = height * imageRatio
    x = (width - drawWidth) / 2
  } else {
    drawWidth = width
    drawHeight = width / imageRatio
    y = crop === 'lock' ? 0 : (height - drawHeight) / 2
  }

  ctx.drawImage(image, x, y, drawWidth, drawHeight)
}

export async function exportCoverImage(options: {
  url: string
  width: number
  height: number
  crop: CropMode
  filename: string
  poster?: { church: string; date: string; verse: string }
}): Promise<void> {
  const image = await loadBitmap(options.url)
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not draw image')
  }

  ctx.fillStyle = '#0b0a08'
  ctx.fillRect(0, 0, options.width, options.height)
  drawCover(ctx, image, options.width, options.height, options.crop)

  if (options.poster) {
    const gradient = ctx.createLinearGradient(0, options.height * 0.62, 0, options.height)
    gradient.addColorStop(0, 'rgba(11, 10, 8, 0)')
    gradient.addColorStop(1, 'rgba(11, 10, 8, 0.88)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, options.height * 0.62, options.width, options.height * 0.38)
    ctx.fillStyle = '#e0c08a'
    ctx.font = `600 ${Math.round(options.width * 0.038)}px Outfit, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(options.poster.church, options.width / 2, options.height - options.height * 0.12)
    ctx.fillStyle = '#f6efe2'
    ctx.font = `500 ${Math.round(options.width * 0.028)}px Outfit, sans-serif`
    ctx.fillText(options.poster.date, options.width / 2, options.height - options.height * 0.075)
    ctx.fillStyle = '#c2b49a'
    ctx.font = `400 ${Math.round(options.width * 0.024)}px Outfit, sans-serif`
    ctx.fillText(options.poster.verse, options.width / 2, options.height - options.height * 0.04)
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next ? resolve(next) : reject(new Error('Could not export'))), 'image/jpeg', 0.92)
  })
  URL.revokeObjectURL(image.src)
  downloadBlob(blob, options.filename)
}

export function pageUrlFor(verseId: string, orientation: string, lang: Lang): string {
  const url = new URL(location.href)
  url.search = ''
  url.searchParams.set('v', verseId)
  url.searchParams.set('o', orientation)
  url.searchParams.set('lang', lang)
  return url.toString()
}
