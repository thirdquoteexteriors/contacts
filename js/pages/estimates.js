// ── ESTIMATES ────────────────────────────────────────────
function renderEstimates() {
  const search = (document.getElementById('estSearch')?.value || '').toLowerCase();
  const fStatus = document.getElementById('fEstStatus')?.value || '';
  const filtered = estimates.filter(e => {
    const c = contacts.find(x => x.id === e.contactId);
    const name = c ? (c.first + ' ' + c.last).toLowerCase() : '';
    return (!search || name.includes(search) || (e.title || '').toLowerCase().includes(search))
      && (!fStatus || e.status === fStatus);
  });
  const byStatus = s => estimates.filter(e => e.status === s).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  document.getElementById('content').innerHTML = `
    <div class="stats-grid" style="margin-bottom:16px">
      ${['Quoted','Approved','Won','Lost'].map(s => `
        <div class="stat-card"><div class="stat-label">${s}</div>
        <div class="stat-value" style="font-size:18px">${formatMoney(byStatus(s))}</div>
        <div class="stat-sub">${estimates.filter(e => e.status === s).length} estimate${estimates.filter(e => e.status === s).length !== 1 ? 's' : ''}</div></div>`).join('')}
    </div>
    <div class="filters-bar">
      <input class="search-input" id="estSearch" placeholder="Search contact or title..." value="${escAttr(search)}" oninput="renderEstimates()">
      <select class="filter-select" id="fEstStatus" onchange="renderEstimates()">
        <option value="">All statuses</option>
        ${['Quoted','Approved','Won','Lost'].map(s => `<option ${fStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Contact</th><th>Title</th><th>Service</th><th>Amount</th><th>Status</th><th>Date</th><th>Notes</th><th></th></tr></thead>
        <tbody>
          ${filtered.length ? filtered.map(e => {
            const c = contacts.find(x => x.id === e.contactId);
            return `<tr>
              <td style="font-weight:500;cursor:pointer" onclick="showContactDetail('${e.contactId}')">${c ? escAttr(c.first + ' ' + c.last) : '—'}</td>
              <td>${escAttr(e.title || '—')}</td>
              <td>${escAttr(e.service || '—')}</td>
              <td class="mono">${formatMoney(e.amount)}</td>
              <td><span class="badge ${stageBadgeClass(e.status)}">${e.status || 'Quoted'}</span></td>
              <td>${formatDate(e.date)}</td>
              <td style="color:var(--gray-400);font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escAttr(e.notes || '—')}</td>
              <td><div style="display:flex;gap:4px">
                <button class="btn btn-sm btn-ghost" onclick="openEstimateModal('${e.id}')">Edit</button>
                <button class="btn btn-sm btn-ghost btn-danger" onclick="deleteEstimate('${e.id}')">Del</button>
              </div></td>
            </tr>`;
          }).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No estimates yet</div></div></td></tr>`}
        </tbody>
      </table>
    </div>`;
}

function openEstimateModal(id, contactId) {
  const e = id ? estimates.find(x => x.id === id) : null;
  const cid = e?.contactId || contactId || '';
  const cOpts = contacts.map(c => `<option value="${c.id}" ${cid === c.id ? 'selected' : ''}>${escAttr(c.first + ' ' + c.last)}</option>`).join('');
  document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">${e ? 'Edit estimate' : 'New estimate'}</div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group full"><label class="form-label">Contact</label>
            <select class="form-input" id="eContact"><option value="">Select contact...</option>${cOpts}</select>
          </div>
          <div class="form-group full"><label class="form-label">Title</label>
            <input class="form-input" id="eTitle" value="${escAttr(e?.title || '')}" placeholder="e.g. Full roof replacement">
          </div>
          <div class="form-group"><label class="form-label">Service</label>
            <select class="form-input" id="eService">
              ${SERVICES.map(s => `<option ${e?.service === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Amount ($)</label>
            <input class="form-input" id="eAmount" type="number" value="${escAttr(e?.amount || '')}" placeholder="0">
          </div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-input" id="eStatus">
              ${['Quoted','Approved','Won','Lost'].map(s => `<option ${(e?.status || 'Quoted') === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Date</label>
            <input class="form-input" id="eDate" type="date" value="${escAttr(e?.date || todayStr())}">
          </div>
          <div class="form-group full"><label class="form-label">Notes</label>
            <textarea class="form-input" id="eNotes">${escAttr(e?.notes || '')}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEstimate('${e?.id || ''}')">Save estimate</button>
      </div>
    </div></div>`;
}

async function saveEstimate(id) {
  const data = {
    contactId: document.getElementById('eContact').value,
    title: document.getElementById('eTitle').value.trim(),
    service: document.getElementById('eService').value,
    amount: document.getElementById('eAmount').value,
    status: document.getElementById('eStatus').value,
    date: document.getElementById('eDate').value,
    notes: document.getElementById('eNotes').value.trim(),
  };
  if (!data.contactId) { alert('Please select a contact.'); return; }
  let record;
  if (id) {
    const idx = estimates.findIndex(e => e.id === id);
    if (idx !== -1) { estimates[idx] = { ...estimates[idx], ...data }; record = estimates[idx]; }
  } else {
    record = { id: uid(), created: new Date().toISOString(), ...data };
    estimates.unshift(record);
  }
  persist(); closeModal(); toast(id ? 'Estimate updated' : 'Estimate added');
  await pushRecord('Estimates', record);
  if (currentPage === 'estimates') renderEstimates();
  else if (currentPage === 'contact_detail') renderContactDetail();
}

async function deleteEstimate(id) {
  if (!confirm('Delete this estimate?')) return;
  estimates = estimates.filter(e => e.id !== id);
  persist(); toast('Deleted');
  await pushDelete('Estimates', id);
  if (currentPage === 'estimates') renderEstimates();
  else renderContactDetail();
}

// ── TASKS ────────────────────────────────────────────────
function renderTasks() {
  const fDone = document.getElementById('fDone')?.value || 'open';
  const t = todayStr();
  let filtered = tasks.filter(tk => fDone === 'all' ? true : fDone === 'open' ? !tk.done : tk.done);
  filtered.sort((a, b) => { if (!a.due && !b.due) return 0; if (!a.due) return 1; if (!b.due) return -1; return a.due.localeCompare(b.due); });
  document.getElementById('content').innerHTML = `
    <div class="filters-bar">
      <select class="filter-select" id="fDone" onchange="renderTasks()">
        <option value="open" ${fDone==='open'?'selected':''}>Open tasks</option>
        <option value="done" ${fDone==='done'?'selected':''}>Completed</option>
        <option value="all" ${fDone==='all'?'selected':''}>All</option>
      </select>
    </div>
    <div class="tasks-list">
      ${filtered.length ? filtered.map(tk => {
        const ds = tk.done ? '' : dayStatus(tk.due);
        return `<div class="task-item ${ds}">
          <div class="task-check ${tk.done?'done':''}" onclick="toggleTask('${tk.id}');renderTasks()">✓</div>
          <div class="task-body" style="flex:1">
            <div class="task-title ${tk.done?'done':''}">${escAttr(tk.title)}</div>
            <div class="task-meta">${tk.contactName?'For: '+escAttr(tk.contactName):''}${tk.assign?(tk.contactName?' · ':'')+escAttr(tk.assign):''}</div>
            ${tk.due?`<div class="task-due ${ds}">${ds==='overdue'?'Overdue':ds==='today'?'Due today':'Due'}: ${formatDate(tk.due)}</div>`:''}
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button class="btn btn-sm btn-ghost" onclick="openTaskModal('${tk.id}')">Edit</button>
            <button class="btn btn-sm btn-ghost btn-danger" onclick="deleteTask('${tk.id}')">Del</button>
          </div>
        </div>`;
      }).join('') : `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">No tasks here</div><div class="empty-sub">Add a task to track your follow-ups</div></div>`}
    </div>`;
  updateTaskBadge();
}

function openTaskModal(id, contactId, contactName) {
  const tk = id ? tasks.find(x => x.id === id) : null;
  const cid = tk?.contactId || contactId || '';
  const cOpts = contacts.map(c => `<option value="${c.id}" data-name="${escAttr(c.first+' '+c.last)}" ${cid===c.id?'selected':''}>${escAttr(c.first+' '+c.last)}</option>`).join('');
  document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">${tk?'Edit task':'Add task'}</div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group full"><label class="form-label">Task description</label>
            <input class="form-input" id="tTitle" value="${escAttr(tk?.title||'')}" placeholder="e.g. Call back to confirm estimate">
          </div>
          <div class="form-group full"><label class="form-label">Contact (optional)</label>
            <select class="form-input" id="tContact"><option value="">—</option>${cOpts}</select>
          </div>
          <div class="form-group"><label class="form-label">Due date</label>
            <input class="form-input" id="tDue" type="date" value="${escAttr(tk?.due||'')}">
          </div>
          <div class="form-group"><label class="form-label">Assigned to</label>
            <select class="form-input" id="tAssign">
              <option value="">—</option>
              <option ${tk?.assign==='Me'?'selected':''}>Me</option>
              <option ${tk?.assign==='Brother'?'selected':''}>Brother</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveTask('${tk?.id||''}')">Save task</button>
      </div>
    </div></div>`;
}

async function saveTask(id) {
  const sel = document.getElementById('tContact');
  const cName = sel.value ? sel.options[sel.selectedIndex].dataset.name : '';
  const data = {
    title: document.getElementById('tTitle').value.trim(),
    contactId: sel.value,
    contactName: cName,
    due: document.getElementById('tDue').value,
    assign: document.getElementById('tAssign').value,
    done: id ? (tasks.find(t => t.id === id)?.done || false) : false,
  };
  if (!data.title) { alert('Please enter a task description.'); return; }
  let record;
  if (id) { const idx = tasks.findIndex(t => t.id === id); if (idx !== -1) { tasks[idx] = { ...tasks[idx], ...data }; record = tasks[idx]; } }
  else { record = { id: uid(), created: new Date().toISOString(), ...data }; tasks.unshift(record); }
  persist(); closeModal(); updateTaskBadge(); toast(id ? 'Task updated' : 'Task added');
  await pushRecord('Tasks', record);
  if (currentPage === 'tasks') renderTasks();
  else if (currentPage === 'contact_detail') renderContactDetail();
  else if (currentPage === 'dashboard') renderDashboard();
}

async function toggleTask(id) {
  const tk = tasks.find(t => t.id === id);
  if (tk) { tk.done = !tk.done; persist(); updateTaskBadge(); await pushRecord('Tasks', tk); }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(t => t.id !== id);
  persist(); toast('Task deleted'); updateTaskBadge();
  await pushDelete('Tasks', id);
  if (currentPage === 'tasks') renderTasks();
  else renderContactDetail();
}

// ── ACTIVITY ─────────────────────────────────────────────
function renderActivity() {
  const fType = document.getElementById('fActType')?.value || '';
  let filtered = activity.filter(a => !fType || a.type === fType);
  filtered = filtered.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  document.getElementById('content').innerHTML = `
    <div class="filters-bar">
      <select class="filter-select" id="fActType" onchange="renderActivity()">
        <option value="">All types</option>
        ${ACTIVITY_TYPES.map(t => `<option ${fType===t?'selected':''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="card">
      <div class="activity-list">
        ${filtered.length ? filtered.map(activityItemHTML).join('') : `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">No activity logged yet</div><div class="empty-sub">Log calls, emails, and notes to track your interactions</div></div>`}
      </div>
    </div>`;
}

function openActivityModal(contactId, contactName) {
  const cid = contactId || '';
  const cOpts = contacts.map(c => `<option value="${c.id}" data-name="${escAttr(c.first+' '+c.last)}" ${cid===c.id?'selected':''}>${escAttr(c.first+' '+c.last)}</option>`).join('');
  document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">Log activity</div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Type</label>
            <select class="form-input" id="aType">
              ${ACTIVITY_TYPES.map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Date</label>
            <input class="form-input" id="aDate" type="date" value="${todayStr()}">
          </div>
          <div class="form-group full"><label class="form-label">Contact</label>
            <select class="form-input" id="aContact"><option value="">—</option>${cOpts}</select>
          </div>
          <div class="form-group"><label class="form-label">Logged by</label>
            <select class="form-input" id="aAssign"><option>Me</option><option>Brother</option></select>
          </div>
          <div class="form-group full"><label class="form-label">Notes</label>
            <textarea class="form-input" id="aNotes" placeholder="What was discussed?"></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveActivity()">Save</button>
      </div>
    </div></div>`;
}

async function saveActivity() {
  const sel = document.getElementById('aContact');
  const cName = sel.value ? sel.options[sel.selectedIndex].dataset.name : '';
  const record = {
    id: uid(),
    type: document.getElementById('aType').value,
    date: document.getElementById('aDate').value,
    contactId: sel.value,
    contactName: cName,
    assign: document.getElementById('aAssign').value,
    notes: document.getElementById('aNotes').value.trim(),
    created: new Date().toISOString(),
  };
  activity.unshift(record);
  persist(); closeModal(); toast('Activity logged');
  await pushRecord('Activity', record);
  if (currentPage === 'activity') renderActivity();
  else if (currentPage === 'contact_detail') renderContactDetail();
}
