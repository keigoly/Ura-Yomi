# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

Ura-Yomi! is a Chrome Extension (Manifest V3) that analyzes YouTube comments using Google Gemini AI. The frontend is React + TypeScript + Tailwind CSS + Zustand, built with Vite. The backend (Express.js) lives in a **separate private repository** at `server/` — see Git section below.

## Build & Development Commands

```bash
# Frontend development build (connects to localhost:3000)
npx vite build --mode development

# Frontend production build (connects to api.keigoly.jp, strips localhost from manifest)
npm run build        # runs: tsc && vite build

# Watch mode (rebuilds on file changes)
npm run build:watch

# Backend local server (from project root)
cd server && npm run dev   # NODE_ENV=development → 999 credits for all users

# Type check only
npx tsc --noEmit
```

After building, load `dist/` as an unpacked extension in `chrome://extensions`.

There are no tests configured in this project.

## Git Repository Structure (CRITICAL)

- **Public repo** (`Ura-Yomi`): This root directory — Chrome extension frontend only
- **Private repo** (`Ura-Yomi-server`): `server/` directory — completely independent git repo
- `server/` is in `.gitignore` of the parent repo
- **NEVER commit or push server code to the public repo**
- Commit messages are written in Japanese

### Tagging & Releases

Annotated tags: `git tag -a v1.0.2 -m "..."` → push both `main` and the tag. Also create a GitHub Release (the Settings page fetches `/repos/keigoly/Ura-Yomi/releases/latest`).

## Architecture

### Entry Points (Vite multi-page build)

| Entry | HTML | Purpose |
|-------|------|---------|
| Popup | `src/popup.html` → `Popup.tsx` | Auth + start analysis |
| SidePanel | `src/sidepanel.html` → `SidePanel.tsx` | Main results UI (3 tabs) |
| Settings | `src/settings.html` → `Settings.tsx` | Accordion settings page |
| Content Script | `src/content/content.ts` | Injects analyze button on YouTube pages |

`src/background.js` is the service worker (plain JS, not bundled by Vite — copied to `dist/` by a custom Vite plugin in `vite.config.ts`).

### State Management (Zustand stores in `src/store/`)

- `analysisStore.ts` — analysis progress, results, errors
- `designStore.ts` — theme (`BgMode`: default/darkblue/black), font size
- `characterStore.ts` — character mode toggle and transform cache

### Data Flow: "Open in New Window"

Data transfers between SidePanel and new windows use `chrome.storage.local` (not localStorage). Window creation is routed through `background.js` via `OPEN_RESULT_WINDOW` message for reliability. Side panel auto-closes after opening the new window.

### API Client

`src/services/apiServer.ts` communicates with the backend. Base URL comes from `VITE_API_BASE_URL` env var (`.env` → localhost:3000, `.env.production` → api.keigoly.jp).

## Key Development Rules

### i18n — Always Both Languages

- All UI text must have both `ja` and `en` entries in `src/i18n/translations.ts`
- Use `const { t } = useTranslation()` and `t('key')` — never hardcode strings
- Server-side messages also support both languages via `language` parameter

### Theme / Background Colors

Three background modes: `default` (#ffffff), `darkblue` (#273340), `black` (#000000).

- Use `BG_COLORS[bgMode]` as inline style for explicit background — `bg-inherit` breaks when CSS inheritance chain is interrupted
- Use `isLightMode(bgMode)` helper for conditional text/icon colors

### Build Mode Switching

- `vite.config.ts` uses `defineConfig(({ mode }) => ...)` — mode determines dev/prod, **not** `process.env.NODE_ENV`
- Production build auto-strips localhost entries from `manifest.json` via the custom Vite plugin
- Store submission: `npm run build` → zip `dist/` → upload → rebuild with `npx vite build --mode development`

### Characters

- ユウちゃん: Always use katakana「ユウちゃん」in UI, never kanji「夕」
- ジェミニーちゃん: AI fairy, uses「〜ミニ！」suffix, enters toxic mode for negative analysis

### Layout Pattern

Prefer flex layout (`flex-shrink-0` + `flex-1 overflow-y-auto min-h-0`) over sticky positioning for fixed headers with scrollable content — sticky elements cause scrollbar to extend above the header.

## Production Deploy

Server: AWS Lightsail → Nginx → PM2 at `api.keigoly.jp`. Deploy: `cd ~/Ura-Yomi-server && git pull && npm install && pm2 restart urayomi-server`.
