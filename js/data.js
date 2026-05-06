// ── DATA LAYER — Google Sheets Backend ──────────────────
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyGkrFjiH5piIMP_zIBlaVawSXC3ri-H7NcGH4UxYNSXebBNS0fpSm5Q8nv6X-QRO0s_g/exec';

const KEYS = {
  contacts: 'tq_contacts',
  estimates: 'tq_estimates',
  tasks: 'tq_tasks',
  activity: 'tq_activity',
  settings: 'tq_settings',
};

let contacts = [];
let estimates = [];
let tasks = [];
let activity = [];

function loadLocal(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch(e) { return []; }
}
function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function loadAll() {
  contacts  = loadLocal(KEYS.contacts);
  estimates = loadLocal(KEYS.estimates);
  tasks     = loadLocal(KEYS.tasks);
  activity  = loadLocal(KEYS.activity);
}
function persist() {
  saveLocal(KEYS.contacts,  contacts);
  saveLocal(KEYS.estimates, estimates);
  saveLocal(KEYS.tasks,     tasks);
  saveLocal(KEYS.activity,  activity);
}
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(KEYS.settings) || '{}'); } catch(e) { return {}; }
}
function saveSettings() {
  localStorage.setItem(KEYS.settings, JSON.stringify({ user: document.getElementById('currentUser').value }));
}

// ── API ───────────────────────────────────────────────────
// GET requests work fine (no CORS issue) — use for reads and writes
// Encode everything as URL params on GET request

async function gasCall(params) {
  const url = SCRIPT_URL + '?' + new URLSearchParams(params).toString();
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return await res.json();
  } catch(e) {
    // If fetch fails due to redirect/cors, try XMLHttpRequest
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = () => {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch(e) { resolve({ error: 'Parse error' }); }
      };
      xhr.onerror = () => resolve({ error: 'Network error' });
      xhr.send();
    });
  }
}

async function loadFromSheets() {
  try {
    showSyncStatus('Syncing...');
    const sheets = ['Contacts','Estimates','Tasks','Activity'];
    const results = await Promise.all(
      sheets.map(s => gasCall({ action: 'getAll', sheet: s }))
    );
    if (results[0].records !== undefined) contacts  = results[0].records;
    if (results[1].records !== undefined) estimates = results[1].records;
    if (results[2].records !== undefined) tasks     = results[2].records;
    if (results[3].records !== undefined) activity  = results[3].records;
    persist();
    showSyncStatus('Synced ✓', true);
    return true;
  } catch(err) {
    console.error('Sync error:', err);
    showSyncStatus('Offline — local data', false, true);
    return false;
  }
}

async function pushRecord(sheetName, record) {
  try {
    const result = await gasCall({
      action: 'upsert',
      sheet: sheetName,
      record: JSON.stringify(record),
    });
    if (result.ok) {
      showSyncStatus('Saved ✓', true);
    } else {
      console.warn('Push result:', result);
      showSyncStatus('Sync issue — data saved locally', false, true);
    }
  } catch(err) {
    console.error('Push error:', err);
    showSyncStatus('Save failed', false, true);
  }
}

async function pushDelete(sheetName, id) {
  try {
    await gasCall({ action: 'delete', sheet: sheetName, id });
  } catch(err) {
    console.warn('Delete sync failed:', err);
  }
}

async function pushAllToSheets() {
  try {
    showSyncStatus('Uploading all data...');
    // For full sync we need to send large data — chunk it sheet by sheet
    const sheets = ['Contacts','Estimates','Tasks','Activity'];
    const data = { Contacts: contacts, Estimates: estimates, Tasks: tasks, Activity: activity };
    for (const name of sheets) {
      const records = data[name];
      if (!records.length) continue;
      for (const record of records) {
        await gasCall({ action: 'upsert', sheet: name, record: JSON.stringify(record) });
      }
    }
    showSyncStatus('Uploaded ✓', true);
  } catch(err) {
    showSyncStatus('Upload failed', false, true);
  }
}

// ── SYNC STATUS ──────────────────────────────────────────
let syncTimer = null;
function showSyncStatus(msg, success, error) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.color = success ? '#2ea872' : error ? '#f87171' : '#9ca3af';
  clearTimeout(syncTimer);
  if (success) syncTimer = setTimeout(() => { el.textContent = ''; }, 3000);
}

// Auto-refresh every 30s
setInterval(async () => {
  if (!document.hidden) {
    const snap = JSON.stringify({ contacts, estimates, tasks, activity });
    await loadFromSheets();
    if (snap !== JSON.stringify({ contacts, estimates, tasks, activity })) {
      if (typeof currentPage !== 'undefined') {
        if (currentPage === 'dashboard') renderDashboard();
        else if (currentPage === 'contacts') renderContacts();
        else if (currentPage === 'pipeline') renderPipeline();
        else if (currentPage === 'tasks') renderTasks();
      }
    }
  }
}, 30000);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadFromSheets();
});

loadAll();
