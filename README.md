# Folio

## My little focused, beautiful writing app; based off FocusWriter.
*Please check their work out, it IS a good app; I just wanted to add my own little features: https://gottcode.org/focuswriter/*


Folio is a desktop writing environment built around a three-stage workflow:
scatter your ideas; organize them into blocks; then write in a clean,
distraction-free editor. 
Version 2.0 adds a full **Mind Map** brainstorming canvas for thinking visually before you write.

Built with [Tauri](https://tauri.app/), React, and TypeScript.

---

## Features

### The writing workflow
- **Three stages** — *Ideation* (scatter notes), *Organize* (arrange into blocks), and *Write* (a clean rich-text editor), so you can move from messy thoughts to a polished draft without leaving the app.
- **Rich text editor** powered by [Tiptap](https://tiptap.dev/) — headings, formatting, fonts, colors, highlights, text alignment, super/subscript, and special-character glyphs.
- **Comments & notes** — annotate your draft and keep side notes in a dedicated panel.
- **Drafts** — keep multiple documents and switch between them.
- **Export** your writing to `.folio`, RTF, HTML, Markdown, or plain text.

### Mind Map *(new in 2.0)*
A standalone brainstorming canvas for connecting ideas visually:
- **Connectable bubbles** — create bubbles, type in them, and drag them anywhere. Connections stay attached as bubbles move.
- **Images on the canvas** — upload a picture, move and resize it, and connect a bubble to *any exact point* on it. The link stays pinned to that spot even as the image moves.
- **Pan & zoom** — drag empty space to pan, scroll to zoom.
- **Theme-aware** — the canvas and controls follow your selected theme and stay legible everywhere.
- **Export** as **PNG** (picture), **SVG** (sharp vector), or **Foliomap** (a re-openable map file).
- **Open** saved `.foliomap` files back onto the canvas.

### Customizeability
- Multiple built-in **themes** (Sepia, Ivory, Slate, Forest, Dusk); build and save custom themes, accent colors, and background images.
- Adjustable font, width, line height, and paragraph spacing.
- **Focus mode**, auto-hiding toolbars, a writing **timer**, word-count goals, ambient **audio** tracks, optional **keyboard sounds**, and posture reminders.

---

## Getting started (development)

**Prerequisites**
- [Node.js](https://nodejs.org/) (18+)
- [Rust](https://www.rust-lang.org/tools/install) and the
  [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

**Install and run**
```bash
npm install
npm run tauri dev
```
This launches the desktop app with hot-reload.

> Running `npm run dev` alone starts only the web frontend (Vite) in a browser.
> File saving requires the Tauri runtime, so use `npm run tauri dev` for the
> full experience.

---

## Building a release

```bash
npm run tauri build
```

This produces a standalone executable and installers under
`src-tauri/target/release/`:

| Output | Location |
|---|---|
| Standalone app | `src-tauri/target/release/folio.exe` |
| Installer (NSIS) | `src-tauri/target/release/bundle/nsis/` |
| Installer (MSI) | `src-tauri/target/release/bundle/msi/` |

> The installers are not code-signed, so Windows SmartScreen may warn on first
> run — choose **More info → Run anyway**.

---

## Project structure

```
src/
  App.tsx                  App shell, state, and stage/mind-map wiring
  components/
    MindMap.tsx            Mind Map canvas (bubbles, connections, images)
    IdeationCanvas.tsx     Stage 1 — scatter notes
    BlockEditor.tsx        Stage 2 — organize into blocks
    Toolbar.tsx, ...       Editor UI (toolbars, panels, modals)
  lib/
    storage.ts             Save/load data (documents, settings, mind maps)
    mindmapExport.ts       Mind Map export (PNG/SVG/Foliomap) and open
    export.ts, rtf.ts      Document export helpers
src-tauri/                 Tauri (Rust) backend, config, and icons
```

Folio stores its data as JSON in the app data directory
(`drafts`, settings, workspace images, and `mindmap.json`).

---

## Tech stack

- **[Tauri 2](https://tauri.app/)** — native desktop shell (Rust)
- **React 19** + **TypeScript** + **Vite**
- **[Tiptap 3](https://tiptap.dev/)** — rich-text editing
- **Tailwind CSS 4**

---

## Version

**3.1.0**
