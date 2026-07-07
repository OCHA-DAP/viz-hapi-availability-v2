# HAPI Coverage Table

A Svelte + Vite dashboard that shows data availability across the [HDX Humanitarian API (HAPI)](https://hapi.humdata.org/), broken down by country, category/subcategory, and administrative level (admin0/1/2). Users can filter the table to HRP (Humanitarian Response Plan) priority countries or select specific countries to compare.

## How it works

`scripts/fetch-data.js` fetches two CSVs from HAPI's `metadata` API (`location` and `data-availability`) and writes them to `public/data/`. The app reads those static CSVs at runtime, parses them with PapaParse, and caches the result in `sessionStorage` for 1 hour. The table groups data by category/subcategory (defined in `src/config.js`) and renders a checkmark grid showing which admin levels are available per country.

The fetch script runs in CI on every push and on a daily schedule (`.github/workflows/node.js.yml`), so the deployed data is refreshed at least once a day.

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

## Commands

```
npm run fetch-data
```
Fetches the latest CSVs from HAPI into `public/data/`.

```
npm run dev
```
Starts a local dev server (default `http://localhost:5173`) with hot module reload.

```
npm run test
```
Runs the test suite.

```
npm run build
```
Builds the production bundle into `dist/`.

```
npm run preview
```
Serves the built `dist/` bundle locally to sanity-check a production build.

## Deployment

Pushes to `main`, a daily schedule, and manual workflow runs all trigger `.github/workflows/node.js.yml`, which fetches fresh data, builds the app, and deploys `dist/` to GitHub Pages via `peaceiris/actions-gh-pages`.
