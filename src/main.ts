import './style.css'
import { GITHUB_REPO_URL } from './config.ts'
import { fileNameFor, loadCatalog, wallpaperUrl } from './catalog.ts'
import type { Orientation, VerseWallpaper } from './types.ts'

const params = new URLSearchParams(location.search)
const verseList = document.querySelector<HTMLUListElement>('#verse-list')!
const searchInput = document.querySelector<HTMLInputElement>('#search')!
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!
const catalogLink = document.querySelector<HTMLAnchorElement>('#catalog-link')!
const preview = document.querySelector<HTMLElement>('#preview')!
const previewImage = document.querySelector<HTMLImageElement>('#preview-image')!
const previewFallback = document.querySelector<HTMLElement>('#preview-fallback')!
const fallbackRef = document.querySelector<HTMLElement>('#fallback-ref')!
const fallbackText = document.querySelector<HTMLElement>('#fallback-text')!
const fallbackNote = document.querySelector<HTMLElement>('#fallback-note')!
const verseRef = document.querySelector<HTMLElement>('#verse-ref')!
const verseText = document.querySelector<HTMLElement>('#verse-text')!
const downloadBtn = document.querySelector<HTMLButtonElement>('#download-btn')!
const shareBtn = document.querySelector<HTMLButtonElement>('#share-btn')!
const shareSheet = document.querySelector<HTMLElement>('#share-sheet')!
const shareTextBtn = document.querySelector<HTMLButtonElement>('#share-text-btn')!
const shareImageBtn = document.querySelector<HTMLButtonElement>('#share-image-btn')!
const shareCancelBtn = document.querySelector<HTMLButtonElement>('#share-cancel-btn')!
const versesBtn = document.querySelector<HTMLButtonElement>('#verses-btn')!
const prevBtn = document.querySelector<HTMLButtonElement>('#prev-btn')!
const nextBtn = document.querySelector<HTMLButtonElement>('#next-btn')!
const sheet = document.querySelector<HTMLElement>('#sheet')!
const sheetBackdrop = document.querySelector<HTMLElement>('#sheet-backdrop')!
const sheetClose = document.querySelector<HTMLButtonElement>('#sheet-close')!
const toast = document.querySelector<HTMLParagraphElement>('#toast')!

catalogLink.href = GITHUB_REPO_URL

document.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

let verses: VerseWallpaper[] = []
let selectedId = params.get('v') ?? ''
let orientation: Orientation =
  params.get('o') === 'portrait' || params.get('o') === 'horizontal' ? 'portrait' : 'landscape'
let toastTimer = 0

function selectedVerse(): VerseWallpaper | undefined {
  return verses.find((verse) => verse.id === selectedId) ?? verses[0]
}

function selectedIndex(): number {
  const index = verses.findIndex((verse) => verse.id === selectedId)
  return index >= 0 ? index : 0
}

function goToVerse(step: number) {
  if (verses.length === 0) {
    return
  }

  const nextIndex = (selectedIndex() + step + verses.length) % verses.length
  selectedId = verses[nextIndex]?.id ?? selectedId
  renderPreview()
}

function snippet(text: string): string {
  return text.length > 88 ? `${text.slice(0, 85).trim()}...` : text
}

function setSheetOpen(open: boolean) {
  sheet.classList.toggle('is-open', open)
  sheet.inert = !open
  sheet.setAttribute('aria-hidden', open ? 'false' : 'true')
  sheetBackdrop.hidden = !open
}

function currentImageUrl(verse: VerseWallpaper): string {
  return wallpaperUrl(verse, orientation) || wallpaperUrl(verse, orientation === 'landscape' ? 'portrait' : 'landscape')
}

function setShareOpen(open: boolean) {
  shareSheet.hidden = !open
  if (open) {
    sheetBackdrop.hidden = false
  } else if (!sheet.classList.contains('is-open')) {
    sheetBackdrop.hidden = true
  }
}

function showToast(message: string) {
  toast.hidden = false
  toast.textContent = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.hidden = true
  }, 2400)
}

function syncUrl(verse: VerseWallpaper) {
  const next = new URLSearchParams({ v: verse.id, o: orientation })
  history.replaceState(null, '', `?${next.toString()}`)
}

function renderList(filter = '') {
  const query = filter.trim().toLowerCase()
  const matches = verses.filter((verse) => {
    const haystack = `${verse.reference} ${verse.text} ${verse.id}`.toLowerCase()
    return haystack.includes(query)
  })

  verseList.innerHTML = matches
    .map((verse) => {
      const active = verse.id === selectedId ? ' is-active' : ''
      return `
        <li>
          <button class="verse-btn${active}" type="button" data-id="${verse.id}">
            <strong>${verse.reference}</strong>
            <span>${snippet(verse.text)}</span>
          </button>
        </li>
      `
    })
    .join('')

  if (matches.length === 0) {
    verseList.innerHTML = '<li class="status">No verses match that search.</li>'
  }
}

function renderPreview() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }

  selectedId = verse.id
  const url = currentImageUrl(verse)
  const screen = document.querySelector<HTMLElement>('.screen')!
  verseRef.textContent = verse.reference
  verseText.textContent = verse.text
  fallbackRef.textContent = verse.reference
  fallbackText.textContent = verse.text
  preview.classList.toggle('is-portrait', orientation === 'portrait')
  screen.classList.toggle('has-image', Boolean(url))
  downloadBtn.disabled = !url
  shareBtn.disabled = false
  prevBtn.disabled = verses.length < 2
  nextBtn.disabled = verses.length < 2

  document.querySelectorAll<HTMLButtonElement>('.orient').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.orientation === orientation)
  })

  if (url) {
    previewImage.hidden = false
    previewFallback.hidden = true
    previewImage.alt = `${verse.reference} ${orientation} wallpaper`
    previewImage.src = url
    fallbackNote.textContent = ''
  } else {
    previewImage.hidden = true
    previewImage.removeAttribute('src')
    previewFallback.hidden = false
    fallbackNote.textContent = `Add a ${orientation} image link for ${verse.reference}.`
  }

  renderList(searchInput.value)
  syncUrl(verse)
}

async function downloadWallpaper() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }

  const url = currentImageUrl(verse)
  if (!url) {
    showToast('Add an image link first.')
    return
  }

  const filename = fileNameFor(verse, orientation, url)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Download failed')
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    link.click()
    URL.revokeObjectURL(objectUrl)
    showToast('Saved to downloads.')
  } catch {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    link.rel = 'noreferrer'
    link.click()
    showToast('Opened wallpaper.')
  }
}

async function sharePayload(payload: ShareData) {
  if (navigator.share) {
    try {
      await navigator.share(payload)
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return true
      }
    }
  }
  return false
}

async function shareTextOnly() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }

  const text = `${verse.reference}\n${verse.text}`
  setShareOpen(false)

  if (await sharePayload({ text })) {
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    showToast('Text copied.')
  } catch {
    showToast(text)
  }
}

async function shareImageOnly() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }

  const imageUrl = currentImageUrl(verse)
  if (!imageUrl) {
    showToast('Add an image link first.')
    return
  }

  setShareOpen(false)
  const filename = fileNameFor(verse, orientation, imageUrl)
  const fetchUrl = imageUrl.replace(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/,
    'https://cdn.jsdelivr.net/gh/$1/$2@$3/$4',
  )

  try {
    const response = await fetch(fetchUrl)
    if (!response.ok) {
      throw new Error('Could not load image')
    }
    const blob = await response.blob()
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
    const fileShare = { files: [file] }

    if (navigator.canShare?.(fileShare) && (await sharePayload(fileShare))) {
      return
    }
  } catch {
    // Fall through to the image URL.
  }

  if (await sharePayload({ url: imageUrl })) {
    return
  }

  try {
    await navigator.clipboard.writeText(imageUrl)
    showToast('Image link copied.')
  } catch {
    showToast(imageUrl)
  }
}

verseList.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.verse-btn')
  if (!button?.dataset.id) {
    return
  }
  selectedId = button.dataset.id
  renderPreview()
  setSheetOpen(false)
})

searchInput.addEventListener('input', () => {
  renderList(searchInput.value)
})

document.querySelectorAll<HTMLButtonElement>('.orient').forEach((button) => {
  button.addEventListener('click', () => {
    orientation = button.dataset.orientation === 'portrait' ? 'portrait' : 'landscape'
    renderPreview()
  })
})

downloadBtn.addEventListener('click', () => {
  void downloadWallpaper()
})

shareBtn.addEventListener('click', () => {
  const verse = selectedVerse()
  shareImageBtn.disabled = !verse || !currentImageUrl(verse)
  setShareOpen(true)
})

shareTextBtn.addEventListener('click', () => {
  void shareTextOnly()
})

shareImageBtn.addEventListener('click', () => {
  void shareImageOnly()
})

shareCancelBtn.addEventListener('click', () => {
  setShareOpen(false)
})

versesBtn.addEventListener('click', () => {
  setShareOpen(false)
  setSheetOpen(true)
})

prevBtn.addEventListener('click', () => {
  goToVerse(-1)
})

nextBtn.addEventListener('click', () => {
  goToVerse(1)
})

document.addEventListener('keydown', (event) => {
  if (
    sheet.classList.contains('is-open') ||
    !shareSheet.hidden ||
    event.target instanceof HTMLInputElement
  ) {
    return
  }
  if (event.key === 'ArrowLeft') {
    goToVerse(-1)
  }
  if (event.key === 'ArrowRight') {
    goToVerse(1)
  }
})

sheetBackdrop.addEventListener('click', () => {
  setSheetOpen(false)
  setShareOpen(false)
})

sheetClose.addEventListener('click', () => {
  setSheetOpen(false)
})

try {
  const { catalog } = await loadCatalog()
  verses = catalog.verses
  statusEl.textContent = `${verses.length} verses`
  renderPreview()
} catch (error) {
  statusEl.textContent =
    error instanceof Error ? error.message : 'Could not load verses.'
}
