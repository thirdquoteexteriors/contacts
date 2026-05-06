function renderDashboard() {
  const wonEst = estimates.filter(e => e.status === 'Won');
  const totalRev = wonEst.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const pipelineVal = estimates.filter(e => e.status === 'Quoted').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const t = todayStr();
  const dueToday = tasks.filter(tk => !tk.done && tk.due === t);
  const overdue = tasks.filter(tk => !tk.done && tk.due && tk.due < t);
  const stageCount = s => contacts.filter(c => c.stage === s).length;

  document.getElementById('content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card accent-green"><div class="stat-label">Revenue won</div><div class="stat-value">${formatMoney(totalRev)}</div><div class="stat-sub">${wonEst.length} closed jobs</div></div>
      <div class="stat-card accent-amber"><div class="stat-label">Pipeline value</div><div class="stat-value">${formatMoney(pipelineVal)}</div><div class="stat-sub">Quotes pending</div></div>
      <div class="stat-card accent-blue"><div class="stat-label">Total contacts</div><div class="stat-value">${contacts.length}</div><div class="stat-sub">All stages</div></div>
      <div class="stat-card accent-purple"><div class="stat-label">Open tasks</div><div class="stat-value">${tasks.filter(tk => !tk.done).length}</div><div class="stat-sub">${overdue.length} overdue</div></div>
    </div>
    <div class="charts-row">
      <div class="chart-card"><div class="chart-title">Pipeline by stage</div><div class="chart-wrap"><canvas id="stageChart"></canvas></div></div>
      <div class="chart-card"><div class="chart-title">Services requested</div><div class="chart-wrap"><canvas id="serviceChart"></canvas></div></div>
    </div>
    <div class="two-col">
      <div class="card">
        <div class="section-header"><div class="section-title">Due today & overdue</div><button class="btn btn-sm" onclick="showPage('tasks')">View all</button></div>
        ${[...overdue, ...dueToday].slice(0, 5).map(tk => `
          <div class="task-item ${tk.due < t ? 'overdue' : 'today'}" style="margin-bottom:8px">
            <div class="task-check ${tk.done ? 'done' : ''}" onclick="toggleTask('${tk.id}');renderDashboard()">✓</div>
            <div class="task-body">
              <div class="task-title">${escAttr(tk.title)}</div>
              <div class="task-meta">${escAttr(tk.contactName || '')}</div>
              <div class="task-due ${tk.due < t ? 'overdue' : 'today'}">${tk.due < t ? 'Overdue' : 'Today'}: ${formatDate(tk.due)}</div>
            </div>
          </div>`).join('') || '<div style="color:var(--gray-400);font-size:13px;padding:8px 0">All clear — no tasks due today 🎉</div>'}
      </div>
      <div class="card">
        <div class="section-header"><div class="section-title">Recent contacts</div><button class="btn btn-sm" onclick="showPage('contacts')">View all</button></div>
        ${contacts.slice(0, 5).map(c => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100);cursor:pointer" onclick='showContactDetail(${JSON.stringify(c.id)})'>
            <div class="contact-avatar" style="width:34px;height:34px;font-size:12px">${initials(c.first + ' ' + c.last)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:500">${escAttr(c.first)} ${escAttr(c.last)}</div>
              <div style="font-size:11px;color:var(--gray-400)">${escAttr((c.services || []).join(', '))} ${c.city ? '· ' + escAttr(c.city) : ''}</div>
            </div>
            <span class="badge ${stageBadgeClass(c.stage)}">${c.stage || 'New'}</span>
          </div>`).join('') || '<div style="color:var(--gray-400);font-size:13px">No contacts yet.</div>'}
      </div>
    </div>`;

  // Charts
  const stages = ['New', 'Contacted', 'Quoted', 'Won', 'Lost'];
  new Chart(document.getElementById('stageChart'), {
    type: 'doughnut',
    data: {
      labels: stages,
      datasets: [{ data: stages.map(stageCount), backgroundColor: ['#0ea5e9','#7c3aed','#d97706','#1a7a54','#dc2626'], borderWidth: 2, borderColor: '#fff' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12 } } } }
  });

  const svcs = SERVICES;
  new Chart(document.getElementById('serviceChart'), {
    type: 'bar',
    data: {
      labels: svcs,
      datasets: [{ data: svcs.map(s => contacts.filter(c => (c.services || []).includes(s)).length), backgroundColor: '#1a7a54', borderRadius: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f3f4f6' } }, x: { ticks: { font: { size: 11 } }, grid: { display: false } } } }
  });
}
