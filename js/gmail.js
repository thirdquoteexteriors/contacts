// ── GMAIL OAUTH ─────────────────────────────────────────
// Uses Gmail API via OAuth 2.0 (PKCE flow — no backend needed)
// User must set their own Google OAuth Client ID in config below

const GMAIL_CONFIG = {
  // !! USER MUST SET THIS — see setup guide in Import/Export page
  clientId: localStorage.getItem('tq_gmail_client_id') || '',
  scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
  redirectUri: window.location.origin + window.location.pathname,
};

let gmailToken = null;
let gmailEmail = null;

// On load — check for OAuth callback token in URL
(function checkOAuthCallback() {
  const hash = window.location.hash;
  if (hash.includes('access_token')) {
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('access_token');
    if (token) {
      gmailToken = token;
      localStorage.setItem('tq_gmail_token', token);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchGmailUserInfo(token);
    }
  } else {
    // Try restoring saved token
    const saved = localStorage.getItem('tq_gmail_token');
    const savedEmail = localStorage.getItem('tq_gmail_email');
    if (saved && savedEmail) {
      gmailToken = saved;
      gmailEmail = savedEmail;
      updateGmailUI(true);
    }
  }
})();

function handleGmailAuth() {
  if (gmailToken) {
    // Disconnect
    if (confirm('Disconnect Gmail?')) {
      gmailToken = null;
      gmailEmail = null;
      localStorage.removeItem('tq_gmail_token');
      localStorage.removeItem('tq_gmail_email');
      updateGmailUI(false);
      toast('Gmail disconnected');
    }
    return;
  }

  const clientId = localStorage.getItem('tq_gmail_client_id') || GMAIL_CONFIG.clientId;
  if (!clientId) {
    showGmailSetupModal();
    return;
  }

  // Launch OAuth implicit flow
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GMAIL_CONFIG.redirectUri,
    response_type: 'token',
    scope: GMAIL_CONFIG.scope,
    prompt: 'consent',
  });
  window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

function fetchGmailUserInfo(token) {
  fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: 'Bearer ' + token }
  })
  .then(r => r.json())
  .then(data => {
    gmailEmail = data.email;
    localStorage.setItem('tq_gmail_email', gmailEmail);
    updateGmailUI(true);
    toast('Gmail connected: ' + gmailEmail);
  })
  .catch(() => {
    updateGmailUI(true);
  });
}

function updateGmailUI(connected) {
  const dot = document.getElementById('gmailDot');
  const label = document.getElementById('gmailLabel');
  const btn = document.getElementById('gmailBtn');
  if (!dot) return;
  if (connected) {
    dot.classList.add('connected');
    label.textContent = 'Gmail: ' + (gmailEmail || 'connected');
    btn.textContent = 'Disconnect';
    btn.classList.add('connected');
  } else {
    dot.classList.remove('connected');
    label.textContent = 'Gmail: not connected';
    btn.textContent = 'Connect Gmail';
    btn.classList.remove('connected');
  }
}

// Send email via Gmail API
async function sendGmailEmail(to, subject, body) {
  if (!gmailToken) throw new Error('Gmail not connected');
  const from = gmailEmail || 'me';
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
    '',
    body
  ].join('\r\n');

  const encoded = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + gmailToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const err = await res.json();
    if (err.error?.code === 401) {
      // Token expired — clear and prompt re-auth
      gmailToken = null;
      localStorage.removeItem('tq_gmail_token');
      updateGmailUI(false);
      throw new Error('Gmail session expired. Please reconnect.');
    }
    throw new Error(err.error?.message || 'Failed to send email');
  }
  return await res.json();
}

// Open compose modal
function openComposeModal(contactId) {
  const c = contacts.find(x => x.id === contactId);
  if (!c) return;

  if (!gmailToken) {
    if (confirm('Gmail not connected. Would you like to connect now?')) handleGmailAuth();
    return;
  }

  const toEmail = c.email || '';
  const defaultSubject = `Third Quote Exteriors — ${(c.services || []).join(', ') || 'Estimate'}`;
  const defaultBody = `Hi ${c.first},\n\nThank you for your interest in Third Quote Exteriors.\n\n`;

  const html = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">📧 New email</div>
        <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="compose-wrap">
          <div class="compose-field">
            <span class="compose-field-label">To</span>
            <input id="cTo" value="${escAttr(toEmail)}" placeholder="recipient@email.com">
          </div>
          <div class="compose-field">
            <span class="compose-field-label">Subject</span>
            <input id="cSubject" value="${escAttr(defaultSubject)}">
          </div>
          <textarea class="compose-body" id="cBody">${escAttr(defaultBody)}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <div class="send-status" id="sendStatus"></div>
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="sendBtn" onclick="doSendEmail('${contactId}')">Send email</button>
      </div>
    </div></div>`;
  document.getElementById('modalContainer').innerHTML = html;
  document.getElementById('cBody').focus();
  document.getElementById('cBody').setSelectionRange(defaultBody.length, defaultBody.length);
}

async function doSendEmail(contactId) {
  const to = document.getElementById('cTo').value.trim();
  const subject = document.getElementById('cSubject').value.trim();
  const body = document.getElementById('cBody').value;
  const status = document.getElementById('sendStatus');
  const btn = document.getElementById('sendBtn');

  if (!to) { status.textContent = 'Please enter a recipient.'; status.className = 'send-status error'; return; }

  btn.disabled = true;
  btn.textContent = 'Sending...';
  status.textContent = '';

  try {
    await sendGmailEmail(to, subject, body);

    // Log to activity
    const c = contacts.find(x => x.id === contactId);
    activity.unshift({
      id: uid(),
      type: 'Email',
      contactId,
      contactName: c ? c.first + ' ' + c.last : '',
      notes: `Subject: ${subject}\n\n${body}`,
      assign: document.getElementById('currentUser')?.value || '',
      date: todayStr(),
      created: new Date().toISOString(),
    });
    persist();

    status.textContent = '✓ Sent!';
    status.className = 'send-status success';
    toast('Email sent!');
    setTimeout(closeModal, 1200);

    // Refresh if on contact detail or activity page
    if (currentPage === 'contact_detail') renderContactDetail();
    else if (currentPage === 'activity') renderActivity();

  } catch(err) {
    status.textContent = err.message;
    status.className = 'send-status error';
    btn.disabled = false;
    btn.textContent = 'Send email';
  }
}

// Gmail setup modal — shown when no client ID configured
function showGmailSetupModal() {
  const existing = localStorage.getItem('tq_gmail_client_id') || '';
  const html = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">Connect Gmail</div>
        <button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--gray-600);margin-bottom:16px;line-height:1.6">
          To send emails from the CRM, you need a free Google OAuth Client ID. This is a one-time setup that takes about 5 minutes. Your emails will be sent from your own Gmail account.
        </p>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Google OAuth Client ID</label>
          <input class="form-input" id="clientIdInput" value="${escAttr(existing)}" placeholder="xxxxxxxxxx.apps.googleusercontent.com">
        </div>
        <details style="margin-bottom:16px">
          <summary style="font-size:13px;font-weight:600;cursor:pointer;color:var(--green);margin-bottom:8px">How to get your Client ID (5 min setup)</summary>
          <div style="font-size:13px;color:var(--gray-600);line-height:1.7;padding-top:8px">
            <b>1.</b> Go to <a href="https://console.cloud.google.com" target="_blank" style="color:var(--blue)">console.cloud.google.com</a><br>
            <b>2.</b> Create a new project (name it "Third Quote CRM")<br>
            <b>3.</b> Go to <b>APIs & Services → Library</b>, enable <b>Gmail API</b><br>
            <b>4.</b> Go to <b>APIs & Services → OAuth consent screen</b>, choose External, fill in app name<br>
            <b>5.</b> Go to <b>APIs & Services → Credentials → Create → OAuth Client ID</b><br>
            <b>6.</b> Application type: <b>Web application</b><br>
            <b>7.</b> Authorized JS origins: add your GitHub Pages URL (e.g. <code>https://yourusername.github.io</code>)<br>
            <b>8.</b> Authorized redirect URIs: add your full CRM URL<br>
            <b>9.</b> Copy the Client ID and paste it above
          </div>
        </details>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveClientId()">Save & Connect</button>
      </div>
    </div></div>`;
  document.getElementById('modalContainer').innerHTML = html;
}

function saveClientId() {
  const id = document.getElementById('clientIdInput').value.trim();
  if (!id) { toast('Please enter a Client ID'); return; }
  localStorage.setItem('tq_gmail_client_id', id);
  GMAIL_CONFIG.clientId = id;
  closeModal();
  setTimeout(handleGmailAuth, 300);
}
