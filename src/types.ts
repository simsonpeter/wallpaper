export type VerseWallpaper = {
  id: string
  reference: string
  text: string
  portrait: string
}

export type WallpaperCatalog = {
  title?: string
  description?: string
  verses: VerseWallpaper[]
}
