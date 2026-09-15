export type Orientation = 'landscape' | 'portrait'

export type VerseWallpaper = {
  id: string
  reference: string
  text: string
  landscape: string
  portrait: string
}

export type WallpaperCatalog = {
  title?: string
  description?: string
  verses: VerseWallpaper[]
}
