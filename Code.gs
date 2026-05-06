const SPREADSHEET_ID = '1RX0OnPif17popjx9dL2ybXndO4XFiJN-lKbwKFAMqk4';
const SHEET_NAMES = ['Contacts', 'Estimates', 'Tasks', 'Activity'];

const HEADERS = {
  Contacts:  ['id','first','last','phone','email','street','city','state','zip','address','stage','services','source','assign','followup','heat','notes','created'],
  Estimates: ['id','contactId','title','service','amount','status','date','notes','created'],
  Tasks:     ['id','title','contactId','contactName','due','assign','done','created'],
  Activity:  ['id','type','contactId','contactName','date','assign','notes','created'],
};

function doGet(e) {
  const p = e.parameter || {};
  let body = {};
  if (p.record) { try { body.record = JSON.parse(p.record); } catch(err) {} }
  if (p.data)   { try { body.data   = JSON.parse(p.data);   } catch(err) {} }
  body.id = p.id;
  const result = handleAction(p.action, p.sheet, body);
  return sendJSON(result);
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch(err) {}
  const p = e.parameter || {};
  const result = handleAction(p.action || body.action, p.sheet || body.sheet, body);
  return sendJSON(result);
}

function handleAction(action, sheet, body) {
  try {
    switch(action) {
      case 'getAll': return getAll(sheet);
      case 'upsert': return upsert(sheet, body.record);
      case 'delete': return del(sheet, body.id);
      case 'sync':   return syncAll(body.data);
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

function ss() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

function getSheet(name) {
  const spreadsheet = ss();
  let sh = spreadsheet.getSheetByName(name);
  if (!sh) {
    sh = spreadsheet.insertSheet(name);
    sh.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]);
    return sh;
  }
  const first = sh.getRange(1,1,1,1).getValues()[0][0];
  if (!first || first === '') {
    sh.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]);
  }
  return sh;
}

function getAll(name) {
  if (!SHEET_NAMES.includes(name)) return { error: 'Bad sheet: ' + name };
  const sh = getSheet(name);
  const vals = sh.getDataRange().getValues();
  if (vals.length < 2) return { records: [] };
  const hdrs = vals[0].map(h => String(h).trim());
  const records = vals.slice(1).map(row => {
    const obj = {};
    hdrs.forEach((h,i) => {
      let v = row[i];
      if (h === 'services' && typeof v === 'string') {
        try { v = JSON.parse(v); }
        catch(e) { v = v ? v.split(',').map(s => s.trim()).filter(Boolean) : []; }
      }
      if (h === 'done') v = (v === true || v === 'true' || v === 'TRUE');
      obj[h] = (v === null || v === undefined) ? '' : v;
    });
    return obj;
  }).filter(r => r.id && r.id !== '');
  return { records };
}

function upsert(name, record) {
  if (!SHEET_NAMES.includes(name)) return { error: 'Bad sheet: ' + name };
  if (!record || !record.id) return { error: 'Missing record or id' };
  const sh = getSheet(name);
  const hdrs = HEADERS[name];
  const vals = sh.getDataRange().getValues();
  const row = hdrs.map(h => {
    let v = record[h];
    if (h === 'services') {
      if (Array.isArray(v)) v = v.join(', ');
      else if (typeof v === 'string' && v.startsWith('[')) {
        try { v = JSON.parse(v).join(', '); } catch(e) {}
      }
    }
    return (v === null || v === undefined) ? '' : v;
  });
  let found = false;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(record.id)) {
      sh.getRange(i+1,1,1,row.length).setValues([row]);
      found = true;
      break;
    }
  }
  if (!found) sh.appendRow(row);
  return { ok: true, id: record.id };
}

function del(name, id) {
  if (!SHEET_NAMES.includes(name)) return { error: 'Bad sheet' };
  if (!id) return { error: 'No id' };
  const sh = getSheet(name);
  const vals = sh.getDataRange().getValues();
  for (let i = vals.length-1; i >= 1; i--) {
    if (String(vals[i][0]) === String(id)) { sh.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false };
}

function syncAll(data) {
  if (!data) return { error: 'No data' };
  const counts = {};
  SHEET_NAMES.forEach(name => {
    if (!data[name]) return;
    const sh = getSheet(name);
    const hdrs = HEADERS[name];
    const last = sh.getLastRow();
    if (last > 1) sh.deleteRows(2, last-1);
    sh.getRange(1,1,1,hdrs.length).setValues([hdrs]);
    const recs = data[name];
    if (recs.length > 0) {
      const rows = recs.map(r => hdrs.map(h => {
        let v = r[h];
        if (h === 'services') {
          if (Array.isArray(v)) v = v.join(', ');
          else if (typeof v === 'string' && v.startsWith('[')) {
            try { v = JSON.parse(v).join(', '); } catch(e) {}
          }
        }
        if (h === 'done') v = v ? 'true' : 'false';
        return (v === null || v === undefined) ? '' : v;
      }));
      sh.getRange(2,1,rows.length,hdrs.length).setValues(rows);
    }
    counts[name] = recs.length;
  });
  return { ok: true, counts };
}
