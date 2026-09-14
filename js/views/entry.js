import { apiGet, apiPost } from '../api.js';
import { state, activeEmployees } from '../store.js';
import { renderPeriodPicker } from './periodPicker.js';

export function renderEntry(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Data Entry</h2>
      <p class="muted">Enter days worked, weights, pockets and overtime hours for each worker for the selected period. Leave a cell blank/zero if a category doesn't apply.</p>
      <div id="entry-period"></div>
      <div style="margin-top:10px">
        <label>Filter by payroll group</label>
        <select id="entry-group-filter"><option value="">-- all groups --</option>${state.payGroups.map((g) => `<option>${g.GroupName}</option>`).join('')}</select>
        <input id="entry-search" type="text" placeholder="Search name..." style="width:200px" />
      </div>
    </div>
    <div id="entry-table-wrap"></div>
  `;

  let currentPeriodId = null;
  let entriesByEmployee = {}; // { employeeId: { categoryKey: quantity } }

  renderPeriodPicker(document.getElementById('entry-period'), async (periodId) => {
    currentPeriodId = periodId;
    await loadAndDraw();
  });

  document.getElementById('entry-group-filter').addEventListener('change', drawTable);
  document.getElementById('entry-search').addEventListener('input', drawTable);

  async function loadAndDraw() {
    document.getElementById('entry-table-wrap').innerHTML = '<p class="muted">Loading entries...</p>';
    const entries = await apiGet('entries', { periodId: currentPeriodId });
    entriesByEmployee = {};
    entries.forEach((e) => {
      if (!entriesByEmployee[e.EmployeeID]) entriesByEmployee[e.EmployeeID] = {};
      entriesByEmployee[e.EmployeeID][e.CategoryKey] = e.Quantity;
    });
    drawTable();
  }

  function drawTable() {
    if (!currentPeriodId) return;
    const wrap = document.getElementById('entry-table-wrap');
    const groupFilter = document.getElementById('entry-group-filter').value;
    const term = document.getElementById('entry-search').value.trim().toLowerCase();

    const employees = activeEmployees().filter((e) =>
      (!groupFilter || e.PayrollGroup === groupFilter) &&
      (!term || String(e.Name).toLowerCase().includes(term)));

    const categories = state.categories;

    let html = `<div class="card"><div class="table-scroll"><table id="entry-grid"><thead><tr><th class="sticky-col">Employee</th>`;
    categories.forEach((c) => { html += `<th title="${escapeAttr(c.Notes)}">${c.Label}<br><span class="muted small">${c.Unit}</span></th>`; });
    html += `<th></th></tr></thead><tbody>`;

    employees.forEach((emp) => {
      html += `<tr data-emp="${emp.EmployeeID}"><td class="sticky-col">${emp.Name}<br><span class="muted small">${emp.PayrollGroup || ''}</span></td>`;
      categories.forEach((c) => {
        const val = (entriesByEmployee[emp.EmployeeID] && entriesByEmployee[emp.EmployeeID][c.CategoryKey]) || '';
        html += `<td><input type="number" step="0.01" class="qty-input" data-cat="${c.CategoryKey}" value="${val}" /></td>`;
      });
      html += `<td><button class="row-save secondary" data-emp="${emp.EmployeeID}">Save</button></td></tr>`;
    });
    html += `</tbody></table></div>
      <div style="margin-top:10px"><button id="save-all">Save All Rows</button> <span id="entry-status" class="muted"></span></div>
      </div>`;
    wrap.innerHTML = html;

    wrap.querySelectorAll('.row-save').forEach((btn) => {
      btn.addEventListener('click', () => saveRow(btn.dataset.emp));
    });
    document.getElementById('save-all').addEventListener('click', saveAll);
  }

  async function saveRow(employeeId) {
    const tr = document.querySelector(`#entry-grid tbody tr[data-emp="${employeeId}"]`);
    const entries = [...tr.querySelectorAll('.qty-input')]
      .map((input) => ({ CategoryKey: input.dataset.cat, Quantity: parseFloat(input.value) || 0 }))
      .filter((e) => e.Quantity !== 0);
    await apiPost('bulkSaveEntries', { periodId: currentPeriodId, employeeId, entries });
  }

  async function saveAll() {
    const status = document.getElementById('entry-status');
    const rows = [...document.querySelectorAll('#entry-grid tbody tr')];
    status.textContent = `Saving 0/${rows.length}...`;
    for (let i = 0; i < rows.length; i++) {
      await saveRow(rows[i].dataset.emp);
      status.textContent = `Saving ${i + 1}/${rows.length}...`;
    }
    status.textContent = `Saved ${rows.length} rows.`;
  }
}

function escapeAttr(s) {
  return String(s === undefined || s === null ? '' : s).replace(/"/g, '&quot;');
}
