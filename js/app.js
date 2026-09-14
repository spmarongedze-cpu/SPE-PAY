import { isConfigured } from './api.js';
import { loadBootstrap } from './store.js';

import { renderSettings } from './views/settings.js';
import { renderEmployees } from './views/employees.js';
import { renderCategories } from './views/categories.js';
import { renderEntry } from './views/entry.js';
import { renderDeductions } from './views/deductions.js';
import { renderPayroll } from './views/payroll.js';
import { renderGrossUp } from './views/grossup.js';

const routes = {
  '#/employees': { label: 'Employees', render: renderEmployees, needsData: true },
  '#/rates': { label: 'Pay Categories & Rates', render: renderCategories, needsData: true },
  '#/entry': { label: 'Data Entry', render: renderEntry, needsData: true },
  '#/deductions': { label: 'Deductions', render: renderDeductions, needsData: true },
  '#/payroll': { label: 'Run Payroll', render: renderPayroll, needsData: true },
  '#/grossup': { label: 'Gross-Up Calculator', render: renderGrossUp, needsData: true },
  '#/settings': { label: 'Settings', render: renderSettings, needsData: false }
};

const nav = document.getElementById('nav');
const main = document.getElementById('main');
const statusEl = document.getElementById('conn-status');

function buildNav() {
  nav.innerHTML = '';
  Object.entries(routes).forEach(([hash, route]) => {
    const a = document.createElement('a');
    a.href = hash;
    a.textContent = route.label;
    a.className = 'nav-link';
    nav.appendChild(a);
  });
}

async function router() {
  const hash = location.hash || (isConfigured() ? '#/employees' : '#/settings');
  if (!routes[hash]) {
    location.hash = isConfigured() ? '#/employees' : '#/settings';
    return;
  }
  const route = routes[hash];

  document.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  });

  if (route.needsData && !isConfigured()) {
    main.innerHTML = `<div class="card"><h2>Not connected</h2>
      <p>Open <a href="#/settings">Settings</a> and enter your Google Apps Script Web App URL and API token first.</p></div>`;
    setStatus(false);
    return;
  }

  if (route.needsData) {
    main.innerHTML = '<p class="muted">Loading...</p>';
    try {
      await loadBootstrap();
      setStatus(true);
    } catch (err) {
      main.innerHTML = `<div class="card error"><h2>Could not load data</h2><p>${escapeHtml(err.message)}</p></div>`;
      setStatus(false);
      return;
    }
  }

  main.innerHTML = '';
  route.render(main);
}

function setStatus(connected) {
  statusEl.textContent = connected ? 'Connected' : 'Not connected';
  statusEl.className = connected ? 'status ok' : 'status bad';
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  buildNav();
  router();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
