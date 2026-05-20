# Contributing

Orbit Weaver aims to stay readable, fast, and visually memorable. Pull requests are welcome for new weave formulas, palette packs, export formats, and interaction polish.

## Local setup

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run lint
npm run build
```

## Guidelines

- Keep formulas deterministic when a seed is provided.
- Dispose Three.js geometry and materials when rebuilding scenes.
- Keep controls usable on mobile and small laptop screens.
