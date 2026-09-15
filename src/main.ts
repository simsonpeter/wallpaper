import './style.css'
import { GITHUB_REPO_URL } from './config.ts'
import { fileNameFor, loadCatalog, wallpaperUrl } from './catalog.ts'
import {
  DEFAULT_CHURCH,
  STORAGE,
  cdnUrl,
  displayRef,
  displayText,
  downloadBlob,
  exportCoverImage,
  missingLabels,
  pageUrlFor,
  readFavorites,
  readString,
  sundayLabel,
  verseOfTheDay,
  writeFavorites,
  writeString,
} from './features.ts'
import type { CropMode, Lang, ListTab, Orientation, VerseWallpaper } from './types.ts'

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
const moreSheet = document.querySelector<HTMLElement>('#more-sheet')!
const wallpaperSheet = document.querySelector<HTMLElement>('#wallpaper-sheet')!
const wallpaperCloseBtn = document.querySelector<HTMLButtonElement>('#wallpaper-close-btn')!
const iosSteps = document.querySelector<HTMLElement>('#ios-steps')!
const androidSteps = document.querySelector<HTMLElement>('#android-steps')!
const shareTextBtn = document.querySelector<HTMLButtonElement>('#share-text-btn')!
const shareImageBtn = document.querySelector<HTMLButtonElement>('#share-image-btn')!
const shareLinkBtn = document.querySelector<HTMLButtonElement>('#share-link-btn')!
const shareCancelBtn = document.querySelector<HTMLButtonElement>('#share-cancel-btn')!
const versesBtn = document.querySelector<HTMLButtonElement>('#verses-btn')!
const moreBtn = document.querySelector<HTMLButtonElement>('#more-btn')!
const moreCloseBtn = document.querySelector<HTMLButtonElement>('#more-close-btn')!
const favBtn = document.querySelector<HTMLButtonElement>('#fav-btn')!
const votdBtn = document.querySelector<HTMLButtonElement>('#votd-btn')!
const shuffleBtn = document.querySelector<HTMLButtonElement>('#shuffle-btn')!
const copyVerseBtn = document.querySelector<HTMLButtonElement>('#copy-verse-btn')!
const statusExportBtn = document.querySelector<HTMLButtonElement>('#status-export-btn')!
const posterBtn = document.querySelector<HTMLButtonElement>('#poster-btn')!
const notifyBtn = document.querySelector<HTMLButtonElement>('#notify-btn')!
const churchInput = document.querySelector<HTMLInputElement>('#church-input')!
const filterRow = document.querySelector<HTMLElement>('#filter-row')!
const cropSegment = document.querySelector<HTMLElement>('.crop-segment')!
const prevBtn = document.querySelector<HTMLButtonElement>('#prev-btn')!
const nextBtn = document.querySelector<HTMLButtonElement>('#next-btn')!
const sheet = document.querySelector<HTMLElement>('#sheet')!
const sheetBackdrop = document.querySelector<HTMLElement>('#sheet-backdrop')!
const sheetClose = document.querySelector<HTMLButtonElement>('#sheet-close')!
const toast = document.querySelector<HTMLParagraphElement>('#toast')!
const installBtn = document.querySelector<HTMLButtonElement>('#install-btn')!
const splash = document.querySelector<HTMLElement>('#splash')!

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
    if (target.closest('.verse-list, .share-sheet, .search, .chip-row, .field')) {
      return
    }
    event.preventDefault()
  },
  { passive: false },
)

let verses: VerseWallpaper[] = []
let selectedId = params.get('v') ?? ''
let orientation: Orientation =
  params.get('o') === 'portrait' || params.get('o') === 'horizontal' ? 'portrait' : 'landscape'
let lang: Lang = params.get('lang') === 'en' || readString(STORAGE.lang, 'ta') === 'en' ? 'en' : 'ta'
let crop: CropMode = readString(STORAGE.crop, 'home') === 'lock' ? 'lock' : 'home'
let listTab: ListTab = 'all'
let activeFilter = ''
let favorites = readFavorites()
let rotateHours = Number(readString(STORAGE.rotateHours, '0')) || 0
let rotateTimer = 0
let toastTimer = 0
let lastTap = 0
let swipeX = 0
let swipeY = 0

churchInput.value = readString(STORAGE.church, DEFAULT_CHURCH)

function selectedVerse(): VerseWallpaper | undefined {
  return verses.find((verse) => verse.id === selectedId) ?? verses[0]
}

function selectedIndex(): number {
  const index = verses.findIndex((verse) => verse.id === selectedId)
  return index >= 0 ? index : 0
}

function currentImageUrl(verse: VerseWallpaper): string {
  return (
    wallpaperUrl(verse, orientation, crop) ||
    wallpaperUrl(verse, orientation === 'landscape' ? 'portrait' : 'landscape', crop)
  )
}

function goToVerse(step: number) {
  if (verses.length === 0) {
    return
  }
  selectedId = verses[(selectedIndex() + step + verses.length) % verses.length]?.id ?? selectedId
  renderPreview()
}

function snippet(text: string): string {
  return text.length > 88 ? `${text.slice(0, 85).trim()}...` : text
}

function anyGuideOpen(): boolean {
  return (
    sheet.classList.contains('is-open') ||
    !shareSheet.hidden ||
    !wallpaperSheet.hidden ||
    !moreSheet.hidden
  )
}

function setSheetOpen(open: boolean) {
  sheet.classList.toggle('is-open', open)
  sheet.inert = !open
  sheet.setAttribute('aria-hidden', open ? 'false' : 'true')
  sheetBackdrop.hidden = !open
}

function setShareOpen(open: boolean) {
  shareSheet.hidden = !open
  if (open) {
    wallpaperSheet.hidden = true
    moreSheet.hidden = true
    sheetBackdrop.hidden = false
  } else if (!anyGuideOpen()) {
    sheetBackdrop.hidden = true
  }
}

function setMoreOpen(open: boolean) {
  moreSheet.hidden = !open
  if (open) {
    shareSheet.hidden = true
    wallpaperSheet.hidden = true
    setSheetOpen(false)
    sheetBackdrop.hidden = false
  } else if (!anyGuideOpen()) {
    sheetBackdrop.hidden = true
  }
}

function setWallpaperGuideOpen(open: boolean) {
  wallpaperSheet.hidden = !open
  if (open) {
    shareSheet.hidden = true
    moreSheet.hidden = true
    sheetBackdrop.hidden = false
    const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    iosSteps.classList.toggle('is-current', apple)
    androidSteps.classList.toggle('is-current', !apple)
  } else if (!anyGuideOpen()) {
    sheetBackdrop.hidden = true
  }
}

function closeGuides() {
  setSheetOpen(false)
  setShareOpen(false)
  setMoreOpen(false)
  setWallpaperGuideOpen(false)
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
  const next = new URLSearchParams({ v: verse.id, o: orientation, lang })
  history.replaceState(null, '', `?${next.toString()}`)
}

function isFavorite(id: string): boolean {
  return favorites.includes(id)
}

function filters(): string[] {
  const books = [...new Set(verses.map((verse) => verse.book).filter(Boolean))]
  const topics = [...new Set(verses.flatMap((verse) => verse.topics))]
  return [...books, ...topics]
}

function filteredVerses(): VerseWallpaper[] {
  const query = searchInput.value.trim().toLowerCase()
  const todayId = verseOfTheDay(verses)?.id
  return verses.filter((verse) => {
    if (listTab === 'favorites' && !isFavorite(verse.id)) {
      return false
    }
    if (listTab === 'today' && verse.id !== todayId) {
      return false
    }
    if (activeFilter) {
      const needle = activeFilter.toLowerCase()
      if (verse.book.toLowerCase() !== needle && !verse.topics.includes(needle)) {
        return false
      }
    }
    const haystack =
      `${verse.reference} ${verse.referenceEn} ${verse.text} ${verse.textEn} ${verse.book} ${verse.topics.join(' ')} ${verse.id}`.toLowerCase()
    return haystack.includes(query)
  })
}

function renderFilters() {
  filterRow.innerHTML = filters()
    .map((filter) => {
      const label = filter[0]!.toUpperCase() + filter.slice(1)
      const active = activeFilter === filter ? ' is-active' : ''
      return `<button type="button" class="chip${active}" data-filter="${filter}">${label}</button>`
    })
    .join('')
}

function renderList() {
  const matches = filteredVerses()
  verseList.innerHTML = matches
    .map((verse) => {
      const active = verse.id === selectedId ? ' is-active' : ''
      const missing = missingLabels(verse)
      const warn = missing.length
        ? `<em class="verse-warn">${missing.length === 2 ? 'No image' : `No ${missing.join(' or ')}`}</em>`
        : ''
      const heart = isFavorite(verse.id) ? ' · ♥' : ''
      return `
        <li>
          <button class="verse-btn${active}" type="button" data-id="${verse.id}">
            <strong>${displayRef(verse, lang)}${heart}</strong>
            <span>${snippet(displayText(verse, lang))}</span>
            ${warn}
          </button>
        </li>
      `
    })
    .join('')

  if (matches.length === 0) {
    verseList.innerHTML = '<li class="status">No verses match that search.</li>'
  }

  const withImages = verses.filter((verse) => verse.landscape || verse.portrait).length
  statusEl.textContent = `${verses.length} verses · ${withImages} with images`
}

function renderChrome() {
  document.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.lang === lang)
  })
  document.querySelectorAll<HTMLButtonElement>('.orient').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.orientation === orientation)
  })
  document.querySelectorAll<HTMLButtonElement>('.crop-btn').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.crop === crop)
  })
  document.querySelectorAll<HTMLButtonElement>('.list-tab').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === listTab)
  })
  document.querySelectorAll<HTMLButtonElement>('.rotate-btn').forEach((button) => {
    button.classList.toggle('is-active', Number(button.dataset.hours) === rotateHours)
  })
  cropSegment.hidden = orientation !== 'portrait'
  const notifyOn = readString(STORAGE.notify, 'off') === 'on'
  notifyBtn.textContent = `Daily notification: ${notifyOn ? 'On' : 'Off'}`
  favBtn.classList.toggle('is-on', Boolean(selectedId && isFavorite(selectedId)))
}

function renderPreview() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }

  selectedId = verse.id
  const url = currentImageUrl(verse)
  const screen = document.querySelector<HTMLElement>('.screen')!
  const ref = displayRef(verse, lang)
  const text = displayText(verse, lang)
  verseRef.textContent = ref
  verseText.textContent = text
  fallbackRef.textContent = ref
  fallbackText.textContent = text
  preview.classList.toggle('is-portrait', orientation === 'portrait')
  preview.classList.toggle('is-cover', orientation === 'portrait')
  preview.classList.toggle('crop-lock', crop === 'lock')
  preview.classList.toggle('crop-home', crop === 'home')
  screen.classList.toggle('has-image', Boolean(url))
  downloadBtn.disabled = !url
  setWallpaperBtn.disabled = !url
  shareBtn.disabled = false
  favBtn.hidden = false
  prevBtn.disabled = verses.length < 2
  nextBtn.disabled = verses.length < 2

  if (url) {
    previewImage.hidden = false
    previewFallback.hidden = true
    previewImage.alt = `${ref} ${orientation} wallpaper`
    previewImage.src = url
    fallbackNote.textContent = ''
  } else {
    previewImage.hidden = true
    previewImage.removeAttribute('src')
    previewFallback.hidden = false
    fallbackNote.textContent = `Add a ${orientation} image link for ${ref}.`
  }

  renderFilters()
  renderList()
  renderChrome()
  syncUrl(verse)
  writeString(STORAGE.lang, lang)
  writeString(STORAGE.crop, crop)
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const response = await fetch(cdnUrl(url))
  if (!response.ok) {
    throw new Error('Download failed')
  }
  return response.blob()
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

  const filename = fileNameFor(verse, orientation, url, crop === 'lock' ? '-lock' : '')
  try {
    if (orientation === 'portrait') {
      await exportCoverImage({
        url,
        width: 1080,
        height: 1920,
        crop,
        filename: filename.replace(/\.[^.]+$/, '.jpg'),
      })
    } else {
      const blob = await fetchImageBlob(url)
      downloadBlob(blob, fileNameFor(verse, orientation, url))
    }
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

async function copyText(value: string, ok: string) {
  try {
    await navigator.clipboard.writeText(value)
    showToast(ok)
  } catch {
    showToast(value)
  }
}

async function shareTextOnly() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }
  const link = pageUrlFor(verse.id, orientation, lang)
  const text = `${displayRef(verse, lang)}\n${displayText(verse, lang)}\n${link}`
  setShareOpen(false)
  if (await sharePayload({ text, url: link })) {
    return
  }
  await copyText(text, 'Text copied.')
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
  try {
    const blob = await fetchImageBlob(imageUrl)
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
    const fileShare = { files: [file] }
    if (navigator.canShare?.(fileShare) && (await sharePayload(fileShare))) {
      return
    }
  } catch {
    // Fall through.
  }
  if (await sharePayload({ url: imageUrl })) {
    return
  }
  await copyText(imageUrl, 'Image link copied.')
}

async function copyAppLink() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }
  setShareOpen(false)
  await copyText(pageUrlFor(verse.id, orientation, lang), 'App link copied.')
}

async function copyTamilVerse() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }
  setMoreOpen(false)
  await copyText(`${verse.reference}\n${verse.text}`, 'Tamil verse copied.')
}

function openVerseOfTheDay() {
  const verse = verseOfTheDay(verses)
  if (!verse) {
    return
  }
  selectedId = verse.id
  setMoreOpen(false)
  renderPreview()
  showToast('Verse of the day')
}

function shuffleVerse() {
  if (verses.length < 2) {
    showToast('Need more verses.')
    return
  }
  let next = verses[Math.floor(Math.random() * verses.length)]
  while (next && next.id === selectedId && verses.length > 1) {
    next = verses[Math.floor(Math.random() * verses.length)]
  }
  if (next) {
    selectedId = next.id
    renderPreview()
  }
  setMoreOpen(false)
  showToast('Shuffled.')
}

async function saveStatus() {
  const verse = selectedVerse()
  const url = verse ? currentImageUrl(verse) : ''
  if (!verse || !url) {
    showToast('Add an image link first.')
    return
  }
  setMoreOpen(false)
  try {
    await exportCoverImage({
      url,
      width: 1080,
      height: 1920,
      crop,
      filename: fileNameFor(verse, 'portrait', url, '-status'),
    })
    showToast('Status image saved.')
  } catch {
    showToast('Could not export status.')
  }
}

async function savePoster() {
  const verse = selectedVerse()
  const url = verse ? currentImageUrl(verse) : ''
  if (!verse || !url) {
    showToast('Add an image link first.')
    return
  }
  const church = churchInput.value.trim() || DEFAULT_CHURCH
  writeString(STORAGE.church, church)
  setMoreOpen(false)
  try {
    await exportCoverImage({
      url,
      width: orientation === 'landscape' ? 1920 : 1080,
      height: orientation === 'landscape' ? 1080 : 1920,
      crop,
      filename: fileNameFor(verse, orientation, url, '-poster'),
      poster: {
        church,
        date: sundayLabel(lang),
        verse: displayRef(verse, lang),
      },
    })
    showToast('Poster saved.')
  } catch {
    showToast('Could not export poster.')
  }
}

function toggleFavorite() {
  const verse = selectedVerse()
  if (!verse) {
    return
  }
  favorites = isFavorite(verse.id) ? favorites.filter((id) => id !== verse.id) : [...favorites, verse.id]
  writeFavorites(favorites)
  renderPreview()
  showToast(isFavorite(verse.id) ? 'Saved to favorites.' : 'Removed from favorites.')
}

function applyRotateHours(hours: number) {
  rotateHours = hours
  writeString(STORAGE.rotateHours, String(hours))
  window.clearInterval(rotateTimer)
  if (hours > 0) {
    rotateTimer = window.setInterval(() => {
      goToVerse(1)
      showToast('Auto-rotated.')
    }, hours * 60 * 60 * 1000)
  }
  renderChrome()
}

async function toggleNotify() {
  const enabled = readString(STORAGE.notify, 'off') === 'on'
  if (enabled) {
    writeString(STORAGE.notify, 'off')
    renderChrome()
    showToast('Daily notification off.')
    return
  }
  if (!('Notification' in window)) {
    showToast('Notifications not supported.')
    return
  }
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') {
    showToast('Notifications blocked.')
    return
  }
  writeString(STORAGE.notify, 'on')
  renderChrome()
  showToast('Daily notification on.')
  void notifyVerseOfTheDay()
}

async function notifyVerseOfTheDay() {
  if (readString(STORAGE.notify, 'off') !== 'on' || !('Notification' in window) || Notification.permission !== 'granted') {
    return
  }
  const verse = verseOfTheDay(verses)
  if (!verse || readString(STORAGE.notifyDate, '') === `${todayStamp()}`) {
    return
  }
  writeString(STORAGE.notifyDate, todayStamp())
  const title = `TCW · ${displayRef(verse, lang)}`
  const body = displayText(verse, lang)
  const registration = await navigator.serviceWorker.getRegistration()
  if (registration?.showNotification) {
    await registration.showNotification(title, {
      body,
      icon: './icons/icon-192.png',
      tag: 'tcw-votd',
    })
    return
  }
  new Notification(title, { body, icon: './icons/icon-192.png' })
}

function todayStamp(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
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

filterRow.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.chip')
  if (!button) {
    return
  }
  activeFilter = activeFilter === (button.dataset.filter ?? '') ? '' : (button.dataset.filter ?? '')
  renderFilters()
  renderList()
})

searchInput.addEventListener('input', () => {
  renderList()
})

document.querySelectorAll<HTMLButtonElement>('.orient').forEach((button) => {
  button.addEventListener('click', () => {
    orientation = button.dataset.orientation === 'portrait' ? 'portrait' : 'landscape'
    renderPreview()
  })
})

document.querySelectorAll<HTMLButtonElement>('.lang-btn').forEach((button) => {
  button.addEventListener('click', () => {
    lang = button.dataset.lang === 'en' ? 'en' : 'ta'
    renderPreview()
  })
})

document.querySelectorAll<HTMLButtonElement>('.crop-btn').forEach((button) => {
  button.addEventListener('click', () => {
    crop = button.dataset.crop === 'lock' ? 'lock' : 'home'
    renderPreview()
  })
})

document.querySelectorAll<HTMLButtonElement>('.list-tab').forEach((button) => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab
    listTab = tab === 'favorites' || tab === 'today' ? tab : 'all'
    renderList()
    renderChrome()
  })
})

document.querySelectorAll<HTMLButtonElement>('.rotate-btn').forEach((button) => {
  button.addEventListener('click', () => {
    applyRotateHours(Number(button.dataset.hours) || 0)
    showToast(rotateHours ? `Auto-rotate every ${rotateHours}h.` : 'Auto-rotate off.')
  })
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

shareLinkBtn.addEventListener('click', () => {
  void copyAppLink()
})

shareCancelBtn.addEventListener('click', () => {
  setShareOpen(false)
})

versesBtn.addEventListener('click', () => {
  setShareOpen(false)
  setMoreOpen(false)
  setWallpaperGuideOpen(false)
  setSheetOpen(true)
})

moreBtn.addEventListener('click', () => {
  setMoreOpen(true)
})

moreCloseBtn.addEventListener('click', () => {
  setMoreOpen(false)
})

favBtn.addEventListener('click', () => {
  toggleFavorite()
})

votdBtn.addEventListener('click', () => {
  openVerseOfTheDay()
})

shuffleBtn.addEventListener('click', () => {
  shuffleVerse()
})

copyVerseBtn.addEventListener('click', () => {
  void copyTamilVerse()
})

statusExportBtn.addEventListener('click', () => {
  void saveStatus()
})

posterBtn.addEventListener('click', () => {
  void savePoster()
})

notifyBtn.addEventListener('click', () => {
  void toggleNotify()
})

churchInput.addEventListener('change', () => {
  writeString(STORAGE.church, churchInput.value.trim() || DEFAULT_CHURCH)
})

prevBtn.addEventListener('click', () => {
  goToVerse(-1)
})

nextBtn.addEventListener('click', () => {
  goToVerse(1)
})

preview.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('button')) {
    return
  }
  const now = Date.now()
  if (now - lastTap < 320) {
    lastTap = 0
    void downloadWallpaper().then((saved) => {
      if (saved) {
        showToast('Saved to downloads.')
      }
    })
    return
  }
  lastTap = now
})

preview.addEventListener(
  'touchstart',
  (event) => {
    const touch = event.changedTouches[0]
    swipeX = touch?.clientX ?? 0
    swipeY = touch?.clientY ?? 0
  },
  { passive: true },
)

preview.addEventListener(
  'touchend',
  (event) => {
    const touch = event.changedTouches[0]
    if (!touch) {
      return
    }
    const dx = touch.clientX - swipeX
    const dy = touch.clientY - swipeY
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) {
      return
    }
    goToVerse(dx < 0 ? 1 : -1)
  },
  { passive: true },
)

document.addEventListener('keydown', (event) => {
  if (
    anyGuideOpen() ||
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
  closeGuides()
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

const splashSeen = readString(STORAGE.splashSeen, '')
const splashStarted = Date.now()
const minSplashMs = splashSeen ? 2000 : 5000
writeString(STORAGE.splashSeen, '1')

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

window.setTimeout(hideSplash, splashSeen ? 4000 : 10000)

try {
  const { catalog } = await loadCatalog()
  verses = catalog.verses
  if (!params.get('v')) {
    selectedId = verseOfTheDay(verses)?.id ?? selectedId
  }
  applyRotateHours(rotateHours)
  renderPreview()
  void notifyVerseOfTheDay()
} catch (error) {
  statusEl.textContent = error instanceof Error ? error.message : 'Could not load verses.'
} finally {
  finishSplash()
}
