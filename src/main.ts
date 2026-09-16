import './style.css'
import { GITHUB_REPO_URL } from './config.ts'
import { fileNameFor, loadCatalog, wallpaperUrl } from './catalog.ts'
import type { VerseWallpaper } from './types.ts'

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
const setWallpaperBtn = document.querySelector<HTMLButtonElement>('#set-wallpaper-btn')!
const shareBtn = document.querySelector<HTMLButtonElement>('#share-btn')!
const shareSheet = document.querySelector<HTMLElement>('#share-sheet')!
const wallpaperSheet = document.querySelector<HTMLElement>('#wallpaper-sheet')!
const wallpaperCloseBtn = document.querySelector<HTMLButtonElement>('#wallpaper-close-btn')!
const iosSteps = document.querySelector<HTMLElement>('#ios-steps')!
const androidSteps = document.querySelector<HTMLElement>('#android-steps')!
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
const installBtn = document.querySelector<HTMLButtonElement>('#install-btn')!
const splash = document.querySelector<HTMLElement>('#splash')!
const screen = document.querySelector<HTMLElement>('.screen')!
const refreshIndicator = document.querySelector<HTMLElement>('#refresh-indicator')!
const refreshLabel = document.querySelector<HTMLElement>('#refresh-label')!

catalogLink.href = GITHUB_REPO_URL

document.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

function lockViewport() {
  const viewport = window.visualViewport
  const height = Math.round(viewport?.height ?? window.innerHeight)
  const offsetTop = Math.round(viewport?.offsetTop ?? 0)
  document.documentElement.style.setProperty('--app-height', `${height}px`)
  const app = document.getElementById('app')
  if (app) {
    app.style.top = `${offsetTop}px`
    app.style.height = `${height}px`
  }
  if (window.scrollY !== 0 || window.scrollX !== 0) {
    window.scrollTo(0, 0)
  }
}

lockViewport()
window.visualViewport?.addEventListener('resize', lockViewport)
window.visualViewport?.addEventListener('scroll', lockViewport)
window.addEventListener('resize', lockViewport)
window.addEventListener('orientationchange', lockViewport)
window.addEventListener('scroll', () => window.scrollTo(0, 0), { passive: true })

document.addEventListener(
  'touchmove',
  (event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      event.preventDefault()
      return
    }
    if (target.closest('.verse-list, .share-sheet, .search')) {
      return
    }
    event.preventDefault()
  },
  { passive: false },
)

let verses: VerseWallpaper[] = []
let selectedId = params.get('v') ?? ''
let toastTimer = 0
let refreshing = false
let swipe: {
  id: number
  startX: number
  startY: number
  startAt: number
  axis: 'undecided' | 'x' | 'y'
} | null = null

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
  return wallpaperUrl(verse)
}

function anyGuideOpen(): boolean {
  return sheet.classList.contains('is-open') || !shareSheet.hidden || !wallpaperSheet.hidden
}

function setShareOpen(open: boolean) {
  shareSheet.hidden = !open
  if (open) {
    wallpaperSheet.hidden = true
    sheetBackdrop.hidden = false
  } else if (!anyGuideOpen()) {
    sheetBackdrop.hidden = true
  }
}

function setWallpaperGuideOpen(open: boolean) {
  wallpaperSheet.hidden = !open
  if (open) {
    shareSheet.hidden = true
    sheetBackdrop.hidden = false
    const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    iosSteps.classList.toggle('is-current', apple)
    androidSteps.classList.toggle('is-current', !apple)
  } else if (!anyGuideOpen()) {
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
  const next = new URLSearchParams({ v: verse.id })
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
  verseRef.textContent = verse.reference
  verseText.textContent = verse.text
  fallbackRef.textContent = verse.reference
  fallbackText.textContent = verse.text
  preview.classList.add('is-portrait')
  screen.classList.toggle('has-image', Boolean(url))
  downloadBtn.disabled = !url
  setWallpaperBtn.disabled = !url
  shareBtn.disabled = false
  prevBtn.disabled = verses.length < 2
  nextBtn.disabled = verses.length < 2

  if (url) {
    previewImage.hidden = false
    previewFallback.hidden = true
    previewImage.alt = `${verse.reference} wallpaper`
    previewImage.src = url
    fallbackNote.textContent = ''
  } else {
    previewImage.hidden = true
    previewImage.removeAttribute('src')
    previewFallback.hidden = false
    fallbackNote.textContent = `Add a portrait image link for ${verse.reference}.`
  }

  renderList(searchInput.value)
  syncUrl(verse)
}

async function downloadWallpaper(): Promise<boolean> {
  const verse = selectedVerse()
  if (!verse) {
    return false
  }

  const url = currentImageUrl(verse)
  if (!url) {
    showToast('Add an image link first.')
    return false
  }

  const filename = fileNameFor(verse, url)
  const fetchUrl = url.replace(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/,
    'https://cdn.jsdelivr.net/gh/$1/$2@$3/$4',
  )

  try {
    const response = await fetch(fetchUrl)
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
    return true
  } catch {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    link.rel = 'noreferrer'
    link.click()
    return true
  }
}

async function setAsWallpaper() {
  const saved = await downloadWallpaper()
  if (!saved) {
    return
  }
  setWallpaperGuideOpen(true)
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
  const filename = fileNameFor(verse, imageUrl)
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

downloadBtn.addEventListener('click', () => {
  void downloadWallpaper().then((saved) => {
    if (saved) {
      showToast('Saved to downloads.')
    }
  })
})

setWallpaperBtn.addEventListener('click', () => {
  void setAsWallpaper()
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
  setWallpaperGuideOpen(false)
  setSheetOpen(true)
})

function gesturesBlocked(): boolean {
  return anyGuideOpen() || document.documentElement.classList.contains('is-booting')
}

function resetSwipeTransform() {
  preview.classList.remove('is-dragging')
  preview.style.transform = ''
}

function setPullHint(distance: number, armed: boolean) {
  const visible = refreshing || distance > 8
  refreshIndicator.classList.toggle('is-visible', visible)
  refreshIndicator.classList.toggle('is-refreshing', refreshing)
  if (refreshing) {
    refreshLabel.textContent = 'Refreshing...'
    return
  }
  refreshLabel.textContent = armed ? 'Release to refresh' : 'Pull to refresh'
}

function endSwipe() {
  swipe = null
  if (!refreshing) {
    resetSwipeTransform()
    setPullHint(0, false)
  }
}

async function loadVerses() {
  const { catalog } = await loadCatalog()
  verses = catalog.verses
  statusEl.textContent = `${verses.length} verses`
  renderPreview()
}

async function refreshCatalog() {
  if (refreshing) {
    return
  }

  refreshing = true
  setPullHint(0, false)
  try {
    await loadVerses()
    showToast('Updated.')
  } catch (error) {
    statusEl.textContent =
      error instanceof Error ? error.message : 'Could not refresh.'
    showToast(error instanceof Error ? error.message : 'Could not refresh.')
  } finally {
    refreshing = false
    endSwipe()
  }
}

function pointerFromControl(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('button, a, input, .dock, .sheet, .share-sheet'))
}

previewImage.draggable = false

screen.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }
  if (gesturesBlocked() || refreshing || pointerFromControl(event.target)) {
    return
  }

  swipe = {
    id: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startAt: Date.now(),
    axis: 'undecided',
  }
  try {
    screen.setPointerCapture(event.pointerId)
  } catch {
    // Synthetic or already-released pointers cannot be captured.
  }
})

screen.addEventListener(
  'pointermove',
  (event) => {
    if (!swipe || event.pointerId !== swipe.id) {
      return
    }

    const dx = event.clientX - swipe.startX
    const dy = event.clientY - swipe.startY

    if (swipe.axis === 'undecided') {
      if (Math.hypot(dx, dy) < 12) {
        return
      }
      swipe.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      preview.classList.add('is-dragging')
    }

    event.preventDefault()

    if (swipe.axis === 'x') {
      const width = screen.clientWidth || 1
      const drag = Math.max(-width, Math.min(width, dx))
      preview.style.transform = `translateX(${drag}px)`
      setPullHint(0, false)
      return
    }

    const pull = Math.max(0, dy)
    const damped = Math.min(96, pull * 0.45)
    preview.style.transform = `translateY(${damped}px)`
    setPullHint(pull, pull > 64)
  },
  { passive: false },
)

function finishSwipe(event: PointerEvent) {
  if (!swipe || event.pointerId !== swipe.id) {
    return
  }

  const dx = event.clientX - swipe.startX
  const dy = event.clientY - swipe.startY
  const axis = swipe.axis
  const elapsed = Math.max(1, Date.now() - swipe.startAt)
  swipe = null

  if (axis === 'x') {
    const width = screen.clientWidth || 1
    const fast = Math.abs(dx) / elapsed > 0.45
    const far = Math.abs(dx) > Math.min(72, width * 0.18)
    if ((fast || far) && verses.length > 1) {
      goToVerse(dx < 0 ? 1 : -1)
    }
    resetSwipeTransform()
    setPullHint(0, false)
    return
  }

  if (axis === 'y' && dy > 64) {
    preview.classList.remove('is-dragging')
    preview.style.transform = 'translateY(28px)'
    void refreshCatalog()
    return
  }

  endSwipe()
}

screen.addEventListener('pointerup', finishSwipe)
screen.addEventListener('pointercancel', (event) => {
  if (!swipe || event.pointerId !== swipe.id) {
    return
  }
  endSwipe()
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
    !wallpaperSheet.hidden ||
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
  setWallpaperGuideOpen(false)
})

wallpaperCloseBtn.addEventListener('click', () => {
  setWallpaperGuideOpen(false)
})

sheetClose.addEventListener('click', () => {
  setSheetOpen(false)
})

let installPrompt: BeforeInstallPromptEvent | null = null

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  installPrompt = event
  installBtn.hidden = false
})

installBtn.addEventListener('click', async () => {
  if (!installPrompt) {
    return
  }
  await installPrompt.prompt()
  installPrompt = null
  installBtn.hidden = true
})

window.addEventListener('appinstalled', () => {
  installPrompt = null
  installBtn.hidden = true
})

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js')
}

const splashStarted = Date.now()
const minSplashMs = 5000

function hideSplash() {
  document.documentElement.classList.remove('is-booting')
  if (splash.hidden || splash.classList.contains('is-leaving')) {
    return
  }
  splash.classList.add('is-leaving')
  splash.setAttribute('aria-hidden', 'true')
  window.setTimeout(() => {
    splash.hidden = true
  }, 500)
}

function finishSplash() {
  const wait = Math.max(0, minSplashMs - (Date.now() - splashStarted))
  window.setTimeout(hideSplash, wait)
}

window.setTimeout(hideSplash, 10000)

try {
  await loadVerses()
} catch (error) {
  statusEl.textContent =
    error instanceof Error ? error.message : 'Could not load verses.'
} finally {
  finishSplash()
}
