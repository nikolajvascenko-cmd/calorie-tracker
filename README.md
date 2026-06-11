# CalorieTrack

A private, phone-friendly calorie and weight tracker.

## What it does

- Manual food entry
- Daily calorie, protein, carb, and fat totals
- Saved foods for quick add
- Weight tracking
- BMR and maintenance calorie estimate using Mifflin-St Jeor
- Goal target: maintain, cut, bulk, or custom calories
- Export/import backup as JSON
- Offline-capable when hosted as a PWA

## How to test on your computer

Open `index.html` in a browser.

For the full PWA/offline install behavior, serve the folder with a local server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## How to put it on your iPhone

The easiest method is to host the folder as a static site, for example with GitHub Pages, Netlify, Vercel, or Cloudflare Pages.

Once hosted:

1. Open the website in Safari on your iPhone.
2. Tap Share.
3. Tap Add to Home Screen.
4. Open it from the new Home Screen icon.

Your data is stored locally on your phone/browser using localStorage. Use Export backup occasionally so you do not lose your history if Safari data is cleared.
