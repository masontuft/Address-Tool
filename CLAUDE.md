# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

```bash
npm install
cp .env.example .env   # then add VITE_ANTHROPIC_API_KEY
```

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build
```

No test runner is specified — if adding tests, check package.json for the test script first.

## Architecture

React + Vite SPA. All state persists to `localStorage` — there is no backend or database.

### Data flow

1. Addresses are loaded from `localStorage` on mount via `utils/storage.js`
2. New addresses enter through one of three paths: CSV upload, PDF/image upload (Claude API), or manual form
3. All incoming addresses pass through `processIncoming()` in `App.jsx`, which runs duplicate detection before saving
4. Duplicate conflicts are shown in `DuplicateModal` — user resolves each one before state is committed

### Key utilities (`src/utils/`)

- **`csvParser.js`** — parses raw CSV text and normalizes flexible column names (`full_name`, `address_line_1`, `postal_code`, etc.) to standard fields: `name, street, city, state, zip, country, label`
- **`duplicates.js`** — detects duplicates via `isSameAddress(a, b)`: same street AND (same name OR same zip), after normalizing with `norm(s)` (lowercase + strip non-alphanumeric)
- **`storage.js`** — `loadAddresses()` / `saveAddresses()` against `localStorage` key `"address-tool-addresses"`

### PDF/image extraction

`handleFileDoc()` in `App.jsx` converts files to base64 and calls the Gemini API (`gemini-2.0-flash`) directly from the browser using `VITE_GEMINI_API_KEY`. The API key is exposed client-side — acceptable for personal use, but not for production. The system prompt instructs Gemini to return a raw JSON array with fields `name, street, city, state, zip, country, label`.

### Styling

Plain inline styles or minimal CSS — no UI library. Max-width 660px centered layout. Avatar colors cycle through 4 options (blue, yellow, green, red) based on `name.charCodeAt(0) % 4`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_GEMINI_API_KEY` | Google Gemini API key for PDF/image address extraction |
