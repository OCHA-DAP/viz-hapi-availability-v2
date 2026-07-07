import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { fetchTextWithPolling } from '../src/fetchWithRetry.js';

const base_url = process.env.VITE_BASE_URL || 'https://hapi.humdata.org/api/v2';
const app_identifier = process.env.VITE_APP_IDENTIFIER || 'aGFwaS1kYXNoYm9hcmQ6ZXJpa2Eud2VpQHVuLm9yZw==';
const OUT_DIR = fileURLToPath(new URL('../public/data/', import.meta.url));

// this runs unattended in CI, so it can wait far longer than a live page load
// ever could for HAPI's CSV generation to finish (100 * 5s = ~8min per page).
const PIPELINE_RETRY_OPTIONS = { pendingAttempts: 100, retryDelay: 5000 };

function buildUrl(endpoint, params) {
  const query = new URLSearchParams({ app_identifier, output_format: 'csv', ...params });
  return `${base_url}/metadata/${endpoint}?${query}`;
}

async function fetchLocationCsv() {
  const url = buildUrl('location', { offset: 0, limit: 10000 });
  return fetchTextWithPolling(url, PIPELINE_RETRY_OPTIONS);
}

async function fetchDataAvailabilityCsv() {
  const rows = [];
  let offset = 0;
  let page;

  do {
    const url = buildUrl('data-availability', { offset, limit: 10000 });
    const text = await fetchTextWithPolling(url, PIPELINE_RETRY_OPTIONS);
    page = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
    rows.push(...page);
    offset += 10000;
  } while (page.length >= 10000);

  return Papa.unparse(rows);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const [locationCsv, dataAvailabilityCsv] = await Promise.all([
    fetchLocationCsv(),
    fetchDataAvailabilityCsv()
  ]);

  writeFileSync(`${OUT_DIR}location.csv`, locationCsv);
  writeFileSync(`${OUT_DIR}data-availability.csv`, dataAvailabilityCsv);

  console.log('Wrote public/data/location.csv and public/data/data-availability.csv');
}

main().catch(error => {
  console.error('Failed to fetch HAPI data:', error);
  process.exit(1);
});
