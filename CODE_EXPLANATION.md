# Compass Cookie Editor - Code Explanation

## Overview

Chrome extension with a modern Compass-themed UI that automatically syncs cursor cookies to the compass.sli.ke API. The extension displays user information, provides a sync button with visual feedback, and handles authentication seamlessly. The code is optimized, well-organized, and production-ready with no console logging.

## Code Structure

The code is organized into logical sections:

1. **State Management** - Application state and DOM element references
2. **Initialization** - DOM setup and event listeners
3. **UI Functions** - Display updates and visual effects
4. **Cookie Utilities** - Cookie loading and finding functions
5. **API Functions** - HTTP requests and authentication
6. **User Data Functions** - User information fetching and formatting
7. **Main Functions** - Sync handler and core logic

---

## Global Variables

### `state`

- **Type**: Object
- **Purpose**: Manages application state
- **Properties**:
  - `isSyncing` (boolean) - Whether sync operation is in progress
  - `syncProgress` (number) - Sync progress percentage (0-100)
  - `lastSyncTime` (string) - Formatted last sync time
  - `userData` (object) - User information with `name` and `email`

### `allCookies`

- **Type**: Array
- **Purpose**: Stores all cookies loaded from the current page
- **Usage**: Used to find cursor cookies for syncing

### `elements`

- **Type**: Object
- **Purpose**: Caches DOM element references for performance
- **Properties**: References to all interactive UI elements (buttons, text elements, containers)

---

## Initialization

### `DOMContentLoaded` Event Listener

- **Purpose**: Initializes extension when popup loads
- **Actions**:
  1. Initializes DOM element references
  2. Sets up event listeners
  3. Loads user data from storage/API
  4. Loads and displays last sync time

### `initializeElements()`

- **Purpose**: Caches all DOM element references
- **Process**: Queries DOM for all interactive elements and stores references in `elements` object
- **Performance**: Reduces repeated DOM queries

### `setupEventListeners()`

- **Purpose**: Attaches event handlers to UI elements
- **Actions**:
  - Sync button click → `handleSync()`
  - Loads cookies on startup

---

## UI Functions

### `showError(message)`

- **Purpose**: Displays or hides error messages in the popup UI
- **Parameters**: `message` (string) - Error message to display (empty string hides error)
- **Behavior**:
  - Creates error div if it doesn't exist
  - Shows/hides error div based on message
  - Updates error text content
- **Styling**: Dynamically creates styled error message box

### `updateUserDisplay()`

- **Purpose**: Updates name and email display in UI
- **Process**: Sets text content of user name and email elements from state

### `updateLastSyncDisplay()`

- **Purpose**: Updates last sync time display
- **Process**: Sets text content of last sync element from state

### `createParticle(x, y)`

- **Purpose**: Creates animated particle effect during sync
- **Parameters**: `x`, `y` (numbers) - Position percentages
- **Process**:
  1. Creates div element with particle class
  2. Sets random horizontal offset for animation
  3. Positions particle at specified location
  4. Auto-removes after animation completes (1.5s)

### `generateParticles()`

- **Purpose**: Generates 8 particles at random positions for sync animation
- **Process**: Clears existing particles and creates new ones

### `updateSyncUI(syncing)`

- **Purpose**: Updates sync button UI state
- **Parameters**: `syncing` (boolean) - Whether sync is active
- **Behavior**:
  - If syncing: Adds 'syncing' class, disables button, changes text to "Syncing...", generates particles
  - If not syncing: Removes 'syncing' class, enables button, resets text to "Sync Now", clears particles

### `updateSyncProgress(progress)`

- **Purpose**: Updates sync progress bar
- **Parameters**: `progress` (number) - Progress percentage
- **Process**: Updates state and sets progress bar width

---

## Cookie Utilities

### `getAllCookies(query)`

- **Purpose**: Wrapper for Chrome's cookie API to return a Promise
- **Parameters**: `query` (object) - Cookie query object (domain, url, etc.)
- **Returns**: Promise that resolves with array of cookies or rejects with error
- **How it works**: Converts Chrome's callback-based API to Promise-based

### `loadCookies()`

- **Purpose**: Loads cookies for the current active tab
- **Process**:
  1. Gets the current active tab using Chrome tabs API
  2. Validates URL is HTTP/HTTPS (blocks chrome://, edge://, etc.)
  3. Extracts domain from URL
  4. Tries multiple methods to find cookies (in order):
     - By exact URL
     - By domain
     - By domain with leading dot
     - By filtering all cookies
  5. Stores cookies in `allCookies` array
- **Error Handling**: Silent error handling - fails gracefully

### `findCursorCookie()`

- **Purpose**: Finds cursor-related cookies from loaded cookies
- **Search Strategy**:
  1. First tries exact name matches: 'cursor', 'cursor_cookie', 'cursorCookie', 'CURSOR'
  2. Then searches for any cookie with 'cursor' in the name (case-insensitive)
- **Returns**:
  - Full cookie string in format `"name=value"` if found
  - `null` if not found
- **Note**: Returns the full cookie string (name=value) as required by the API

### `getCompassCookies()`

- **Purpose**: Retrieves authentication cookies from compass.sli.ke domain
- **Search Strategy**:
  1. Tries multiple domain variants: 'compass.sli.ke', '.compass.sli.ke', 'sli.ke', '.sli.ke'
  2. Falls back to filtering all cookies if direct search fails
- **Returns**:
  - Formatted cookie string for Cookie header: `"name1=value1; name2=value2"`
  - Empty string if no cookies found
- **Usage**: Used for authentication in API requests

---

## API Functions

### `buildHeaders(cookieHeader)`

- **Purpose**: Builds HTTP headers matching browser request format
- **Parameters**: `cookieHeader` (string) - Formatted cookie string from `getCompassCookies()`
- **Returns**: Object with all required headers
- **Headers Included**:
  - `accept`: '_/_'
  - `accept-language`: 'en-US,en;q=0.9'
  - `content-type`: 'application/json'
  - `origin`: 'https://compass.sli.ke' (required for CORS)
  - `priority`: 'u=1, i'
  - `sec-ch-ua`: Browser version info (dynamically detected)
  - `sec-ch-ua-mobile`: Mobile detection (?0 or ?1)
  - `sec-ch-ua-platform`: Platform info (Windows/macOS/Linux)
  - `sec-fetch-*`: Security headers
  - `user-agent`: Browser user agent
  - `cookie`: Authentication cookies
- **Platform Detection**: Automatically detects Windows, macOS, or Linux

### `checkAuth()`

- **Purpose**: Verifies authentication by checking if user is logged into compass.sli.ke
- **Process**:
  1. Gets compass.sli.ke cookies using `getCompassCookies()`
  2. Builds headers using `buildHeaders()`
  3. Sends GET request to `/auth/check` endpoint
  4. Returns authentication status
- **Returns**:
  - `{ authenticated: true, data: {...} }` if successful
  - `{ authenticated: false, error: '...' }` if failed
- **Usage**: Called before posting cursor cookie to ensure user is authenticated

### `syncCursorCookie()`

- **Purpose**: Main API function that syncs cursor cookie to Compass API
- **Process**:
  1. Reloads cookies to get latest cursor cookie
  2. Finds cursor cookie using `findCursorCookie()`
  3. Validates cursor cookie exists (throws error if not)
  4. Gets compass.sli.ke authentication cookies
  5. Verifies authentication using `checkAuth()`
  6. Builds request headers
  7. Sends PUT request to `/api/users/profile` with cursor cookie
  8. Handles success/error responses
- **Request Details**:
  - **Method**: PUT
  - **URL**: `https://compass.sli.ke/api/users/profile`
  - **Body**: `{ cursor_cookie: "name=value" }`
  - **Headers**: Built by `buildHeaders()` (includes `origin` header)
- **Response Handling**:
  - Success: Extracts user data if present, returns success object
  - Error: Throws detailed error message based on status code
- **Error Handling**:
  - 401: Authentication failure - prompts user to log in
  - 500: Server error - displays server error message
  - Network errors: Shows network error message
- **Returns**: `{ success: true, cursorCookie: string, userData: object }`

---

## User Data Functions

### `extractUserData(data)`

- **Purpose**: Extracts user information from API response
- **Parameters**: `data` (object) - API response data
- **Process**: Tries multiple response formats:
  1. Checks `data.user` or `data.data.user`
  2. Falls back to root level `data.email` or `data.name`
- **Returns**: `{ name: string, email: string }` or `null`

### `getGoogleAccountEmail()`

- **Purpose**: Gets Google account email using Chrome Identity API
- **Process**: Uses `chrome.identity.getProfileUserInfo()` to get logged-in Google account
- **Returns**: Email string or `null` if unavailable
- **Note**: Requires `identity` permission in manifest

### `fetchUserDataFromCompass()`

- **Purpose**: Fetches user data from Compass API
- **Process**:
  1. Gets compass.sli.ke cookies
  2. Builds headers
  3. Sends GET request to `/auth/check`
  4. Extracts user data from response
- **Returns**: User data object or `null`

### `formatNameFromEmail(email)`

- **Purpose**: Formats a display name from email address
- **Parameters**: `email` (string) - Email address
- **Process**:
  1. Extracts part before @
  2. Splits by dots
  3. Capitalizes each part
  4. Joins with spaces
- **Example**: `john.doe@example.com` → `"John Doe"`

### `loadUserData()`

- **Purpose**: Loads and displays user information
- **Process**:
  1. Loads cached user data from storage
  2. Updates UI with cached data (for quick display)
  3. Fetches fresh data from Compass API
  4. Falls back to Google account email if API doesn't return data
  5. Formats name from email if needed
  6. Updates UI and saves to storage
- **Priority**: Compass API > Google Account > Cached Data

### `formatLastSyncTime(timestamp)`

- **Purpose**: Formats timestamp into human-readable string
- **Parameters**: `timestamp` (number) - Unix timestamp in milliseconds
- **Returns**: Formatted string:
  - `"Never"` if no timestamp
  - `"Just now"` if < 60 seconds
  - `"Xm ago"` if < 60 minutes
  - `"Xh ago"` if < 24 hours
  - `"Xd ago"` if < 7 days
  - Date string otherwise

### `loadLastSyncTime()`

- **Purpose**: Loads and displays last sync time on startup
- **Process**: Gets timestamp from storage, formats it, updates display

---

## Main Functions

### `handleSync()`

- **Purpose**: Main sync handler - orchestrates UI updates and API calls
- **Process**:
  1. Prevents multiple simultaneous syncs
  2. Updates UI to syncing state
  3. Starts progress animation
  4. Calls `syncCursorCookie()` to perform actual sync
  5. Updates user data if returned from API
  6. Updates last sync time
  7. Saves state to storage
  8. Handles errors and displays messages
  9. Resets UI state
- **UI Updates**:
  - Shows particles animation
  - Updates progress bar
  - Disables button during sync
  - Shows error messages on failure
- **Error Handling**: Displays user-friendly error messages

### `syncCursorCookie()`

- **Purpose**: Core API function - handles all API communication
- **Separation**: Completely separated from UI logic for testability
- **See API Functions section above for full details**

---

## Request Flow

### Complete Flow for Syncing Cursor Cookie:

1. **User clicks "Sync Now" button**

   - `handleSync()` is called

2. **UI Updates**

   - Button disabled, text changes to "Syncing..."
   - Particles animation starts
   - Progress bar begins animating

3. **Load Cookies**

   - `loadCookies()` reloads cookies from current page
   - Stores in `allCookies` array

4. **Find Cursor Cookie**

   - `findCursorCookie()` searches `allCookies` array
   - Returns `"CookieName=value"` format
   - Throws error if not found

5. **Get Authentication Cookies**

   - `getCompassCookies()` retrieves cookies from compass.sli.ke
   - Returns formatted cookie string

6. **Verify Authentication**

   - `checkAuth()` sends GET to `/auth/check`
   - Uses `buildHeaders()` to create headers
   - Validates user is logged in
   - Throws error if authentication fails

7. **Post Cursor Cookie**

   - Builds headers using `buildHeaders()` (includes `origin` header)
   - Sends PUT request to `/api/users/profile`
   - Body: `{ cursor_cookie: "name=value" }`

8. **Handle Response**

   - Success: Extracts user data if present, updates state
   - Error: Parses error details, throws with user-friendly message
   - Updates last sync time to "Just now"
   - Saves to storage

9. **UI Reset**
   - Progress bar resets
   - Button re-enabled
   - Particles cleared
   - Error message displayed if failed

---

## API Endpoints Used

### `GET /auth/check`

- **Purpose**: Verify authentication status and get user data
- **Headers**: Built by `buildHeaders()` (includes `origin` header)
- **Response**: Authentication status object, may include user data
- **Usage**: Used for authentication check and fetching user information

### `PUT /api/users/profile`

- **Purpose**: Update user profile with cursor cookie
- **Headers**: Built by `buildHeaders()` (includes `origin` header, same format as `/auth/check`)
- **Body**: `{ cursor_cookie: "name=value" }`
- **Response**:
  - Success: `{ data: { cursor_cookie: "...", user: {...} }, ... }`
  - Error: Error object with status and message

---

## Key Design Decisions

1. **Code Organization**: Functions grouped by purpose (UI, API, Cookie Utils, etc.)
2. **Separation of Concerns**: API logic (`syncCursorCookie`) separated from UI logic (`handleSync`)
3. **Cookie Format**: Sends full `"name=value"` string, not just value
4. **Header Consistency**: Both endpoints use same header format
5. **Origin Header**: Added `origin: 'https://compass.sli.ke'` for proper CORS handling
6. **Response Parsing**: Flexible parsing handles multiple response formats
7. **Error Handling**: Comprehensive error messages for different scenarios (401, 500, network errors)
8. **Authentication Check**: Verifies auth before posting to prevent unnecessary requests
9. **UI State Management**: Uses state object and dedicated UI update functions
10. **Progress Animation**: Visual feedback during sync operations
11. **User Data Priority**: Compass API > Google Account > Cached Data
12. **No Logging**: Optimized for production with no console.log statements
13. **Silent Error Handling**: Errors handled gracefully without verbose logging

---

## Browser Compatibility

- Requires Chrome/Chromium browser
- Uses Chrome Extension API (`chrome.cookies`, `chrome.tabs`, `chrome.storage`, `chrome.identity`)
- Manifest V3 compatible
- No external dependencies

---

## Code Optimization Features

- **No Console Logging**: All debug logs removed for production
- **Efficient Cookie Search**: Multiple fallback strategies for finding cookies
- **DOM Caching**: Element references cached to reduce DOM queries
- **Clean Error Handling**: User-friendly error messages without technical noise
- **Streamlined Flow**: Direct execution path with minimal overhead
- **Proper CORS**: Includes `origin` header for cross-origin requests
- **State Management**: Centralized state object for easy updates
- **Function Organization**: Logical grouping for maintainability
- **Reusable Functions**: Extracted common logic into reusable functions
