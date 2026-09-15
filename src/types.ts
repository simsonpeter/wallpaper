export type Orientation = 'landscape' | 'portrait'
export type Lang = 'ta' | 'en'
export type CropMode = 'home' | 'lock'
export type ListTab = 'all' | 'favorites' | 'today'

export type VerseWallpaper = {
  id: string
  reference: string
  text: string
  referenceEn: string
  textEn: string
  book: string
  topics: string[]
  landscape: string
  portrait: string
  portraitHome: string
  portraitLock: string
}

export type WallpaperCatalog = {
  title?: string
  description?: string
  verses: VerseWallpaper[]
}
