let allCookies = [];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.style.display = 'block';
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

    const url = new URL(tab.url);
    const domain = url.hostname;
    let cookies = [];

    try {
      cookies = await getAllCookies({ url: tab.url });
    } catch (error) {
      // Continue to next method
    }

    if (cookies.length === 0) {
      try {
        cookies = await getAllCookies({ domain });
      } catch (error) {
        // Continue to next method
      }
    }

    if (cookies.length === 0) {
      try {
        cookies = await getAllCookies({ domain: '.' + domain });
      } catch (error) {
        // Continue to next method
      }
    }

    if (cookies.length === 0) {
      try {
        const all = await getAllCookies({});
        cookies = all.filter(cookie => {
          const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
          return cookieDomain === domain || domain.endsWith(cookieDomain);
        });
      } catch (error) {
        // Continue
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

  if (allCookies.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No cookies found for this domain<br>
        <small>Try visiting a page that uses cookies</small>
      </div>`;
    document.getElementById("copy-all").disabled = true;
    return;
  }

  document.getElementById("copy-all").disabled = false;

  container.innerHTML = allCookies
    .map(
      (cookie) => `
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
  const text = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
  try {
    await navigator.clipboard.writeText(text);
    alert("All cookies copied to clipboard!");
  } catch (err) {
    showError("Failed to copy cookies");
  }
}

function findCursorCookie() {
  const exactNames = ['cursor', 'cursor_cookie', 'cursorCookie', 'CURSOR'];
  for (const name of exactNames) {
    const cookie = allCookies.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (cookie) return cookie.value;
  }
  
  const cursorCookie = allCookies.find(c => c.name.toLowerCase().includes('cursor'));
  return cursorCookie ? cursorCookie.value : null;
}

async function getCompassCookies() {
  try {
    let cookies = [];
    const domainVariants = ['compass.sli.ke', '.compass.sli.ke', 'sli.ke', '.sli.ke'];
    
    for (const domain of domainVariants) {
      try {
        const found = await getAllCookies({ domain });
        if (found.length > 0) {
          cookies = found;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (cookies.length === 0) {
      try {
        const all = await getAllCookies({});
        cookies = all.filter(cookie => {
          const cookieDomain = cookie.domain.startsWith('.') 
            ? cookie.domain.substring(1) 
            : cookie.domain;
          return cookieDomain === 'compass.sli.ke' || 
                cookieDomain.endsWith('.compass.sli.ke') ||
                cookieDomain === 'sli.ke' ||
                cookieDomain.endsWith('.sli.ke');
        });
      } catch (error) {
        // Continue
      }
    }
    
    if (cookies.length > 0) {
      return cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }
    
    return '';
  } catch (error) {
    return '';
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
      button.disabled = false;
      button.textContent = originalText;
      return;
    }
    
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
    const chromeMatch = ua.match(/Chrome\/(\d+)/);
    const chromeVersion = chromeMatch ? chromeMatch[1] : '142';
    
    let platform = 'Windows';
    if (navigator.platform.includes('Mac')) {
      platform = 'macOS';
    } else if (navigator.platform.includes('Linux')) {
      platform = 'Linux';
    } else if (navigator.platform.includes('Win')) {
      platform = 'Windows';
    }
    
    const headers = {
      'accept': '*/*',
      'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'content-type': 'application/json',
      'origin': 'https://compass.sli.ke',
      'priority': 'u=1, i',
      'referer': 'https://compass.sli.ke/profile',
      'sec-ch-ua': `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}", "Not_A Brand";v="99"`,
      'sec-ch-ua-mobile': isMobile ? '?1' : '?0',
      'sec-ch-ua-platform': `"${platform}"`,
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': navigator.userAgent,
      'cookie': cookieHeader
    };

    const requestBody = { cursor_cookie: cursorValue };

    const response = await fetch('https://compass.sli.ke/api/users/profile', {
      method: 'PUT',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(requestBody)
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
          if (errorJson.error) {
            errorDetails = typeof errorJson.error === 'string'
              ? errorJson.error
              : JSON.stringify(errorJson.error);
          } else if (errorJson.message) {
            errorDetails = typeof errorJson.message === 'string'
              ? errorJson.message
              : JSON.stringify(errorJson.message);
          } else {
            errorDetails = JSON.stringify(errorJson);
          }
        } else {
          errorDetails = await response.text();
        }
      } catch (e) {
        try {
          errorDetails = await response.text();
        } catch (e2) {
          errorDetails = 'Unknown error';
        }
      }
      
      let errorMessage = `Failed to post cursor cookie: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage += '\n\nAuthentication failed. Make sure you are logged into compass.sli.ke in your browser.';
        errorMessage += '\n\nTry: 1) Open compass.sli.ke in a new tab, 2) Log in, 3) Then try again.';
      } else if (response.status === 500) {
        errorMessage += '\n\nServer error. The API received the request but encountered an error.';
        if (errorDetails && errorDetails !== 'Unknown error' && errorDetails.length < 200) {
          errorMessage += `\n\nServer message: ${errorDetails}`;
        } else if (errorDetails && errorDetails.length >= 200) {
          errorMessage += `\n\nServer message: ${errorDetails.substring(0, 200)}...`;
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
