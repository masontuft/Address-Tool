# Address Search Engine & Formatter — Build Spec

## Overview
A React + Vite web app for managing, importing, searching, and exporting a personal address book. Users can import addresses from CSV files, PDFs, and images. Duplicate detection prompts the user to resolve conflicts manually. All addresses can be exported back to CSV.

---

## 1. Initialize the Project

```bash
npm create vite@latest address-tool -- --template react
cd address-tool
npm install
```

---

## 2. Project Structure

```
address-tool/
├── public/
├── src/
│   ├── components/
│   │   ├── AddressCard.jsx
│   │   ├── Avatar.jsx
│   │   ├── DuplicateModal.jsx
│   │   ├── ManualForm.jsx
│   │   └── MiniCard.jsx
│   ├── utils/
│   │   ├── csvParser.js
│   │   ├── duplicates.js
│   │   └── storage.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env
├── .env.example
├── .gitignore
├── index.html
└── README.md
```

---

## 3. Environment Variables

Create `.env`:
```
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

Create `.env.example`:
```
VITE_ANTHROPIC_API_KEY=
```

> **Note:** The Anthropic API key is used client-side for PDF/image extraction only. For production, proxy requests through a backend to keep the key secret.

---

## 4. Core Utilities

### `src/utils/csvParser.js`
- `parseCSVText(text)` — parses raw CSV string into array of row objects
- `mapRow(row)` — maps flexible column names to standard fields: `name, street, city, state, zip, country, label`
- Column aliases to support:
  - `name`: `full_name`, `display name`, `first_name` + `last_name`
  - `street`: `address_line_1`, `address line 1`, `addr1`, `address` (append `address_line_2` if present)
  - `zip`: `postal_code`, `zip_code`, `zip code`, `postcode`, `postal`
  - `label`: `company_name`, `company`, `tags`, `notes`
- Each row gets a unique `id` via `Math.random().toString(36).slice(2)`

### `src/utils/duplicates.js`
- `norm(s)` — lowercases and strips non-alphanumeric characters
- `isSameAddress(a, b)` — returns true if same street AND (same name OR same zip)
- `findAllDuplicates(entries)` — scans full list for duplicate pairs, returns array of `{ existing, incoming }`

### `src/utils/storage.js`
- `loadAddresses()` — reads from `localStorage` key `"address-tool-addresses"`, returns parsed array or `[]`
- `saveAddresses(addresses)` — serializes and writes array to `localStorage`

---

## 5. Components

### `Avatar.jsx`
- Props: `name` (string)
- Renders a circular avatar with 2-letter initials
- Color cycles through 4 options based on `name.charCodeAt(0) % 4`

### `MiniCard.jsx`
- Props: `entry`, `selected`, `onClick`, `label`
- Compact address card used inside the duplicate modal
- Highlights with a blue border and checkmark when selected

### `DuplicateModal.jsx`
- Props: `conflicts` (array), `onResolve` (callback)
- Steps through one duplicate at a time
- Each step shows two `MiniCard`s side by side: "existing" vs "new"
- Options per conflict: pick existing, pick new, or keep both
- Back/Next navigation with dot progress indicators
- "Done" button only enabled when all conflicts are resolved
- On resolve, calls `onResolve(decisions)` where decisions is `{ [index]: "existing" | "incoming" | "both" }`

### `ManualForm.jsx`
- Props: `onSave`, `onCancel`
- Fields: Name, Label (optional), Street, City, State, ZIP, Country
- Name and Street span full width
- Calls `onSave(entry)` with a new address object on submit

### `AddressCard.jsx`
- Props: `entry`, `onDelete`
- Displays avatar + name + label at top
- Table of fields: Street, City, State, ZIP, Country — each with individual copy button
- Bottom block shows formatted multi-line address with a "Copy" button for the full single-line version
- Trash icon button calls `onDelete(entry.id)`

---

## 6. App.jsx — Main Logic

### State
```js
const [addresses, setAddresses] = useState([])   // loaded from localStorage on mount
const [search, setSearch] = useState("")
const [loading, setLoading] = useState(true)
const [loadingMsg, setLoadingMsg] = useState("")
const [manualOpen, setManualOpen] = useState(false)
const [conflicts, setConflicts] = useState(null)
const pendingRef = useRef({ clean: [], allAddresses: [] })
```

### On Mount
Load addresses from `localStorage` via `loadAddresses()`, then set `loading` to false.

### `saveAddresses(updated)`
Calls `setAddresses(updated)` and `saveAddresses(updated)` from storage util.

### `processIncoming(incoming)`
1. Combine `addresses + incoming`
2. Run `findAllDuplicates(combined)`
3. If duplicates found: store pending state in `pendingRef`, call `setConflicts(dups)`
4. If no duplicates: call `saveAddresses(combined)`

### `handleResolve(decisions)`
1. Build a `toRemove` Set based on decisions
2. Filter combined list removing unwanted entries
3. Deduplicate by id
4. Call `saveAddresses(result)` and `setConflicts(null)`

### `handleCSV(e)`
- Accepts multiple `.csv` files
- Reads each with `file.text()`
- Parses with `parseCSVText` + `mapRow`
- Filters out entries with no name and no street
- Calls `processIncoming(all)`

### `handleFileDoc(e)`
- Accepts `.pdf` and `image/*`
- Converts to base64
- POSTs to Anthropic API (`claude-sonnet-4-20250514`) with the file as a `document` or `image` content block
- System prompt: extract names and addresses, return only raw JSON array with fields: `name, street, city, state, zip, country, label`
- Parses response and calls `processIncoming(parsed)`

### `handleExport()`
- Builds CSV string from `addresses` array
- Triggers download via `<a>` with `data:text/csv` href
- Filename: `addresses.csv`

### Search filter
Filters `addresses` where any of `name, street, city, state, zip, country` includes the search string (case-insensitive).

---

## 7. Styling
- Use plain inline styles or a minimal CSS file — no UI library required
- Keep a neutral color palette with 4 accent colors for avatars (blue, yellow, green, red)
- Responsive layout, max-width 660px centered

---

## 8. GitHub Repository Setup

```bash
# Inside address-tool/
git init
git add .
git commit -m "Initial commit — address tool"

# Create repo on GitHub (via CLI)
gh repo create address-tool --public --source=. --remote=origin --push
```

Or manually:
1. Go to github.com/new
2. Name it `address-tool`
3. Set to Public (or Private)
4. Do **not** initialize with README (project already has one)
5. Then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/address-tool.git
git branch -M main
git push -u origin main
```

---

## 9. README.md Content

```md
# Address Tool

A React web app for importing, searching, deduplicating, and exporting address books.

## Features
- Import from CSV (supports multiple column name formats)
- Import from PDF or image (AI-powered extraction)
- Manual address entry
- Duplicate detection with user-driven conflict resolution
- Search by name, street, city, state, or ZIP
- Export to CSV
- Addresses persist across sessions via localStorage

## Setup

1. Clone the repo
2. Run `npm install`
3. Copy `.env.example` to `.env` and add your Anthropic API key
4. Run `npm run dev`

## CSV Format
The importer accepts flexible column names. Recommended format:

| name | street | city | state | zip | country | label |
|------|--------|------|-------|-----|---------|-------|

## Tech Stack
- React + Vite
- Anthropic Claude API (PDF/image extraction)
- localStorage for persistence
```

---

## 10. .gitignore

```
node_modules/
dist/
.env
.DS_Store
```

---

## Quick Start for Claude Code

Run this in your terminal to hand off to Claude Code:

```
Build the address tool described in this spec. Create all files and folders exactly as listed in the project structure. Use the component and utility descriptions to implement each file. Wire everything together in App.jsx. Make sure the app runs with `npm run dev` without errors.
```
