# HAPI Coverage Table

A Svelte + Vite dashboard that shows data availability across the [HDX Humanitarian API (HAPI)](https://hapi.humdata.org/), broken down by country, category/subcategory, and administrative level (admin0/1/2). Users can filter the table to HRP (Humanitarian Response Plan) priority countries or select specific countries to compare.

## Requirements

- Node.js 16+
- npm

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Create a `.env` file in the project root with your HAPI API credentials:
   ```
   VITE_BASE_URL=https://hapi.humdata.org/api/v2
   VITE_APP_IDENTIFIER=<your-app-identifier>
   ```
   `VITE_APP_IDENTIFIER` is a base64-encoded `app:email` identifier issued by HAPI.

## Development

```
npm run dev
```

Starts a local dev server (default `http://localhost:5173`) with hot module reload.

## Build

```
npm run build
```

Builds the production bundle into `dist/`.

```
npm run preview
```

Serves the built `dist/` bundle locally to sanity-check a production build.

## Deployment

Pushes to `main` trigger `.github/workflows/node.js.yml`, which builds the app and deploys `dist/` to GitHub Pages via `peaceiris/actions-gh-pages`.

## How it works

On load, the app fetches two CSV datasets from the HAPI `metadata` endpoints:
- `metadata/location` — country list, used to determine which countries are HRP priority countries
- `metadata/data-availability` — per-country, per-subcategory, per-admin-level availability data

Both responses are parsed with PapaParse and cached in `sessionStorage` for 30 minutes to avoid redundant fetches, with automatic retry (up to 3 attempts, exponential backoff) on request failures. The table groups data by category/subcategory (defined in `src/config.js`) and renders a checkmark grid showing which admin levels are available per country.
