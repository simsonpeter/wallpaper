export type Orientation = 'landscape' | 'horizontal'

export type VerseWallpaper = {
  id: string
  reference: string
  text: string
  landscape: string
  horizontal: string
}

export type WallpaperCatalog = {
  title?: string
  description?: string
  verses: VerseWallpaper[]
}
