# Monarch catalog schema

`versions.json` is the source of truth for the launcher library.

## Build object

```json
{
  "id": "unique-build-id",
  "name": "Display name",
  "version": "1.8.8",
  "category": "vanilla",
  "description": "Short launcher description.",
  "tags": ["pvp", "classic"],
  "engine": "WebAssembly",
  "status": "ready",
  "year": "2015",
  "art": "./assets/covers/example.webp",
  "source": {
    "name": "Upstream project",
    "url": "https://example.com",
    "license": "License or redistribution note"
  },
  "launch": {
    "mode": "same-tab",
    "target": "./builds/example/index.html"
  }
}
```

## Categories

- `vanilla` - regular versions
- `client` - feature clients and alternate distributions
- `modded` - modded, Forge, Fabric, or custom modpack builds
- `fps` - performance-focused clients
- `snapshot` - snapshots and experimental builds

## Status

- `ready` - launch target is connected
- `integration` - catalog entry exists but is not connected yet
- `broken` - temporarily disabled pending a fix

## Launch modes

- `same-tab` - navigate the current tab to the build
- `new-tab` - open the build in a new tab

Internal launch targets should normally live under `./builds/<id>/`.

Only add or redistribute builds you are authorized to host or link to.
