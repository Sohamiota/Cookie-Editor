let allCookies = [];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.style.display = message ? 'block' : 'none';
  errorDiv.textContent = message;
}

function getAllCookies(query) {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll(query, (cookies) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve(cookies);
    });
  });
}

async function loadCookies() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
      showError("Cannot access cookies on this page (chrome://, edge://, etc.)");
      return;
    }

    const domain = new URL(tab.url).hostname;
    let cookies = [];

    const methods = [
      () => getAllCookies({ url: tab.url }),
      () => getAllCookies({ domain }),
      () => getAllCookies({ domain: '.' + domain }),
      async () => {
        const all = await getAllCookies({});
        return all.filter(cookie => {
          const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
          return cookieDomain === domain || domain.endsWith(cookieDomain);
        });
      }
    ];

    for (const method of methods) {
      try {
        cookies = await method();
        if (cookies.length > 0) break;
      } catch (error) {
        continue;
      }
    }

    allCookies = cookies;
    renderCookies(domain);
  } catch (error) {
    showError("Failed to load cookies: " + error.message);
  }
}

function renderCookies(domain) {
  const container = document.getElementById("cookies-container");
  const copyButton = document.getElementById("copy-all");

  if (allCookies.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No cookies found for this domain<br>
        <small>Try visiting a page that uses cookies</small>
      </div>`;
    copyButton.disabled = true;
    return;
  }

  copyButton.disabled = false;
  container.innerHTML = allCookies
    .map(cookie => `
      <div class="cookie-item">
        <div class="cookie-info">
          <div class="cookie-name">${escapeHtml(cookie.name)}</div>
          <div class="cookie-value" title="${escapeHtml(cookie.value)}">
            ${escapeHtml(cookie.value.substring(0, 100))}${cookie.value.length > 100 ? '...' : ''}
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            Domain: ${escapeHtml(cookie.domain)} | Path: ${escapeHtml(cookie.path)}
          </div>
        </div>
      </div>`
    )
    .join("");
}

async function copyAllCookies() {
  if (allCookies.length === 0) return;
  try {
    await navigator.clipboard.writeText(allCookies.map(c => `${c.name}=${c.value}`).join('; '));
    alert("All cookies copied to clipboard!");
  } catch (err) {
    showError("Failed to copy cookies");
  }
}

function findCursorCookie() {
  const exactNames = ['cursor', 'cursor_cookie', 'cursorCookie', 'CURSOR'];
  let cookie = allCookies.find(c => exactNames.includes(c.name.toLowerCase()));
  
  if (!cookie) {
    cookie = allCookies.find(c => c.name.toLowerCase().includes('cursor'));
  }
  
  return cookie ? `${cookie.name}=${cookie.value}` : null;
}

async function getCompassCookies() {
  const domainVariants = ['compass.sli.ke', '.compass.sli.ke', 'sli.ke', '.sli.ke'];
  
  for (const domain of domainVariants) {
    try {
      const cookies = await getAllCookies({ domain });
      if (cookies.length > 0) {
        return cookies.map(c => `${c.name}=${c.value}`).join('; ');
      }
    } catch (error) {
      continue;
    }
  }
  
  try {
    const all = await getAllCookies({});
    const cookies = all.filter(cookie => {
      const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
      return cookieDomain === 'compass.sli.ke' || cookieDomain.endsWith('.compass.sli.ke') ||
             cookieDomain === 'sli.ke' || cookieDomain.endsWith('.sli.ke');
    });
    return cookies.length > 0 ? cookies.map(c => `${c.name}=${c.value}`).join('; ') : '';
  } catch (error) {
    return '';
  }
}

function buildHeaders(cookieHeader) {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
  const chromeVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '142';
  
  let platform = 'Windows';
  if (navigator.platform.includes('Mac')) platform = 'macOS';
  else if (navigator.platform.includes('Linux')) platform = 'Linux';
  
  return {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json',
    'priority': 'u=1, i',
    'sec-ch-ua': `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}", "Not_A Brand";v="99"`,
    'sec-ch-ua-mobile': isMobile ? '?1' : '?0',
    'sec-ch-ua-platform': `"${platform}"`,
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': ua,
    'cookie': cookieHeader
  };
}

async function checkAuth() {
  try {
    const cookieHeader = await getCompassCookies();
    if (!cookieHeader) return { authenticated: false, error: 'No cookies found' };
    
    const response = await fetch('https://compass.sli.ke/auth/check', {
      method: 'GET',
      headers: buildHeaders(cookieHeader),
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return { authenticated: true, data };
    }
    return { authenticated: false, error: `Status: ${response.status}` };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
}

async function postCursorQuery() {
  const cursorValue = findCursorCookie();
  if (!cursorValue) {
    showError("Cursor cookie not found. Make sure you're on a page with a cursor cookie.");
    return;
  }

  const button = document.getElementById('post-cursor');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Posting...';

  try {
    const cookieHeader = await getCompassCookies();
    if (!cookieHeader) {
      showError("No cookies found for compass.sli.ke. Please make sure you are logged into compass.sli.ke in your browser.");
      return;
    }
    
    const authCheck = await checkAuth();
    if (!authCheck.authenticated) {
      showError("Authentication check failed. Please make sure you are logged into compass.sli.ke.");
      return;
    }
    
    const response = await fetch('https://compass.sli.ke/api/users/profile', {
      method: 'PUT',
      headers: buildHeaders(cookieHeader),
      credentials: 'include',
      body: JSON.stringify({ cursor_cookie: cursorValue })
    });

    if (response.ok) {
      showError("");
      alert("Successfully posted cursor cookie to API!");
    } else {
      let errorDetails = '';
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorJson = await response.json();
          errorDetails = errorJson.error || errorJson.message || JSON.stringify(errorJson);
          if (typeof errorDetails !== 'string') errorDetails = JSON.stringify(errorDetails);
        } else {
          errorDetails = await response.text();
        }
      } catch (e) {
        errorDetails = await response.text().catch(() => 'Unknown error');
      }
      
      let errorMessage = `Failed to post cursor cookie: ${response.status} ${response.statusText}`;
      if (response.status === 401) {
        errorMessage += '\n\nAuthentication failed. Make sure you are logged into compass.sli.ke in your browser.\n\nTry: 1) Open compass.sli.ke in a new tab, 2) Log in, 3) Then try again.';
      } else if (response.status === 500) {
        errorMessage += '\n\nServer error. The API received the request but encountered an error.';
        if (errorDetails && errorDetails !== 'Unknown error') {
          errorMessage += `\n\nServer message: ${errorDetails.length < 200 ? errorDetails : errorDetails.substring(0, 200) + '...'}`;
        }
      }
      showError(errorMessage);
    }
  } catch (error) {
    showError(`Network error: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCookies();
  document.getElementById('copy-all').addEventListener('click', copyAllCookies);
  document.getElementById('post-cursor').addEventListener('click', postCursorQuery);
});
