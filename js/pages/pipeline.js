let dragId = null;

function renderPipeline() {
  const stages = [
    { id: 'New', label: 'New leads' },
    { id: 'Contacted', label: 'Contacted' },
    { id: 'Quoted', label: 'Quoted' },
    { id: 'Won', label: 'Won' },
    { id: 'Lost', label: 'Lost' },
  ];

  document.getElementById('content').innerHTML = `
    <div class="pipeline-board">
      ${stages.map(s => {
        const cards = contacts.filter(c => (c.stage || 'New') === s.id);
        const cls = s.id.toLowerCase();
        return `<div class="pipeline-col stage-${cls}">
          <div class="col-header">
            <span class="col-title">${s.label}</span>
            <span class="col-count">${cards.length}</span>
          </div>
          <div class="col-body" id="col-${s.id}"
            ondragover="pDragOver(event,'${s.id}')"
            ondragleave="pDragLeave(event)"
            ondrop="pDrop(event,'${s.id}')">
            ${cards.map(c => {
              const est = estimates.filter(e => e.contactId === c.id).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
              return `<div class="pipeline-card"
                draggable="true"
                id="pc-${c.id}"
                ondragstart="pDragStart(event,'${c.id}')"
                ondragend="pDragEnd(event)"
                onclick="showContactDetail('${c.id}')">
                <div class="pc-name">${escAttr(c.first)} ${escAttr(c.last)}</div>
                <div class="pc-services">${escAttr((c.services || []).join(', ')) || '—'}</div>
                <div class="pc-footer">
                  <span class="pc-value">${est > 0 ? formatMoney(est) : ''}</span>
                  ${c.followup ? `<span class="pc-date">${formatDate(c.followup)}</span>` : ''}
                  ${c.assign ? `<span class="pc-assign">${escAttr(c.assign)}</span>` : ''}
                </div>
              </div>`;
            }).join('')}
            <button class="add-card-btn" onclick="openContactModal(null,'${s.id}')">+ Add lead</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function pDragStart(e, id) {
  dragId = id;
  setTimeout(() => document.getElementById('pc-' + id)?.classList.add('dragging'), 0);
  e.dataTransfer.effectAllowed = 'move';
}
function pDragEnd(e) {
  document.getElementById('pc-' + dragId)?.classList.remove('dragging');
}
function pDragOver(e, stage) {
  e.preventDefault();
  document.getElementById('col-' + stage)?.classList.add('drag-over');
}
function pDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}
function pDrop(e, stage) {
  e.preventDefault();
  document.querySelectorAll('.col-body').forEach(el => el.classList.remove('drag-over'));
  if (!dragId) return;
  const c = contacts.find(x => x.id === dragId);
  if (c && c.stage !== stage) {
    c.stage = stage;
    persist();
    toast('Moved to ' + stage);
    renderPipeline();
  }
}
