// ── APP ROUTER ───────────────────────────────────────────
let currentPage = 'dashboard';
let currentContactId = null;

const PAGE_CONFIG = {
  dashboard:      { title: 'Dashboard',          render: renderDashboard },
  pipeline:       { title: 'Pipeline',            render: renderPipeline },
  contacts:       { title: 'Contacts',            render: renderContacts,   action: contactsTopbar },
  estimates:      { title: 'Estimates',           render: renderEstimates,  action: estimatesTopbar },
  tasks:          { title: 'Tasks & follow-ups',  render: renderTasks,      action: tasksTopbar },
  activity:       { title: 'Activity log',        render: renderActivity,   action: activityTopbar },
  import:         { title: 'Import / Export',     render: renderImport },
  contact_detail: { title: 'Contact detail',      render: renderContactDetail },
};

// Pages Aaron (Brother) can access
const BROTHER_PAGES = ['contacts', 'contact_detail'];

function isBrother() {
  return document.getElementById('currentUser')?.value === 'Brother';
}

function showPage(page, contactId) {
  // If Brother tries to access a restricted page, redirect to contacts
  if (isBrother() && !BROTHER_PAGES.includes(page)) {
    page = 'contacts';
  }

  if (contactId) currentContactId = contactId;
  currentPage = page;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navMap = { dashboard:0, pipeline:1, contacts:2, estimates:3, tasks:4, activity:5, import:6 };
  const navItems = document.querySelectorAll('.nav-item');
  if (navMap[page] !== undefined && navItems[navMap[page]]) navItems[navMap[page]].classList.add('active');

  const cfg = PAGE_CONFIG[page];
  document.getElementById('pageTitle').textContent = cfg?.title || page;
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-sm" onclick="manualSync()">⟳ Sync</button>`;
  if (cfg?.action) cfg.action();
  if (cfg?.render) cfg.render();
  updateTaskBadge();
  closeSidebar();
}

function updateSidebarForUser() {
  const brother = isBrother();
  // Hide/show nav items based on user
  const allNavItems = document.querySelectorAll('.nav-item[data-page]');
  allNavItems.forEach(el => {
    const page = el.dataset.page;
    if (brother) {
      el.style.display = BROTHER_PAGES.includes(page) || page === 'contacts' ? '' : 'none';
    } else {
      el.style.display = '';
    }
  });
  // Hide dividers if brother
  document.querySelectorAll('.nav-divider').forEach(el => {
    el.style.display = brother ? 'none' : '';
  });
  // Hide task badge area if brother
  const taskBadge = document.getElementById('nav-tasks');
  if (taskBadge) taskBadge.style.display = brother ? 'none' : '';
}

function contactsTopbar() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-sm" onclick="manualSync()">⟳ Sync</button>
     <button class="btn btn-primary" onclick="openContactModal()">+ Add contact</button>`;
}
function estimatesTopbar() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-sm" onclick="manualSync()">⟳ Sync</button>
     <button class="btn btn-primary" onclick="openEstimateModal()">+ Add estimate</button>`;
}
function tasksTopbar() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-sm" onclick="manualSync()">⟳ Sync</button>
     <button class="btn btn-primary" onclick="openTaskModal()">+ Add task</button>`;
}
function activityTopbar() {
  document.getElementById('topbarActions').innerHTML =
    `<button class="btn btn-sm" onclick="manualSync()">⟳ Sync</button>
     <button class="btn btn-primary" onclick="openActivityModal()">+ Log activity</button>`;
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('mobileOverlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('show');
}

async function manualSync() {
  await loadFromSheets();
  const cfg = PAGE_CONFIG[currentPage];
  if (cfg?.render) cfg.render();
  updateTaskBadge();
}

// Wire nav clicks
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => showPage(el.dataset.page));
});

// When user switches between Me/Brother
document.getElementById('currentUser').addEventListener('change', () => {
  saveSettings();
  updateSidebarForUser();
  // Redirect brother to contacts if on a restricted page
  if (isBrother() && !BROTHER_PAGES.includes(currentPage)) {
    showPage('contacts');
  } else {
    showPage(currentPage);
  }
});

// Init
const settings = loadSettings();
if (settings.user) document.getElementById('currentUser').value = settings.user;
updateSidebarForUser();
showPage(isBrother() ? 'contacts' : 'dashboard');
loadFromSheets().then(() => {
  const cfg = PAGE_CONFIG[currentPage];
  if (cfg?.render) cfg.render();
});
