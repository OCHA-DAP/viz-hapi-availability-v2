<script>
  import { onMount } from 'svelte';
  import { sandboxBaseURL, sandboxURL } from '../config.js';

  let table, highlightedCells = [];

  export let categories;
  export let currentTableData;

  function onMouseover(e) {
    highlightCells(e.currentTarget);
  }

  function onMouseout() {
    resetCells();
  }

  function highlightCells(cell) {
    const row = cell.parentElement;
    const colIndex = cell.cellIndex;
    const rowIndex = row.rowIndex;

    highlightedCells = [];

    // highlight cells above in same column (skip category header row at index 0)
    for (let i = 1; i <= rowIndex; i++) {
      const c = table.rows[i].cells[colIndex];
      c.classList.add('highlighted');
      highlightedCells.push(c);
    }

    // highlight cells to the left in same row (including current cell)
    for (let i = 0; i <= colIndex; i++) {
      const c = row.cells[i];
      c.classList.add('highlighted');
      highlightedCells.push(c);
    }
  }

  function resetCells() {
    highlightedCells.forEach(c => c.classList.remove('highlighted'));
    highlightedCells = [];
  }

  function setTableHeight(el) {
    const yPos = el.getBoundingClientRect().top;
    el.style.height = `${window.innerHeight - yPos}px`;
  }

  onMount(() => {
    let loader = document.querySelector('.loader');
    if (loader) loader.remove();

    table = document.getElementById('coverageTable');

    const tableWrapper = document.querySelector('.table-wrapper');
    setTableHeight(tableWrapper);
  });
</script>

<div class='container'>
  <div class='table-wrapper'>
    <table id='coverageTable'>
      <thead>
        <tr>
          <th class='fixed-col category'></th>
          {#each Object.entries(categories) as [category, subcategories]}
            <th class='category' colspan={subcategories.length}>{category}</th>
          {/each}
        </tr>
        <tr>
          <th class='fixed-col'></th>
          {#each Object.entries(categories) as [category, subcategories]}
            {#each subcategories as subcategory}
              <th>{subcategory}<br>
                <span>
                  <a href={(sandboxURL[subcategory] !== undefined) ? sandboxURL[subcategory] : sandboxBaseURL} target='_blank'>Go to API Sandbox</a>
                </span>
              </th>
            {/each}
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each Object.entries(currentTableData) as [country, subcategories]}
          <tr>
            <td class='fixed-col'><div class='country'>{country}</div></td>
            {#each Object.entries(subcategories) as [subcategory, hasData]}
              <td class='cell' on:mouseover={onMouseover} on:mouseout={onMouseout}>
                <div class='admin-key ${subcategory}'>
                  {#if (!hasData.admin0 && !hasData.admin1 && !hasData.admin2)}
                    <div><i class='no-data'></i></div>
                  {:else}
                    <div class={`admin-icon national ${hasData.admin0 ? '' : 'hide'}`}>0</div>
                    <div class={`admin-icon subnational1 ${hasData.admin1 ? '' : 'hide'}`}>1</div>
                    <div class={`admin-icon subnational2 ${hasData.admin2 ? '' : 'hide'}`}>2</div>
                  {/if}
                </div>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>


<style lang='scss'>
  .container {
    position: relative;
  }
  .table-wrapper {
    display: block;
    height: 600px;
    margin: 0;
    overflow: auto;
    padding: 0;
    position: relative;
    width: 100%;
  }
  table {
    border: 0;
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
  }

  th, td {
    border-right: 1px solid var(--hdx-neutral-1);
    line-height: 16px;
    padding: 8px 12px;
    &:last-child {
      border-right: 0;
    }
  }

  td {
    border-top: 1px solid var(--hdx-neutral-1);
  }

  thead th {
    background-color: var(--hdx-neutral-0);
    font-family: var(--hdx-font-body);
    font-size: 14px;
    font-weight: 700;
    line-height: 16px;
    position: sticky;
    padding: 10px 12px;
    top: 38px;
  }

  th span {
    display: block;
    font-family: var(--hdx-font-body);
    font-size: 14px;
    font-weight: 400;
    padding: 4px 0;
  }

  th.category {
    background-color: var(--hdx-neutral-1);
    border: 1px solid var(--hdx-neutral-0);
    top: 0;
    &:nth-child(1) {
      background-color: var(--hdx-neutral-0);
    }
    &:nth-child(2) {
      border-left: 0;
    }
  }

  th.fixed-col.category,
  .fixed-col {
    background-color: var(--hdx-neutral-0);
    font-family: var(--hdx-font-body);
    font-size: 14px;
    font-weight: 700;
    line-height: 18px;
    left: 0;
    position: -webkit-sticky;
    position: sticky;
    text-transform: uppercase;
    width: 250px;
    z-index: 3;
  }
  .fixed-col .country {
    padding: 10px 12px;
    width: 250px;
  }

  thead .fixed-col {
    border-top: 0;
  }

  tbody .fixed-col {
    z-index: 1;
  }

  :global(.highlighted) {
    background-color: var(--hdx-brand-1);
  }
</style>
