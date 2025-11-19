const state = {
  isSyncing: false,
  syncProgress: 0,
  lastSyncTime: 'Never',
  userData: { name: 'Alex Rivera', email: 'alex.rivera@compass.dev' }
};

let allCookies = [];

const elements = {
  syncButton: null,
  syncIcon: null,
  syncText: null,
  syncProgress: null,
  lastSyncInfo: null,
  userName: null,
  userEmail: null,
  particlesContainer: null
};

document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupEventListeners();
  loadUserData();
  loadLastSyncTime();
});

function initializeElements() {
  elements.syncButton = document.getElementById('sync-button');
  elements.syncIcon = document.getElementById('sync-icon');
  elements.syncText = document.getElementById('sync-text');
  elements.syncProgress = document.getElementById('sync-progress');
  elements.lastSyncInfo = document.getElementById('last-sync-info');
  elements.userName = document.getElementById('user-name');
  elements.userEmail = document.getElementById('user-email');
  elements.particlesContainer = document.getElementById('particles-container');
}

function setupEventListeners() {
  elements.syncButton.addEventListener('click', handleSync);
  loadCookies();
}

function showError(message) {
  let errorDiv = document.getElementById('error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'error';
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = 'display: none; padding: 12px; margin: 12px 16px; background: rgba(127, 29, 29, 0.3); border: 1px solid rgba(220, 38, 38, 0.5); border-radius: 6px; color: #fca5a5; font-size: 12px;';
    const content = document.querySelector('.content');
    if (content) content.insertBefore(errorDiv, content.firstChild);
  }
  errorDiv.style.display = message ? 'block' : 'none';
  errorDiv.textContent = message;
}

function updateUserDisplay() {
  if (elements.userName) elements.userName.textContent = state.userData.name;
  if (elements.userEmail) elements.userEmail.textContent = state.userData.email;
}

function updateLastSyncDisplay() {
  if (elements.lastSyncInfo) elements.lastSyncInfo.textContent = state.lastSyncTime;
}

function createParticle(x, y) {
  const particle = document.createElement('div');
  particle.className = 'particle';
  const randomX = (Math.random() - 0.5) * 40;
  particle.style.setProperty('--random-x', randomX);
  particle.style.left = `${x}%`;
  particle.style.top = `${y}%`;
  elements.particlesContainer.appendChild(particle);
  setTimeout(() => {
    if (particle.parentNode) particle.parentNode.removeChild(particle);
  }, 1500);
}

function generateParticles() {
  elements.particlesContainer.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    createParticle(Math.random() * 100, Math.random() * 100);
  }
}

function updateSyncUI(syncing) {
  if (syncing) {
    elements.syncButton.classList.add('syncing');
    elements.syncButton.disabled = true;
    elements.syncText.textContent = 'Syncing...';
    generateParticles();
  } else {
    elements.syncButton.classList.remove('syncing');
    elements.syncButton.disabled = false;
    elements.syncText.textContent = 'Sync Now';
    elements.syncProgress.style.width = '0%';
    elements.particlesContainer.innerHTML = '';
  }
}

function updateSyncProgress(progress) {
  state.syncProgress = Math.min(progress, 100);
  elements.syncProgress.style.width = `${state.syncProgress}%`;
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
    if (!tab.url?.startsWith('http')) return;

    const domain = new URL(tab.url).hostname;
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
        const cookies = await method();
        if (cookies.length > 0) {
          allCookies = cookies;
          break;
        }
      } catch {}
    }
  } catch {}
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
    } catch {}
  }
  
  try {
    const all = await getAllCookies({});
    const cookies = all.filter(cookie => {
      const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
      return cookieDomain === 'compass.sli.ke' || cookieDomain.endsWith('.compass.sli.ke') ||
            cookieDomain === 'sli.ke' || cookieDomain.endsWith('.sli.ke');
    });
    return cookies.length > 0 ? cookies.map(c => `${c.name}=${c.value}`).join('; ') : '';
  } catch {
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
    'origin': 'https://compass.sli.ke',
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
    
    const headers = buildHeaders(cookieHeader);
    const response = await fetch('https://compass.sli.ke/auth/check', {
      method: 'GET',
      headers,
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

function extractUserData(data) {
  if (data.user || data.data?.user) {
    const user = data.user || data.data.user;
    return {
      name: user.name || user.displayName || user.fullName || 'User',
      email: user.email || user.emailAddress || null
    };
  }
  if (data.email || data.name) {
    return {
      name: data.name || data.displayName || 'User',
      email: data.email || data.emailAddress || null
    };
  }
  return null;
}

async function getGoogleAccountEmail() {
  try {
    if (chrome.identity?.getProfileUserInfo) {
      const userInfo = await new Promise((resolve) => {
        chrome.identity.getProfileUserInfo(resolve);
      });
      return userInfo.email || null;
    }
  } catch {}
  return null;
}

async function fetchUserDataFromCompass() {
  try {
    const cookieHeader = await getCompassCookies();
    if (!cookieHeader) return null;
    
    const headers = buildHeaders(cookieHeader);
    const response = await fetch('https://compass.sli.ke/auth/check', {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return extractUserData(data);
    }
  } catch {}
  return null;
}

function formatNameFromEmail(email) {
  const emailName = email.split('@')[0];
  return emailName.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(' ') || 'User';
}

async function loadUserData() {
  try {
    const stored = await chrome.storage.local.get(['userData', 'lastSyncTime']);
    
    if (stored.userData) {
      state.userData = stored.userData;
      updateUserDisplay();
    }
    
    if (stored.lastSyncTime) {
      state.lastSyncTime = stored.lastSyncTime;
      updateLastSyncDisplay();
    }
    
    const compassUserData = await fetchUserDataFromCompass();
    
    if (compassUserData) {
      if (compassUserData.email) state.userData.email = compassUserData.email;
      if (compassUserData.name) state.userData.name = compassUserData.name;
    } else {
      const googleEmail = await getGoogleAccountEmail();
      if (googleEmail && !state.userData.email) {
        state.userData.email = googleEmail;
        if (!state.userData.name || state.userData.name === 'Alex Rivera') {
          state.userData.name = formatNameFromEmail(googleEmail);
        }
      }
    }
    
    updateUserDisplay();
    await chrome.storage.local.set({ userData: state.userData });
  } catch {}
}

function formatLastSyncTime(timestamp) {
  if (!timestamp) return 'Never';
  
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function loadLastSyncTime() {
  chrome.storage.local.get(['lastSyncTimestamp'], (result) => {
    if (result.lastSyncTimestamp) {
      state.lastSyncTime = formatLastSyncTime(result.lastSyncTimestamp);
      updateLastSyncDisplay();
    }
  });
}

async function syncCursorCookie() {
  await loadCookies();
  
  const cursorValue = findCursorCookie();
  if (!cursorValue) {
    throw new Error("Cursor cookie not found. Make sure you're on a page with a cursor cookie.");
  }

  const cookieHeader = await getCompassCookies();
  if (!cookieHeader) {
    throw new Error("No cookies found for compass.sli.ke. Please make sure you are logged into compass.sli.ke in your browser.");
  }
  
  const authCheck = await checkAuth();
  if (!authCheck.authenticated) {
    throw new Error("Authentication check failed. Please make sure you are logged into compass.sli.ke.");
  }
  
  const headers = buildHeaders(cookieHeader);
  const response = await fetch('https://compass.sli.ke/api/users/profile', {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify({ cursor_cookie: cursorValue })
  });

  if (!response.ok) {
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
    } catch {
      errorDetails = await response.text().catch(() => 'Unknown error');
    }
    
    let errorMessage = `Failed to sync: ${response.status} ${response.statusText}`;
    if (response.status === 401) {
      errorMessage = 'Authentication failed. Make sure you are logged into compass.sli.ke in your browser.\n\nTry: 1) Open compass.sli.ke in a new tab, 2) Log in, 3) Then try again.';
    } else if (response.status === 500) {
      errorMessage = 'Server error. The API received the request but encountered an error.';
      if (errorDetails && errorDetails !== 'Unknown error') {
        errorMessage += `\n\nServer message: ${errorDetails.length < 200 ? errorDetails : errorDetails.substring(0, 200) + '...'}`;
      }
    }
    throw new Error(errorMessage);
  }
  
  const result = await response.json().catch(() => ({}));
  const userData = extractUserData(result);
  
  return {
    success: true,
    cursorCookie: result.data?.cursor_cookie || result.cursor_cookie,
    userData
  };
}

async function handleSync() {
  if (state.isSyncing) return;
  
  state.isSyncing = true;
  state.syncProgress = 0;
  updateSyncUI(true);
  
  const progressInterval = setInterval(() => {
    updateSyncProgress(state.syncProgress + Math.random() * 25);
    if (state.syncProgress >= 100) clearInterval(progressInterval);
  }, 150);
  
  try {
    showError('');
    const result = await syncCursorCookie();
    
    if (result.userData) {
      if (result.userData.email) state.userData.email = result.userData.email;
      if (result.userData.name) state.userData.name = result.userData.name;
      updateUserDisplay();
      await chrome.storage.local.set({ userData: state.userData });
    }
    
    state.lastSyncTime = 'Just now';
    await chrome.storage.local.set({
      lastSyncTime: state.lastSyncTime,
      lastSyncTimestamp: Date.now()
    });
    updateLastSyncDisplay();
    
  } catch (error) {
    showError(error.message || 'Sync failed. Please try again.');
  } finally {
    clearInterval(progressInterval);
    setTimeout(() => {
      state.isSyncing = false;
      state.syncProgress = 0;
      updateSyncUI(false);
    }, 500);
  }
}
