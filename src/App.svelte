<script>
  import Papa from 'papaparse';
  import { onMount } from 'svelte';
  import Select from 'svelte-select';

  import Legend from './components/Legend.svelte';
  import Table from './components/Table.svelte';
  import { subcategoryLabels, categories } from './config.js';

  const base_url = import.meta.env.VITE_BASE_URL || 'https://hapi.humdata.org/api/v2';
  const app_identifier = import.meta.env.VITE_APP_IDENTIFIER || 'aGFwaS1kYXNoYm9hcmQ6ZXJpa2Eud2VpQHVuLm9yZw==';

  const CACHE_KEY = 'hapi-availability-data-v2';
  const COUNTRY_CACHE_KEY = 'hapi-availability-countries-v1';
  const CACHE_TTL = 30 * 60 * 1000;

  // derive ordered subcategory slugs from the canonical categories definition
  const displayToSlug = Object.fromEntries(
    Object.entries(subcategoryLabels).map(([slug, display]) => [display, slug])
  );
  const subcategoryOrder = Object.values(categories).flat().map(display => displayToSlug[display]);

  let allCountries = [];
  let allTableData = {};
  let hrpCountries = [];
  let countries = [];
  let onlyHRP = false;
  let selectPlaceholder = 'All Priority Humanitarian Countries';
  let currentTableData = {};
  let selectValue = null;

  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 1000;

  async function fetchWithRetry(url, attempts = RETRY_ATTEMPTS) {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * 2 ** i));
      }
    }
    throw new Error('fetchWithRetry: exhausted retries');
  }

  async function fetchCountryData() {
    try {
      const cached = sessionStorage.getItem(COUNTRY_CACHE_KEY);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL && Array.isArray(data)) return data;
      }
    } catch (_) {}

    const url = `${base_url}/metadata/location?app_identifier=${app_identifier}&offset=0&output_format=csv&limit=10000`;
    try {
      const response = await fetchWithRetry(url);
      const csvText = await response.text();
      const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true, dynamicTyping: true });
      const hrpCodes = parsedData.data.filter(row => row.has_hrp === 'True').map(row => row.code);

      try {
        sessionStorage.setItem(COUNTRY_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: hrpCodes }));
      } catch (_) {}

      return hrpCodes;
    } catch (error) {
      console.error('Error fetching country data:', error);
      return [];
    }
  }

  async function getTableData() {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL && Array.isArray(data) && data.length > 0) return data;
      }
    } catch (_) {}

    let data = [];
    let offset = 0;
    let fetchedData;

    do {
      const endpoint = `${base_url}/metadata/data-availability?output_format=csv&app_identifier=${app_identifier}&offset=${offset}&limit=10000`;
      fetchedData = await fetchTablePageData(endpoint);
      data.push(...fetchedData);
      offset += 10000;
    } while (fetchedData.length >= 10000);

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    } catch (_) {}

    return data;
  }

  async function fetchTablePageData(endpoint) {
    const response = await fetchWithRetry(endpoint);
    const text = await response.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        complete: results => resolve(results.data),
        error: err => reject(err)
      });
    });
  }

  function getCountries(data) {
    const seen = new Set();
    return data.reduce((acc, row) => {
      if (row.location_code && !seen.has(row.location_code)) {
        seen.add(row.location_code);
        acc.push({ value: row.location_code, label: row.location_name });
      }
      return acc;
    }, []);
  }

  function getAdminLevels(data) {
    const adminLevels = {};

    data.forEach(row => {
      if (row.location_name === undefined) return;
      const { location_name, subcategory } = row;

      if (!adminLevels[location_name]) {
        adminLevels[location_name] = {};
        subcategoryOrder.forEach(slug => {
          adminLevels[location_name][slug] = { admin0: false, admin1: false, admin2: false };
        });
      }

      if (row.admin_level === '0') adminLevels[location_name][subcategory].admin0 = true;
      else if (row.admin_level === '1') adminLevels[location_name][subcategory].admin1 = true;
      else if (row.admin_level === '2') adminLevels[location_name][subcategory].admin2 = true;
    });

    return Object.keys(adminLevels)
      .sort()
      .reduce((sortedObj, location_name) => {
        sortedObj[location_name] = adminLevels[location_name];
        return sortedObj;
      }, {});
  }

  function applyFilters() {
    selectValue = null;
    selectPlaceholder = onlyHRP ? 'All Priority Humanitarian Countries' : 'All Available Countries';
    countries = (onlyHRP ? allCountries.filter(c => hrpCountries.includes(c.value)) : [...allCountries])
      .sort((a, b) => a.label.localeCompare(b.label));
    currentTableData = countries.reduce((acc, country) => {
      acc[country.label] = allTableData[country.label];
      return acc;
    }, {});
  }

  function onCountrySelect(e) {
    currentTableData = e.detail.reduce((acc, country) => {
      acc[country.label] = allTableData[country.label];
      return acc;
    }, {});
    mpTrack();
  }
  function onCountryClear() {
    applyFilters();
  }
  function onHRP(e) {
    onlyHRP = e.target.checked;
    applyFilters();
    mpTrack();
  }

  function initTracking() {
    var MIXPANEL_TOKEN = window.location.hostname == 'data.humdata.org' ? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  function mpTrack() {
    mixpanel.track('viz interaction', {
      'action': 'switch viz',
      'content': 'filtered',
      'country filter': selectValue === null ? selectPlaceholder : selectValue.map(item => item.label),
      'current view': 'table view',
      'embedded in': window.location.href,
      'page title': document.title,
      'is hrp filter': onlyHRP,
      'viz type': 'hapi coverage table'
    });
  }

  onMount(async () => {
    try {
      const [data, fetchedHrpCountries] = await Promise.all([getTableData(), fetchCountryData()]);
      hrpCountries = fetchedHrpCountries;
      allCountries = getCountries(data);
      allTableData = getAdminLevels(data);
      applyFilters();
      initTracking();
    } catch (error) {
      console.error('Failed to load data:', error);
      const loader = document.querySelector('.loader');
      if (loader) loader.remove();
    }
  });
</script>


<main>
  <div class='header'>
    <h1>Data Availability</h1>
    <p>The initial release of HDX HAPI in June 2024 followed the <a href='https://data.humdata.org/dashboards/overview-of-data-grids' target='_blank'>HDX Data Grids</a>, which brings together the most relevant crisis data across 20+ priority humanitarian operations. As of November 2024, geographic coverage has been expanded to include all countries where data is available. The level of disaggregation varies by data type and country.</p>
    <p>A live list of HDX HAPI data providers is available here: <a href='https://tinyurl.com/hapi-provider-list' target='_blank'>https://tinyurl.com/hapi-provider-list</a>.</p>
    <p>This table below displays the available data by administrative level for each subcategory and country included in HDX HAPI. Refer to the <a href='https://hdx-hapi.readthedocs.io/en/latest/' target='_blank'>documentation</a> for more detailed information about each of the subcategories. <a href='mailto:hdx@un.org'>Contact us</a> to request additional data types in future versions of HDX HAPI.</p>
  </div>

  <div class='subheader'>
    {#if countries.length > 0}
      <div class='select-wrapper'>
        <label>Filter by:</label>
        <label><input type='checkbox' checked={onlyHRP} on:change={onHRP}> Priority Humanitarian Countries only</label>
        <div class='select-group'>
          <Select
            items={countries}
            bind:value={selectValue}
            clearable
            multiple
            multiFullItemClearable
            placeholder='{selectPlaceholder}'
            showChevron
            on:change={onCountrySelect}
            on:clear={onCountryClear}
          />
        </div>
      </div>
    {/if}

    {#if Object.keys(currentTableData).length > 0}
      <Legend />
    {/if}
  </div>

  {#if Object.keys(currentTableData).length > 0}
    <Table {categories} {currentTableData} />
  {/if}

  <div class='loader'>
    <div class="loader-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>

</main>

<style>
  .header {
    margin-bottom: 48px;
    text-align: left;
    width: 80%;
  }
  .header p {
    font-size: 16px;
    line-height: 25px;
  }
  .subheader {
    display: flex;
    justify-content: space-between;
  }
  .select-wrapper {
    margin-bottom: 30px;
    min-width: 375px;
    max-width: 900px;
    z-index: 5;
  }
  .select-group {
    display: flex;
    --font: var(--hdx-font-body);
    --font-size: 14px;
    --color: var(--hdx-neutral-8);
    --placeholder-color: var(--hdx-neutral-8);
    --background: var(--hdx-neutral-0);
    --border: 1px solid var(--hdx-neutral-2);
    --border-focused: 1px solid var(--hdx-primary-5);
    --border-hover: 1px solid var(--hdx-primary-5);
    --border-radius: var(--hdx-radius-sm);
    --box-shadow: var(--hdx-shadow-sm);
    --margin: 5px 10px 0 0;
    --item-hover-bg: var(--hdx-primary-1);
    --list-border: 1px solid var(--hdx-neutral-1);
  }
  .select-wrapper > div .svelte-select {
    margin-right: 10px;
  }
  .select-wrapper label {
    font-size: 14px;
    display: block;
    margin-bottom: 5px;
  }
</style>
