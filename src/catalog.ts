import {
  GITHUB_CATALOG_URL,
  JSDELIVR_CATALOG_URL,
  LOCAL_CATALOG_URL,
} from './config.ts'
import type { Orientation, VerseWallpaper, WallpaperCatalog } from './types.ts'

function isFilled(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeVerse(raw: Partial<VerseWallpaper>, index: number): VerseWallpaper {
  const reference = isFilled(raw.reference) ? raw.reference.trim() : `Verse ${index + 1}`
  const id =
    isFilled(raw.id)
      ? raw.id.trim()
      : reference
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

  return {
    id,
    reference,
    text: isFilled(raw.text) ? raw.text.trim() : '',
    landscape: isFilled(raw.landscape) ? raw.landscape.trim() : '',
    horizontal: isFilled(raw.horizontal) ? raw.horizontal.trim() : '',
  }
}

async function fetchCatalog(url: string): Promise<WallpaperCatalog> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Could not load catalog from ${url}`)
  }

  const data = (await response.json()) as WallpaperCatalog
  if (!Array.isArray(data.verses)) {
    throw new Error('Catalog is missing a verses array')
  }

  return {
    title: data.title,
    description: data.description,
    verses: data.verses.map(normalizeVerse),
  }
}

export async function loadCatalog(): Promise<{
  catalog: WallpaperCatalog
  source: 'github' | 'local'
}> {
  const remoteSources = [GITHUB_CATALOG_URL, JSDELIVR_CATALOG_URL]

  for (const url of remoteSources) {
    try {
      const catalog = await fetchCatalog(url)
      if (catalog.verses.length > 0) {
        return { catalog, source: 'github' }
      }
    } catch {
      // Try the next source.
    }
  }

  const catalog = await fetchCatalog(LOCAL_CATALOG_URL)
  return { catalog, source: 'local' }
}

export function wallpaperUrl(verse: VerseWallpaper, orientation: Orientation): string {
  return orientation === 'landscape' ? verse.landscape : verse.horizontal
}

export function fileNameFor(verse: VerseWallpaper, orientation: Orientation, url: string): string {
  const cleanPath = url.split('?')[0] ?? url
  const extensionMatch = cleanPath.match(/\.(jpe?g|png|webp|gif|avif)$/i)
  const extension = extensionMatch?.[1]?.toLowerCase() ?? 'jpg'
  return `${verse.id}-${orientation}.${extension}`
}
