<script>
  import Papa from 'papaparse';
  import { onMount } from 'svelte';
  import Select from 'svelte-select';

  import Legend from './components/Legend.svelte';
  import Table from './components/Table.svelte';

  
  let categories = {}
  let countries = []
  let hrpCountries = []

  let allCategories = []
  let allCountries = []
  let allTableData = {}

  let onlyHRP = false;
  let selectPlaceholder = 'All Priority Humanitarian Countries';

  $: currentTableData = {}
  $: selectValue = null;


  // future improvement to pull cat and subcats from here https://raw.githubusercontent.com/OCHA-DAP/hapi-sqlalchemy-schema/refs/heads/main/src/hapi_schema/utils/endpoint_constants.py
  const categoryLabels = {
    'affected-people': 'Affected People',
    'coordination-context': 'Coordination & Context',
    'food-security-nutrition-poverty': 'Food Security, Nutrition & Poverty',
    'geography-infrastructure': 'Geography & Infrastructure',
    'climate': 'Climate'
  };

  const subcategoryLabels = {
    'humanitarian-needs': 'Humanitarian Needs',
    'idps': 'Internally-Displaced Persons',
    'refugees-persons-of-concern': 'Refugees & Persons of Concern',
    'returnees': 'Returnees',
    'conflict-events': 'Conflict Events',
    'funding': 'Funding',
    'national-risk': 'National Risk',
    'operational-presence': 'Who Is Doing What Where - Operational Presence',
    'food-prices-market-monitor': 'Food Prices',
    'food-security': 'Food Security',
    'poverty-rate': 'Poverty Rate',
    'baseline-population': 'Baseline Population',
    'hazards-rainfall': 'Rainfall'
  };

  const base_url = 'https://hapi.humdata.org/api/v2/';
  const app_indentifier = 'aGFwaS1kYXNoYm9hcmQ6ZXJpa2Eud2VpQHVuLm9yZw==';


  // get country data from metadata endpoint
  async function fetchCountryData() {
    const url = `${base_url}/metadata/location?app_identifier=${app_indentifier}&offset=0&output_format=csv&limit=10000`;
    try {
      const response = await fetch(url);
      const csvText = await response.text();
      const parsedData = Papa.parse(csvText, {header: true, skipEmptyLines: true, dynamicTyping: true });

      // only return hrp countries
      return parsedData.data.filter(row => row.has_hrp === 'True').map(row => row.code);
    } catch (error) {
      console.error('Error fetching and parsing CSV data:', error);
      return null;
    }
  }

  // get data from data availability endpoint
  async function getTableData() {
    let data = [];
    let offset = 0;
    let fetchedData;

    do {
      let endpoint = `${base_url}/metadata/data-availability?output_format=csv&app_identifier=${app_indentifier}&offset=${offset}&limit=10000`
      fetchedData = await fetchTablePageData(endpoint);
      data = data.concat(fetchedData);
      offset += 10000;
    } while (fetchedData.length >= 10000);

    return data;
  }

  // get data by page (max 10000 results returned in each query)
  async function fetchTablePageData(endpoint) {
    try {
      const response = await fetch(endpoint);
      const text = await response.text();
      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          complete: results => resolve(results.data),
          error: err => reject(err)
        });
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        throw error;
      }
    }
  }


  // get unique list of countries from data availability results and format for select component
  function getCountries(data) {
    const uniqueCountryCodes = new Set();
    allCountries = data.reduce((acc, row) => {
      if (!uniqueCountryCodes.has(row.location_code) && row.location_code) {
        uniqueCountryCodes.add(row.location_code);
        acc.push({ value: row.location_code, label: row.location_name });
      }
      return acc;
    }, []);
    return allCountries;
  }

  // get categories and subcategories from data availability results
  function getCategories(data) {
    data.forEach(({ category, subcategory }) => {
      if (category !== '' && category !== undefined) {
        // get label from mapping
        const categoryName = categoryLabels[category] || category;
        
        // if category doesn't exist, create a new array
        if (!categories[categoryName]) {
          categories[categoryName] = [];
        }

        // get label from mapping
        const subcategoryName = subcategoryLabels[subcategory] || subcategory;

        // add subcategory if hasn't already been added
        if (!categories[categoryName].includes(subcategoryName)) {
          categories[categoryName].push(subcategoryName);
        }
      }
    });
    return categories;
  }


  // get admin availability for each subcategory
  function getAdminLevels(data) {
    // dict to store admin level availability data
    const adminLevels = {};

    // get unique subcategories from data availability results
    const allSubcategories = new Set(data.map(row => row.subcategory));

    // extract data and format for table
    data.forEach(row => {
      if (row.location_name !== undefined) {        
        const { location_name, subcategory, admin1_name, admin2_name } = row;

        // create country and subcategory if not already created
        if (!adminLevels[location_name]) {
          adminLevels[location_name] = {};

          // make sure every country has all subcategories and set all to false to start
          allSubcategories.forEach(subcat => {
            if (subcat !== undefined) {
              adminLevels[location_name][subcat] = {
                admin0: false,
                admin1: false,
                admin2: false
              };
            }
          });
        }

        // logic to determine admin level
        if (row.admin_level === '0') {
          adminLevels[location_name][subcategory].admin0 = true;
        } 
        else if (row.admin_level === '1') {
          adminLevels[location_name][subcategory].admin1 = true;
        } 
        else if (row.admin_level === '2') {
          adminLevels[location_name][subcategory].admin2 = true;
        }
      }
    });

    // sort location_names alphabetically
    const sortedAdminLevels = Object.keys(adminLevels)
      .sort()  
      .reduce((sortedObj, location_name) => {
          sortedObj[location_name] = adminLevels[location_name];
          return sortedObj;
      }, {});
      
    return sortedAdminLevels;
  }


  function setCountries() {
    // reset select component
    selectValue = null;
    selectPlaceholder = (onlyHRP) ? 'All Priority Humanitarian Countries' : 'All Available Countries';

    // filter countries based on value of onlyHRP checkbox
    countries = (onlyHRP) ? allCountries.filter(country => hrpCountries.includes(country.value)) : allCountries;

    // sort countries alphabetically
    countries.sort((a, b) => a.label.localeCompare(b.label));

    // reset table data to match filtered countries
    currentTableData = countries.reduce((acc, country) => {
      acc[country.label] = allTableData[country.label];
      return acc;
    }, {});
  }

  // event handlers
  function onCountrySelect(e) {
    currentTableData = e.detail.reduce((acc, country) => {
      acc[country.label] = allTableData[country.label];
      return acc;
    }, {});

    // send mixpanel event
    mpTrack();
  }
  function onCountryClear() {
    setCountries();
  }
  function onHRP(e) {
    onlyHRP = e.target.checked;
    setCountries();

    // send mixpanel event
    mpTrack();
  }

  // helper function to format strings for display
  function formatStr(str) {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }


  function initTracking() {
    // initialize mixpanel
    var MIXPANEL_TOKEN = window.location.hostname=='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  function mpTrack() {
    // mixpanel event
    let eventObject = {
      'action': 'switch viz',
      'content': 'filtered',
      'country filter': (selectValue === null) ? selectPlaceholder : selectValue.map(item => item.label),
      'current view': 'table view',
      'embedded in': window.location.href,
      'page title': document.title,
      'is hrp filter': onlyHRP,
      'viz type': 'hapi coverage table'
    }
    mixpanel.track('viz interaction', eventObject);
  }


  onMount(async () => {
    // get table data
    let data = await getTableData();

    // get list of hrp countries
    hrpCountries = await fetchCountryData();

    // get list of countries
    countries = getCountries(data);
    
    // get categories
    categories = getCategories(data);

    // *todo: add category select filter
    Object.entries(categories).forEach(category => {
      allCategories.push({value: category[0], label: formatStr(category[0])})
    })

    // format data for coverage table
    allTableData = getAdminLevels(data);

    // set initial list of countries to show only hrp by default
    setCountries();

    // mixpanel tracking
    initTracking();
  });
</script>


<main>  
  <div class='header'>
    <h1>Data Availability in HDX HAPI</h1>
    <p>The initial release of HDX HAPI in June 2024 followed the <a href='https://data.humdata.org/dashboards/overview-of-data-grids' target='_blank'>HDX Data Grids</a>, which brings together the most relevant crisis data across 20+ priority humanitarian operations. As of November 2024, geographic coverage has been expanded to include all countries where data is available. The level of disaggregation varies by data type and country.</p>
    <p>A live list of HDX HAPI data providers is available here: <a href='https://tinyurl.com/hapi-provider-list' target='_blank'>https://tinyurl.com/hapi-provider-list</a>.</p>
    <p>This table below displays the available data by administrative level for each subcategory and country included in HDX HAPI. Refer to the <a href='https://hdx-hapi.readthedocs.io/en/latest/' target='_blank'>documentation</a> for more detailed information about each of the subcategories. <a href='mailto:hdx@un.org'>Contact us</a> to request additional data types in future versions of HDX HAPI.</p>
  </div>

  <div class='subheader'>
    {#if countries.length>0}
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
    <div class="sp sp-circle"></div>
    <span>Loading data...</span>
  </div>

</main>

<style>
  .header {
    margin: 0 auto 30px;
    text-align: center;
    width: 75%;
  }
  .header p {
    font-size: 18px;
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
    --border: 1px solid #CCC;    
    --border-focused: 1px solid #007CE0;
    --border-hover: 1px solid #007CE0;
    --margin: 5px 10px 0 0;
    --item-hover-bg: #CCE5F9;
    --list-border: 1px solid #EEE;
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