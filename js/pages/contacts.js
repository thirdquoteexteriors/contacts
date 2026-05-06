// ── CONTACTS LIST ────────────────────────────────────────
function renderContacts() {
  const search = (document.getElementById('contactSearch')?.value || '').toLowerCase();
  const fStage = document.getElementById('fStage')?.value || '';
  const fSvc = document.getElementById('fSvc')?.value || '';
  const brother = isBrother();

  const filtered = contacts.filter(c => {
    const name = (c.first + ' ' + c.last).toLowerCase();
    return (!search || name.includes(search) || (c.phone || '').includes(search) || (c.city || '').toLowerCase().includes(search))
      && (!fStage || c.stage === fStage)
      && (!fSvc || (c.services || []).includes(fSvc));
  });

  document.getElementById('content').innerHTML = `
    <div class="filters-bar">
      <input class="search-input" id="contactSearch" placeholder="Search name, phone, city..." value="${escAttr(search)}" oninput="renderContacts()">
      ${!brother ? `
      <select class="filter-select" id="fStage" onchange="renderContacts()">
        <option value="">All stages</option>
        ${STAGES.map(s => `<option ${fStage === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <select class="filter-select" id="fSvc" onchange="renderContacts()">
        <option value="">All services</option>
        ${ALL_SERVICES.map(s => `<option ${fSvc === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>` : ''}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Services</th>
          ${!brother ? '<th>Stage</th><th>Est. value</th><th>Source</th><th>Assigned</th><th>Follow-up</th>' : ''}
          <th></th>
        </tr></thead>
        <tbody>
          ${filtered.length ? filtered.map(c => {
            const est = estimates.filter(e => e.contactId === c.id).reduce((s, e) => s + (Number(e.amount) || 0), 0);
            return `<tr style="cursor:pointer" onclick="showContactDetail('${c.id}')">
              <td style="font-weight:500">${escAttr(c.first)} ${escAttr(c.last)}</td>
              <td>${escAttr(c.phone || '—')}</td>
              <td>${escAttr(c.email || '—')}</td>
              <td>${escAttr(c.city || '—')}</td>
              <td>${(c.services || []).map(s => `<span class="svc-tag">${s}</span>`).join('') || '—'}</td>
              ${!brother ? `
              <td><span class="badge ${stageBadgeClass(c.stage)}">${c.stage || 'New'}</span></td>
              <td class="mono">${est > 0 ? formatMoney(est) : '—'}</td>
              <td>${escAttr(c.source || '—')}</td>
              <td>${escAttr(c.assign || '—')}</td>
              <td>${c.followup ? formatDate(c.followup) : '—'}</td>` : ''}
              <td onclick="event.stopPropagation()">
                <div style="display:flex;gap:4px">
                  <button class="btn btn-sm btn-ghost" onclick="openContactModal('${c.id}')">Edit</button>
                  <button class="btn btn-sm btn-ghost btn-danger" onclick="deleteContact('${c.id}')">Del</button>
                </div>
              </td>
            </tr>`;
          }).join('') : `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No contacts yet</div><div class="empty-sub">Add your first lead to get started</div></div></td></tr>`}
        </tbody>
      </table>
    </div>`;
}

async function deleteContact(id) {
  if (!confirm('Delete this contact and all associated data?')) return;
  contacts = contacts.filter(c => c.id !== id);
  estimates = estimates.filter(e => e.contactId !== id);
  tasks = tasks.filter(t => t.contactId !== id);
  activity = activity.filter(a => a.contactId !== id);
  persist();
  renderContacts();
  toast('Contact deleted');
  await pushDelete('Contacts', id);
}

// ── CONTACT MODAL ────────────────────────────────────────
// All services including Aaron's extras
const ALL_SERVICES = ['Roofing', 'Siding', 'Gutters', 'Deck/Patio', 'Concrete', 'Windows', 'Paint', 'Other'];

function openContactModal(id, defaultStage) {
  const c = id ? contacts.find(x => x.id === id) : null;
  const stage = c?.stage || defaultStage || 'New';
  const brother = isBrother();

  document.getElementById('modalContainer').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${c ? 'Edit contact' : 'Add contact'}</div>
        <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">First name</label><input class="form-input" id="mFirst" value="${escAttr(c?.first || '')}"></div>
          <div class="form-group"><label class="form-label">Last name</label><input class="form-input" id="mLast" value="${escAttr(c?.last || '')}"></div>
          <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="mPhone" type="tel" value="${escAttr(c?.phone || '')}"></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="mEmail" type="email" value="${escAttr(c?.email || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group full"><label class="form-label">Street address</label><input class="form-input" id="mStreet" value="${escAttr(c?.street || '')}"></div>
          <div class="form-group"><label class="form-label">City</label><input class="form-input" id="mCity" value="${escAttr(c?.city || '')}"></div>
          <div class="form-group"><label class="form-label">State</label><input class="form-input" id="mState" value="${escAttr(c?.state || 'WA')}" maxlength="2" style="text-transform:uppercase"></div>
          <div class="form-group"><label class="form-label">Zip</label><input class="form-input" id="mZip" value="${escAttr(c?.zip || '')}" maxlength="10"></div>
        </div>
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Services interested in</label>
          <div class="checkbox-group">
            ${ALL_SERVICES.map(s => `<label class="cb-label"><input type="checkbox" value="${s}" class="svc-cb" ${(c?.services || []).includes(s) ? 'checked' : ''}> ${s}</label>`).join('')}
          </div>
        </div>
        ${!brother ? `
        <div class="form-row">
          <div class="form-group"><label class="form-label">Stage</label>
            <select class="form-input" id="mStage">
              ${STAGES.map(s => `<option ${stage === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Lead source</label>
            <select class="form-input" id="mSource">
              <option value="">—</option>
              ${SOURCES.map(s => `<option ${c?.source === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Assigned to</label>
            <select class="form-input" id="mAssign">
              <option value="">—</option>
              <option ${c?.assign === 'Me' ? 'selected' : ''}>Me</option>
              <option ${c?.assign === 'Brother' ? 'selected' : ''}>Brother</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Follow-up date</label><input class="form-input" id="mFollowup" type="date" value="${escAttr(c?.followup || '')}"></div>
        </div>` : `
        <input type="hidden" id="mStage" value="New">
        <input type="hidden" id="mSource" value="Door knock">
        <input type="hidden" id="mAssign" value="Brother">
        <input type="hidden" id="mFollowup" value="">
        `}
        <div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="mNotes">${escAttr(c?.notes || '')}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveContact('${c?.id || ''}')">Save contact</button>
      </div>
    </div></div>`;
}

async function saveContact(id) {
  const svcs = [...document.querySelectorAll('.svc-cb:checked')].map(cb => cb.value);
  const street = document.getElementById('mStreet')?.value.trim() || '';
  const city   = document.getElementById('mCity')?.value.trim() || '';
  const state  = document.getElementById('mState')?.value.trim().toUpperCase() || '';
  const zip    = document.getElementById('mZip')?.value.trim() || '';
  const fullAddress = [street, city, state, zip].filter(Boolean).join(', ');

  const data = {
    first:    document.getElementById('mFirst').value.trim(),
    last:     document.getElementById('mLast').value.trim(),
    phone:    document.getElementById('mPhone').value.trim(),
    email:    document.getElementById('mEmail').value.trim(),
    street, city, state, zip,
    address:  fullAddress,
    stage:    document.getElementById('mStage').value,
    source:   document.getElementById('mSource').value,
    assign:   document.getElementById('mAssign').value,
    followup: document.getElementById('mFollowup').value,
    notes:    document.getElementById('mNotes').value.trim(),
    services: svcs,
  };
  if (!data.first && !data.last) { alert('Please enter a name.'); return; }
  let record;
  if (id) {
    const idx = contacts.findIndex(c => c.id === id);
    if (idx !== -1) { contacts[idx] = { ...contacts[idx], ...data }; record = contacts[idx]; }
  } else {
    record = { id: uid(), created: new Date().toISOString(), ...data };
    contacts.unshift(record);
  }
  persist();
  closeModal();
  toast(id ? 'Contact updated' : 'Contact added');
  await pushRecord('Contacts', record);
  if (currentPage === 'contacts') renderContacts();
  else if (currentPage === 'pipeline') renderPipeline();
  else if (currentPage === 'dashboard') renderDashboard();
  else if (currentPage === 'contact_detail') renderContactDetail();
}

// ── CONTACT DETAIL ────────────────────────────────────────
function showContactDetail(id) {
  currentContactId = id;
  showPage('contact_detail');
}

function renderContactDetail() {
  const c = contacts.find(x => x.id === currentContactId);
  if (!c) { showPage('contacts'); return; }
  const brother = isBrother();
  const cEst = estimates.filter(e => e.contactId === c.id);
  const cTasks = tasks.filter(t => t.contactId === c.id && !t.done);
  const cActivity = activity.filter(a => a.contactId === c.id);
  const totalEst = cEst.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  document.getElementById('topbarActions').innerHTML = `
    <button class="btn btn-sm" onclick="manualSync()">⟳ Sync</button>
    <button class="btn" onclick="showPage('contacts')">← Back</button>
    <button class="btn" onclick="openContactModal('${c.id}')">Edit</button>
    ${c.email ? `<button class="btn btn-primary" onclick="openComposeModal('${c.id}')">📧 Email</button>` : ''}`;

  document.getElementById('content').innerHTML = `
    <div class="contact-hero">
      <div class="contact-avatar">${initials(c.first + ' ' + c.last)}</div>
      <div class="contact-info">
        <div class="contact-name">${escAttr(c.first)} ${escAttr(c.last)}</div>
        <div class="contact-sub">${escAttr(c.phone || '')}${c.phone && c.email ? ' · ' : ''}${escAttr(c.email || '')}</div>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;align-items:center">
          <span class="badge ${stageBadgeClass(c.stage)}">${c.stage || 'New'}</span>
          ${(c.services || []).map(s => `<span class="svc-tag">${s}</span>`).join('')}
        </div>
      </div>
      ${!brother ? `<div style="text-align:right;flex-shrink:0">
        <div style="font-size:11px;color:var(--gray-400);margin-bottom:2px">Total estimated</div>
        <div style="font-size:22px;font-weight:600;color:var(--green);font-family:'DM Mono',monospace">${totalEst > 0 ? formatMoney(totalEst) : '—'}</div>
      </div>` : ''}
    </div>

    <div class="two-col" style="margin-bottom:16px">
      <div class="card">
        <div style="font-size:13px;font-weight:600;margin-bottom:12px">Details</div>
        <div class="detail-grid">
          <div class="detail-field"><div class="detail-label">Street</div><div class="detail-val">${escAttr(c.street || c.address || '—')}</div></div>
          <div class="detail-field"><div class="detail-label">City</div><div class="detail-val">${escAttr(c.city || '—')}</div></div>
          <div class="detail-field"><div class="detail-label">State</div><div class="detail-val">${escAttr(c.state || '—')}</div></div>
          <div class="detail-field"><div class="detail-label">Zip</div><div class="detail-val">${escAttr(c.zip || '—')}</div></div>
          ${!brother ? `
          <div class="detail-field"><div class="detail-label">Source</div><div class="detail-val">${escAttr(c.source || '—')}</div></div>
          <div class="detail-field"><div class="detail-label">Assigned</div><div class="detail-val">${escAttr(c.assign || '—')}</div></div>
          <div class="detail-field"><div class="detail-label">Follow-up</div><div class="detail-val">${c.followup ? formatDate(c.followup) : '—'}</div></div>
          <div class="detail-field"><div class="detail-label">Added</div><div class="detail-val">${c.created ? new Date(c.created).toLocaleDateString() : '—'}</div></div>
          ` : ''}
        </div>
        ${c.notes ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--gray-100)"><div class="detail-label" style="margin-bottom:4px">Notes</div><div style="font-size:13px;color:var(--gray-700);white-space:pre-wrap">${escAttr(c.notes)}</div></div>` : ''}
      </div>

      ${!brother ? `
      <div class="card">
        <div class="section-header"><div style="font-size:13px;font-weight:600">Estimates</div><button class="btn btn-sm" onclick="openEstimateModal(null,'${c.id}')">+ Add</button></div>
        ${cEst.length ? cEst.map(e => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:500">${escAttr(e.title || 'Estimate')}</div>
              <div style="font-size:11px;color:var(--gray-400)">${escAttr(e.service || '')} · ${formatDate(e.date)}</div>
            </div>
            <span style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:var(--green)">${formatMoney(e.amount)}</span>
            <span class="badge ${stageBadgeClass(e.status)}">${e.status || 'Quoted'}</span>
          </div>`).join('') : '<div style="color:var(--gray-400);font-size:13px">No estimates yet.</div>'}
      </div>` : '<div></div>'}
    </div>

    ${!brother ? `
    <div class="two-col">
      <div class="card">
        <div class="section-header"><div style="font-size:13px;font-weight:600">Open tasks</div><button class="btn btn-sm" onclick="openTaskModal(null,'${c.id}','${escAttr(c.first + ' ' + c.last)}')">+ Add</button></div>
        ${cTasks.length ? cTasks.map(tk => {
          const ds = dayStatus(tk.due);
          return `<div class="task-item ${ds}" style="margin-bottom:8px">
            <div class="task-check ${tk.done?'done':''}" onclick="toggleTask('${tk.id}');renderContactDetail()">✓</div>
            <div class="task-body">
              <div class="task-title">${escAttr(tk.title)}</div>
              ${tk.due ? `<div class="task-due ${ds}">${ds==='overdue'?'Overdue':ds==='today'?'Due today':'Due'}: ${formatDate(tk.due)}</div>` : ''}
            </div>
          </div>`;
        }).join('') : '<div style="color:var(--gray-400);font-size:13px">No open tasks.</div>'}
      </div>
      <div class="card">
        <div class="section-header"><div style="font-size:13px;font-weight:600">Activity log</div><button class="btn btn-sm" onclick="openActivityModal('${c.id}','${escAttr(c.first+' '+c.last)}')">+ Log</button></div>
        <div class="activity-list">
          ${cActivity.length ? cActivity.slice(0,8).map(activityItemHTML).join('') : '<div style="color:var(--gray-400);font-size:13px">No activity logged yet.</div>'}
        </div>
      </div>
    </div>` : ''}`;
}
