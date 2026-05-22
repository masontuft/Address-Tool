# Address-Tool

A personal address book web app for managing mailing addresses — ideal for building address labels for wedding invites, thank you notes, and similar occasions.

## Demo Link
[Youtube Demo](https://youtu.be/2Zxu3hoCZX8)
## Features

- **Search** addresses by name, street, city, state, or zip
- **Add addresses** manually, via CSV upload, or by uploading a PDF/image (extracted with Google Gemini AI)
- **Edit and delete** individual address cards
- **Duplicate detection** — automatically flags potential duplicates before saving; exact matches are auto-removed
- **Address verification** via Google Maps Address Validation API — per-card or bulk "Verify All"; highlights corrections with an Apply/Dismiss prompt
- **Persistent storage** via Supabase (PostgreSQL)

## Instructions for Build and Use

Steps to build and/or run the software:

1. Copy `.env.example` to `.env` and fill in your API keys (see Environment Variables below)
2. Run `npm install` to install dependencies
3. Run `npm run dev` and open the localhost link provided

Instructions for using the software:

1. Search for addresses using the search bar
2. Upload a CSV file or a PDF/image to bulk-import addresses
3. Use the **+** button to add a single address manually
4. Click any card to edit or delete it
5. Click **Verify** on a card (or **Verify All** in the toolbar) to validate addresses against Google Maps

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_GEMINI_API_KEY` | Google Gemini API key for PDF/image address extraction |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps Address Validation API key |

## Development Environment

To recreate the development environment, you need the following software and/or libraries with the specified versions:

* Node.js v25+
* React 18.3
* Vite 5.4
* @supabase/supabase-js 2.106

## Useful Websites to Learn More

I found these websites useful in developing this software:

* [Supabase Docs](https://supabase.com/docs)
* [Vite Docs](https://vitejs.dev/guide/)
* [Google Gemini API](https://ai.google.dev/gemini-api/docs)

## Future Work

The following items I plan to fix, improve, and/or add to this project in the future:

* [ ] Export addresses to CSV or printable label format
* [ ] Batch delete with multi-select
* [ ] Label/group filtering (e.g. "family", "work")