// ── UTILITIES ───────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(v) {
  if (!v && v !== 0) return '—';
  return '$' + Number(v).toLocaleString();
}

function initials(name) {
  return (name || '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
}

function stageBadgeClass(stage) {
  const map = { New: 'new', Contacted: 'contacted', Quoted: 'quoted', Won: 'won', Lost: 'lost', Approved: 'approved' };
  return 'badge-' + (map[stage] || 'new');
}

function dayStatus(dateStr) {
  if (!dateStr) return '';
  const t = todayStr();
  if (dateStr < t) return 'overdue';
  if (dateStr === t) return 'today';
  return 'upcoming';
}

function tasksDueCount() {
  const t = todayStr();
  return tasks.filter(tk => !tk.done && tk.due && tk.due <= t).length;
}

function updateTaskBadge() {
  const count = tasksDueCount();
  const badge = document.getElementById('taskBadge');
  if (badge) { badge.style.display = count > 0 ? '' : 'none'; badge.textContent = count; }
}

function toast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function closeModal() {
  document.getElementById('modalContainer').innerHTML = '';
}

function escAttr(str) {
  return (str || '').toString().replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function activityIcon(type) {
  const icons = { Call: '📞', Email: '📧', SMS: '💬', Note: '📝', Visit: '🏠' };
  const cls = { Call: 'act-call', Email: 'act-email', SMS: 'act-sms', Note: 'act-note', Visit: 'act-visit' };
  return { icon: icons[type] || '📝', cls: cls[type] || 'act-note' };
}

function activityItemHTML(a) {
  const { icon, cls } = activityIcon(a.type);
  return `<div class="activity-item">
    <div class="activity-icon ${cls}">${icon}</div>
    <div class="activity-body">
      <div class="activity-title">${a.type}${a.contactName ? ' — ' + escAttr(a.contactName) : ''}</div>
      ${a.notes ? `<div class="activity-sub">${escAttr(a.notes)}</div>` : ''}
      <div class="activity-time">${escAttr(a.assign || '')}${a.assign && a.date ? ' · ' : ''}${a.date ? formatDate(a.date) : ''}</div>
    </div>
  </div>`;
}

// Services options
const SERVICES = ['Roofing', 'Siding', 'Gutters', 'Patio', 'Deck', 'Other'];
const STAGES = ['New', 'Contacted', 'Quoted', 'Won', 'Lost'];
const SOURCES = ['Referral', 'Door knock', 'Website', 'Social media', 'Sign/yard', 'Google', 'Nextdoor', 'Other'];
const ACTIVITY_TYPES = ['Call', 'Email', 'SMS', 'Note', 'Visit'];
