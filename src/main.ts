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
const versesBtn = document.querySelector<HTMLButtonElement>('#verses-btn')!
const sheet = document.querySelector<HTMLElement>('#sheet')!
const sheetBackdrop = document.querySelector<HTMLElement>('#sheet-backdrop')!
const sheetClose = document.querySelector<HTMLButtonElement>('#sheet-close')!
const toast = document.querySelector<HTMLParagraphElement>('#toast')!

catalogLink.href = GITHUB_REPO_URL

let verses: VerseWallpaper[] = []
let selectedId = params.get('v') ?? ''
let orientation: Orientation =
  params.get('o') === 'horizontal' ? 'horizontal' : 'landscape'
let toastTimer = 0

function selectedVerse(): VerseWallpaper | undefined {
  return verses.find((verse) => verse.id === selectedId) ?? verses[0]
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
  const url = wallpaperUrl(verse, orientation)
  verseRef.textContent = verse.reference
  verseText.textContent = verse.text
  fallbackRef.textContent = verse.reference
  fallbackText.textContent = verse.text
  preview.classList.toggle('is-horizontal', orientation === 'horizontal')
  downloadBtn.disabled = !url
  shareBtn.disabled = false

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

  const url = wallpaperUrl(verse, orientation)
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

async function shareWallpaper() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }

  const imageUrl = wallpaperUrl(verse, orientation)
  const pageUrl = new URL(location.href)
  const payload = {
    title: `${verse.reference} wallpaper`,
    text: `${verse.reference} — ${verse.text}`,
    url: imageUrl || pageUrl.toString(),
  }

  if (navigator.share) {
    try {
      await navigator.share(payload)
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
    }
  }

  const copied = imageUrl || pageUrl.toString()
  try {
    await navigator.clipboard.writeText(copied)
    showToast('Link copied.')
  } catch {
    showToast(copied)
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
    orientation = button.dataset.orientation === 'horizontal' ? 'horizontal' : 'landscape'
    renderPreview()
  })
})

downloadBtn.addEventListener('click', () => {
  void downloadWallpaper()
})

shareBtn.addEventListener('click', () => {
  void shareWallpaper()
})

versesBtn.addEventListener('click', () => {
  setSheetOpen(true)
})

sheetBackdrop.addEventListener('click', () => {
  setSheetOpen(false)
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
