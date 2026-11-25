# Shaloom Rafiq — Portfolio

Personal portfolio site for Shaloom Rafiq, filmmaker and social media manager.

The opening section is a 3D scene: the name **SHALOOM / RAFIQ** is carved from stone, broken into chunks, and pulled back together as you scroll. Once it is whole, the cursor lights the stone like a torch, and clicking breaks it apart again.

## Built with

- React 18 and Vite
- three.js with React Three Fiber
- three-bvh-csg (breaks the letters into stone chunks)
- GSAP ScrollTrigger (scroll animations)

## Run it locally

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

## Build for hosting

```bash
npm run build
```

The finished site is written to `dist/`, with `dist/index.html` as the main page.

## Live site

Every push to `main` builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`:
https://shaloomrafiq-ops.github.io/portflio/

## Project layout

| Path | What it holds |
| --- | --- |
| `src/App.jsx` | Page sections: about, experience, education, services, contact |
| `src/Hero.jsx` | The pinned hero and its scroll timeline |
| `src/stone/buildName.js` | Builds the 3D letters and cuts them into chunks |
| `src/stone/StoneScene.jsx` | Lighting, animation, cursor torch, sparks |
| `src/stone/anton.typeface.json` | Anton font outlines for the letters |
| `scripts/make-font.mjs` | Regenerates the font file from `@fontsource/anton` |
| `scripts/deploy.ps1` | Optional Netlify upload script |
