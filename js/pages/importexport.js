function renderImport() {
  document.getElementById('content').innerHTML = `
    <div class="two-col" style="margin-bottom:16px">
      <div class="card">
        <div class="section-title" style="margin-bottom:6px">Export data</div>
        <p style="font-size:13px;color:var(--gray-500);margin-bottom:16px;line-height:1.6">Download all your data to Excel or CSV. Open in any spreadsheet app or import into any other CRM.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary" onclick="exportExcel()">📊 Export to Excel (.xlsx)</button>
          <button class="btn" onclick="exportCSV('contacts')">📄 Export contacts (.csv)</button>
          <button class="btn" onclick="exportCSV('estimates')">📄 Export estimates (.csv)</button>
        </div>
      </div>
      <div class="card">
        <div class="section-title" style="margin-bottom:6px">Import contacts</div>
        <p style="font-size:13px;color:var(--gray-500);margin-bottom:16px;line-height:1.6">Import from CSV or Excel. Headers should include: First, Last, Phone, Email, City, Stage, Services, Source.</p>
        <div class="import-zone" onclick="document.getElementById('importFile').click()">
          <div class="import-icon">📥</div>
          <div style="font-size:14px;font-weight:500">Click to select file</div>
          <div style="font-size:12px;margin-top:4px">.csv or .xlsx</div>
          <input type="file" id="importFile" accept=".csv,.xlsx" style="display:none" onchange="handleImport(event)">
        </div>
        <div id="importResult" style="margin-top:12px;font-size:13px;color:var(--green)"></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="section-title" style="margin-bottom:6px">Backup & restore</div>
      <p style="font-size:13px;color:var(--gray-500);margin-bottom:14px;line-height:1.6">Save a complete backup of all CRM data (contacts, estimates, tasks, activity). Restore it on any device or browser.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" onclick="backupJSON()">💾 Download full backup</button>
        <button class="btn" onclick="document.getElementById('restoreFile').click()">🔄 Restore from backup</button>
        <input type="file" id="restoreFile" accept=".json" style="display:none" onchange="restoreJSON(event)">
      </div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-bottom:6px">Gmail setup</div>
      <p style="font-size:13px;color:var(--gray-500);margin-bottom:14px;line-height:1.6">To send emails directly from the CRM, you need a free Google OAuth Client ID. One-time setup, takes about 5 minutes.</p>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="showGmailSetupModal()">Configure Gmail OAuth</button>
        <a href="https://console.cloud.google.com" target="_blank" class="btn">Open Google Console ↗</a>
      </div>
      <div style="margin-top:16px">
        ${buildSetupGuide()}
      </div>
    </div>`;
}

function buildSetupGuide() {
  const steps = [
    { title: 'Create a Google Cloud project', desc: 'Go to <a href="https://console.cloud.google.com" target="_blank" style="color:var(--blue)">console.cloud.google.com</a> and create a new project. Name it "Third Quote CRM".' },
    { title: 'Enable the Gmail API', desc: 'Go to <b>APIs & Services → Library</b>, search for Gmail API, and click Enable.' },
    { title: 'Configure OAuth consent screen', desc: 'Go to <b>APIs & Services → OAuth consent screen</b>. Choose <b>External</b>, fill in app name ("Third Quote CRM"), add your email.' },
    { title: 'Create OAuth credentials', desc: 'Go to <b>APIs & Services → Credentials → Create Credentials → OAuth Client ID</b>. Choose <b>Web application</b>.' },
    { title: 'Add your GitHub Pages URL', desc: 'In Authorized JavaScript origins, add your GitHub Pages URL (e.g. <code>https://yourusername.github.io</code>). In Authorized redirect URIs, add the full CRM URL.' },
    { title: 'Paste your Client ID', desc: 'Copy the Client ID (ends in .apps.googleusercontent.com) and paste it using the Configure Gmail OAuth button above.' },
  ];
  return steps.map((s, i) => `
    <div class="setup-step">
      <div class="step-num">${i + 1}</div>
      <div class="step-body">
        <div class="step-title">${s.title}</div>
        <div class="step-desc">${s.desc}</div>
      </div>
    </div>`).join('');
}

function exportExcel() {
  if (!contacts.length && !estimates.length) { toast('No data to export yet'); return; }
  const wb = XLSX.utils.book_new();
  const cData = contacts.map(c => ({ First: c.first, Last: c.last, Phone: c.phone, Email: c.email, City: c.city, Address: c.address, Stage: c.stage, Services: (c.services || []).join('; '), Source: c.source, Assigned: c.assign, 'Follow-up': c.followup, Notes: c.notes, Created: c.created ? new Date(c.created).toLocaleDateString() : '' }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cData.length ? cData : [{}]), 'Contacts');
  const eData = estimates.map(e => { const c = contacts.find(x => x.id === e.contactId); return { Contact: c ? c.first + ' ' + c.last : '', Title: e.title, Service: e.service, Amount: e.amount, Status: e.status, Date: e.date, Notes: e.notes }; });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eData.length ? eData : [{}]), 'Estimates');
  const tData = tasks.map(t => ({ Task: t.title, Contact: t.contactName, Due: t.due, Assigned: t.assign, Done: t.done ? 'Yes' : 'No' }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tData.length ? tData : [{}]), 'Tasks');
  XLSX.writeFile(wb, 'ThirdQuote_CRM_' + todayStr() + '.xlsx');
  toast('Excel file downloaded!');
}

function exportCSV(type) {
  let headers, rows, filename;
  if (type === 'contacts') {
    headers = ['First','Last','Phone','Email','City','Address','Stage','Services','Source','Assigned','Follow-up','Notes','Created'];
    rows = contacts.map(c => [c.first,c.last,c.phone,c.email,c.city,c.address,c.stage,(c.services||[]).join('; '),c.source,c.assign,c.followup,c.notes,c.created?new Date(c.created).toLocaleDateString():'']);
    filename = 'ThirdQuote_Contacts_' + todayStr() + '.csv';
  } else {
    headers = ['Contact','Title','Service','Amount','Status','Date','Notes'];
    rows = estimates.map(e => { const c = contacts.find(x => x.id === e.contactId); return [c?c.first+' '+c.last:'',e.title,e.service,e.amount,e.status,e.date,e.notes]; });
    filename = 'ThirdQuote_Estimates_' + todayStr() + '.csv';
  }
  const csv = [headers, ...rows].map(r => r.map(v => '"' + (v || '').toString().replace(/"/g, '""') + '"').join(',')).join('\n');
  dlFile(csv, filename, 'text/csv');
  toast('CSV downloaded!');
}

function backupJSON() {
  const backup = JSON.stringify({ contacts, estimates, tasks, activity, exported: new Date().toISOString() }, null, 2);
  dlFile(backup, 'ThirdQuote_Backup_' + todayStr() + '.json', 'application/json');
  toast('Backup downloaded!');
}

function restoreJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      const dateStr = data.exported ? new Date(data.exported).toLocaleDateString() : 'unknown date';
      if (!confirm(`Restore backup from ${dateStr}? This replaces all current data.`)) return;
      contacts = data.contacts || [];
      estimates = data.estimates || [];
      tasks = data.tasks || [];
      activity = data.activity || [];
      persist();
      toast('Data restored successfully!');
      showPage('dashboard');
    } catch(err) { alert('Invalid backup file.'); }
  };
  reader.readAsText(file);
}

function handleImport(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      let rows;
      if (file.name.endsWith('.xlsx')) {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      } else {
        const text = evt.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        rows = lines.slice(1).filter(l => l.trim()).map(l => {
          const vals = l.match(/(".*?"|[^,]+)/g) || [];
          const obj = {};
          headers.forEach((h, i) => obj[h] = (vals[i] || '').replace(/"/g, '').trim());
          return obj;
        });
      }
      let added = 0;
      rows.forEach(r => {
        if (!r.First && !r.Last) return;
        contacts.push({ id: uid(), created: new Date().toISOString(), first: r.First || '', last: r.Last || '', phone: r.Phone || '', email: r.Email || '', city: r.City || '', address: r.Address || '', stage: r.Stage || 'New', services: r.Services ? r.Services.split(';').map(s => s.trim()).filter(Boolean) : [], source: r.Source || '', assign: r.Assigned || '', followup: r['Follow-up'] || '', notes: r.Notes || '' });
        added++;
      });
      persist();
      document.getElementById('importResult').textContent = `✓ Imported ${added} contacts!`;
      toast(`Imported ${added} contacts`);
    } catch(err) { document.getElementById('importResult').textContent = 'Error reading file. Check the format.'; }
  };
  if (file.name.endsWith('.xlsx')) reader.readAsArrayBuffer(file);
  else reader.readAsText(file);
}

function dlFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// Override restoreJSON to also push to Sheets
async function restoreJSONWithSync(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async evt => {
    try {
      const data = JSON.parse(evt.target.result);
      const dateStr = data.exported ? new Date(data.exported).toLocaleDateString() : 'unknown date';
      if (!confirm('Restore backup from ' + dateStr + '? This replaces all current data.')) return;
      contacts = data.contacts || [];
      estimates = data.estimates || [];
      tasks = data.tasks || [];
      activity = data.activity || [];
      persist();
      toast('Data restored — uploading to Sheets...');
      await pushAllToSheets();
      showPage('dashboard');
    } catch(err) { alert('Invalid backup file.'); }
  };
  reader.readAsText(file);
}
window.restoreJSON = restoreJSONWithSync;
