// ── THIRD QUOTE EXTERIORS — Aaron's Contact CRM Backend ──
// Paste into Google Apps Script, save, deploy as Web App
// Execute as: Me | Who has access: Anyone

const SPREADSHEET_ID = '1RX0OnPif17popjx9dL2ybXndO4XFiJN-lKbwKFAMqk4';

const HEADERS = ['id','first','last','phone','email','street','city','state','zip','services','source','heat','notes','created'];

function doGet(e) {
  const p = e.parameter || {};
  let body = {};
  if (p.record) { try { body.record = JSON.parse(p.record); } catch(err) {} }
  body.id = p.id;
  return sendJSON(handleAction(p.action, body));
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch(err) {}
  const p = e.parameter || {};
  return sendJSON(handleAction(p.action || body.action, body));
}

function handleAction(action, body) {
  try {
    switch(action) {
      case 'getAll': return getAll();
      case 'upsert': return upsert(body.record);
      case 'delete': return del(body.id);
      case 'ping':   return { ok: true, ts: new Date().toISOString() };
      default:       return { error: 'Unknown action: ' + action };
    }
  } catch(err) {
    return { error: err.message };
  }
}

function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName('Contacts');
  if (!sh) {
    sh = ss.insertSheet('Contacts');
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sh;
  }
  // Ensure headers are correct
  const first = sh.getRange(1, 1, 1, 1).getValues()[0][0];
  if (!first || first === '') {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sh;
}

function getAll() {
  const sh = getSheet();
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return { records: [] };
  const hdrs = vals[0].map(h => String(h).trim());
  const records = vals.slice(1).map(row => {
    const obj = {};
    hdrs.forEach((h, i) => {
      let v = row[i];
      if (h === 'services' && typeof v === 'string') {
        v = v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
      obj[h] = (v === null || v === undefined) ? '' : v;
    });
    return obj;
  }).filter(r => r.id && r.id !== '');
  return { records };
}

function upsert(record) {
  if (!record || !record.id) return { error: 'Missing record or id' };
  const sh = getSheet();
  const vals = sh.getDataRange().getValues();
  const row = HEADERS.map(h => {
    let v = record[h];
    if (h === 'services' && Array.isArray(v)) v = v.join(', ');
    return (v === null || v === undefined) ? '' : v;
  });
  let found = false;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(record.id)) {
      sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
      found = true;
      break;
    }
  }
  if (!found) sh.appendRow(row);
  return { ok: true, id: record.id };
}

function del(id) {
  if (!id) return { error: 'No id' };
  const sh = getSheet();
  const vals = sh.getDataRange().getValues();
  for (let i = vals.length - 1; i >= 1; i--) {
    if (String(vals[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, message: 'Not found' };
}
