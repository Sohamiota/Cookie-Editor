# Compass Cookie Editor - Code Explanation

## Overview

Chrome extension that views cookies from the current page and automatically posts cursor cookies to the compass.sli.ke API endpoint. The code is optimized with no console logging for production use.

## Global Variables

### `allCookies`

- **Type**: Array
- **Purpose**: Stores all cookies loaded from the current page
- **Usage**: Used throughout the extension to display cookies and find cursor cookies

---

## Utility Functions

### `escapeHtml(text)`

- **Purpose**: Sanitizes text to prevent XSS attacks when displaying in HTML
- **Parameters**:
  - `text` (string) - Text to escape
- **Returns**: HTML-escaped string
- **How it works**: Creates a temporary div element, sets textContent (which automatically escapes HTML), then returns innerHTML

### `showError(message)`

- **Purpose**: Displays or hides error messages in the popup UI
- **Parameters**:
  - `message` (string) - Error message to display (empty string hides error)
- **Behavior**:
  - Shows error div if message is provided
  - Hides error div if message is empty
  - Updates error text content

### `getAllCookies(query)`

- **Purpose**: Wrapper for Chrome's cookie API to return a Promise
- **Parameters**:
  - `query` (object) - Cookie query object (domain, url, etc.)
- **Returns**: Promise that resolves with array of cookies or rejects with error
- **How it works**: Converts Chrome's callback-based API to Promise-based

---

## Cookie Loading Functions

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
  6. Renders cookies in UI
- **Error Handling**: Shows error message if loading fails

### `renderCookies(domain)`

- **Purpose**: Displays cookies in the popup UI
- **Parameters**:
  - `domain` (string) - Domain name (currently unused but kept for consistency)
- **Behavior**:
  - Shows empty state if no cookies found
  - Disables "Copy All" button if no cookies
  - Renders each cookie with:
    - Cookie name (highlighted)
    - Cookie value (truncated to 100 chars, full value in tooltip)
    - Domain and path information
- **Security**: Uses `escapeHtml()` to prevent XSS

---

## Cookie Finding Functions

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
- **Optimization**: No logging, silent error handling

---

## API Communication Functions

### `buildHeaders(cookieHeader)`

- **Purpose**: Builds HTTP headers matching the `/auth/check` curl command format
- **Parameters**:
  - `cookieHeader` (string) - Formatted cookie string from `getCompassCookies()`
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
  1. Gets compass.sli.ke cookies
  2. Builds headers using `buildHeaders()`
  3. Sends GET request to `/auth/check` endpoint
  4. Returns authentication status
- **Returns**:
  - `{ authenticated: true, data: {...} }` if successful
  - `{ authenticated: false, error: '...' }` if failed
- **Usage**: Called before posting cursor cookie to ensure user is authenticated
- **Optimization**: No logging, clean error handling

### `postCursorQuery()`

- **Purpose**: Main function that posts cursor cookie to the API
- **Process**:
  1. Finds cursor cookie from current page
  2. Validates cursor cookie exists
  3. Gets compass.sli.ke authentication cookies
  4. Verifies authentication using `checkAuth()`
  5. Builds request headers
  6. Sends PUT request to `/api/users/profile` with cursor cookie
  7. Handles success/error responses
- **Request Details**:
  - **Method**: PUT
  - **URL**: `https://compass.sli.ke/api/users/profile`
  - **Body**: `{ cursor_cookie: "name=value" }`
  - **Headers**: Same format as `/auth/check` curl command (includes `origin` header)
- **Response Handling**:
  - Success: Checks if `cursor_cookie` is in response (nested in `result.data.cursor_cookie`)
  - Shows alert with saved cookie value if found
  - Shows generic success message if cookie not in response
- **Error Handling**:
  - 401: Authentication failure - prompts user to log in
  - 500: Server error - displays server error message
  - Network errors: Shows network error message
- **UI Updates**:
  - Disables button during request
  - Shows "Posting..." text
  - Resets button in `finally` block
- **Optimization**: No console logging, streamlined error handling

---

## Helper Functions

### `copyAllCookies()`

- **Purpose**: Copies all cookies to clipboard in format: `name=value; name2=value2`
- **Process**:
  1. Checks if cookies exist
  2. Formats all cookies as semicolon-separated string
  3. Copies to clipboard
  4. Shows success alert
- **Error Handling**: Shows error message if copy fails

---

## Initialization

### `DOMContentLoaded` Event Listener

- **Purpose**: Initializes extension when popup loads
- **Actions**:
  1. Loads cookies for current page (`loadCookies()`)
  2. Sets up event listeners:
     - "Copy All" button → `copyAllCookies()`
     - "Post Cursor Query" button → `postCursorQuery()`

---

## Request Flow

### Complete Flow for Posting Cursor Cookie:

1. **User clicks "Post Cursor Query"**

   - `postCursorQuery()` is called

2. **Find Cursor Cookie**

   - `findCursorCookie()` searches `allCookies` array
   - Returns `"WorkosCursorSessionToken=value"` format

3. **Get Authentication Cookies**

   - `getCompassCookies()` retrieves cookies from compass.sli.ke
   - Returns formatted cookie string

4. **Verify Authentication**

   - `checkAuth()` sends GET to `/auth/check`
   - Uses `buildHeaders()` to create headers
   - Validates user is logged in

5. **Post Cursor Cookie**

   - Builds headers using `buildHeaders()` (includes `origin` header)
   - Sends PUT request to `/api/users/profile`
   - Body: `{ cursor_cookie: "name=value" }`

6. **Handle Response**
   - Success: Parses response, checks for `cursor_cookie` in `result.data.cursor_cookie`
   - Shows alert with saved cookie value if found
   - Error: Shows detailed error message
   - Always: Resets button state in `finally` block

---

## API Endpoints Used

### `GET /auth/check`

- **Purpose**: Verify authentication status
- **Headers**: Built by `buildHeaders()` (includes `origin` header)
- **Response**: Authentication status object

### `PUT /api/users/profile`

- **Purpose**: Update user profile with cursor cookie
- **Headers**: Built by `buildHeaders()` (includes `origin` header, same format as `/auth/check`)
- **Body**: `{ cursor_cookie: "name=value" }`
- **Response**:
  - Success: `{ data: { cursor_cookie: "...", ... }, message: "User profile updated successfully" }`
  - Error: Error object with status and message

---

## Key Design Decisions

1. **Cookie Format**: Sends full `"name=value"` string, not just value
2. **Header Consistency**: Both endpoints use same header format from `/auth/check` curl
3. **Origin Header**: Added `origin: 'https://compass.sli.ke'` for proper CORS handling
4. **Response Parsing**: Checks both `result.data.cursor_cookie` and `result.cursor_cookie` for flexibility
5. **Error Handling**: Comprehensive error messages for different scenarios (401, 500, network errors)
6. **Authentication Check**: Verifies auth before posting to prevent unnecessary requests
7. **Button State Management**: Uses `finally` block to ensure button always resets
8. **No Logging**: Optimized for production with no console.log statements
9. **Silent Error Handling**: Errors are handled gracefully without verbose logging

---

## Browser Compatibility

- Requires Chrome/Chromium browser
- Uses Chrome Extension API (`chrome.cookies`, `chrome.tabs`)
- Manifest V3 compatible
- No external dependencies

---

## Code Optimization Features

- **No Console Logging**: All debug logs removed for production
- **Efficient Cookie Search**: Multiple fallback strategies for finding cookies
- **Clean Error Handling**: User-friendly error messages without technical noise
- **Streamlined Flow**: Direct execution path with minimal overhead
- **Proper CORS**: Includes `origin` header for cross-origin requests
