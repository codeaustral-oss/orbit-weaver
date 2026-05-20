# Orbit Weaver

A Three.js orbital ribbon composer for designing animated kinetic line systems in the browser.

Live demo: https://codeaustral-oss.github.io/orbit-weaver/

![Orbit Weaver preview](./public/preview.svg)

## What it does

Orbit Weaver turns a few structural controls into layered, animated line systems. It is built for creative coders, motion designers, and frontend engineers who want a polished starting point for WebGL line art.

## Features

- Three weave modes: braid, gyre, and halo.
- Live control over rings, strands, twist, depth, tilt, and speed.
- Deterministic seeded generation for repeatable looks.
- Curated palettes with additive Three.js line rendering.
- PNG snapshot export.
- GitHub Pages deployment workflow included.

## Quick start

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` - start the Vite dev server.
- `npm run lint` - run the TypeScript project check.
- `npm run build` - type-check and build.
- `npm run preview` - preview the production build.

## Good first issues

- Add SVG export for static compositions.
- Add keyboard shortcuts for mode switching.
- Add camera orbit controls without increasing bundle size too much.
- Add motion presets that can be copied as JSON.
