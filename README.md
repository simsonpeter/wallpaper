# Verse Wallpapers

Select a verse, preview the portrait wallpaper, then download or share it.

The app loads the wallpaper catalog from GitHub:

`https://raw.githubusercontent.com/simsonpeter/wallpaper/main/public/data/wallpapers.json`

## Add your wallpaper links

1. Upload images to `public/images/portrait/`.
2. Open `public/data/wallpapers.json`.
3. Paste a **direct image URL** into `portrait` for each verse.

Example:

```json
{
  "id": "john-3-16",
  "reference": "John 3:16",
  "text": "For God so loved the world...",
  "portrait": "https://raw.githubusercontent.com/simsonpeter/wallpaper/main/public/images/portrait/john-3-16.jpg"
}
```

To add a new verse, copy one object in the `verses` array and change `id`, `reference`, `text`, and `portrait`.

## Install the app

TCW is an installable web app. After it is served over HTTPS (GitHub Pages or `npm run preview` on localhost):

- Android Chrome: tap **Install** or Add to Home screen
- iPhone Safari: Share → Add to Home Screen

The live site is `https://simsonpeter.github.io/wallpaper/` once GitHub Pages is enabled.

## Run locally

```bash
npm install
npm run dev
```
