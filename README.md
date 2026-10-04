# Monarch

Monarch is a lightweight web launcher for browser Minecraft / Eaglercraft-compatible builds.

## Goals

- One place for regular versions, clients, modded builds, FPS clients, snapshots, and experiments.
- Fast on Chromebooks, tablets, and desktop browsers.
- Manifest-driven catalog so builds can be added without rewriting the UI.
- No framework dependency for the launcher shell.
- Keep launcher code separate from third-party game payloads.

## Structure

- `index.html` – launcher shell
- `assets/styles.css` – interface styling
- `assets/app.js` – catalog, search, favorites, recent builds, launch routing
- `catalog/versions.json` – build manifest

## Catalog entries

Each build is described in `catalog/versions.json`. A build can launch:

- an internal path hosted with Monarch
- an authorized external web build
- a placeholder entry while integration work is still in progress

Monarch does not bundle third-party game binaries by default. Add only builds you are authorized to redistribute or link to.

## Development

Serve the repository through any static HTTP server. Opening `index.html` directly may work for the UI, but fetching the JSON catalog requires HTTP in most browsers.
