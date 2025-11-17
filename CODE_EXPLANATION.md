# Compass Cookie Editor - Code Explanation

## Overview
This Chrome extension allows users to view cookies from the current page and automatically post cursor cookies to the compass.sli.ke API endpoint.

## File Structure

### popup.js
Main JavaScript file containing all extension logic.

## Core Functions

### Cookie Management

#### `getAllCookies(query)`
- **Purpose**: Wrapper for Chrome's cookie API to return a Promise
- **Parameters**: `query` - Object with domain/url to search for cookies
- **Returns**: Promise that resolves with array of cookies

#### `loadCookies()`
- **Purpose**: Loads cookies for the current active tab
- **Process**:
  1. Gets the current active tab
  2. Validates the URL is HTTP/HTTPS
  3. Tries multiple methods to find cookies:
    - By exact URL
    - By domain
    - By domain with leading dot
     - By filtering all cookies
  4. Stores cookies in `allCookies` array
  5. Renders cookies in the UI

#### `renderCookies(domain)`
- **Purpose**: Displays cookies in the popup UI
- **Parameters**: `domain` - Domain name to display
- **Behavior**: 
  - Shows empty state if no cookies found
  - Displays each cookie with name, value (truncated), domain, and path
  - Enables/disables copy button based on cookie availability

### Cookie Finding Functions

#### `findCursorCookie()`
- **Purpose**: Finds cursor-related cookies from the loaded cookies
- **Search Strategy**:
  1. First tries exact name matches: 'cursor', 'cursor_cookie', 'cursorCookie', 'CURSOR'
  2. Then searches for any cookie with 'cursor' in the name (case-insensitive)
- **Returns**: Cookie value string or null

#### `getCompassCookies()`
- **Purpose**: Retrieves authentication cookies from compass.sli.ke domain
- **Search Strategy**:
  1. Tries multiple domain variants: 'compass.sli.ke', '.compass.sli.ke', 'sli.ke', '.sli.ke'
  2. Falls back to filtering all cookies if direct search fails
- **Returns**: Formatted cookie string for Cookie header (name=value; name2=value2) or empty string

### API Communication

#### `postCursorQuery()`
- **Purpose**: Sends cursor cookie to compass.sli.ke API
- **Process**:
  1. Finds cursor cookie from current page
  2. Gets compass.sli.ke authentication cookies
  3. Builds request headers matching curl command format
  4. Sends PUT request to `/api/users/profile`
  5. Handles success/error responses

**Request Details**:
- **Method**: PUT
- **URL**: `https://compass.sli.ke/api/users/profile`
- **Headers**: 
  - Standard browser headers (accept, accept-language, content-type, etc.)
  - Security headers (sec-ch-ua, sec-fetch-*, etc.)
  - Cookie header with compass.sli.ke cookies
- **Body**: JSON with `{ cursor_cookie: "<cookie_value>" }`

**Error Handling**:
- 401: Authentication failure - prompts user to log in
- 500: Server error - displays server error message
- Network errors: Shows network error message

### Utility Functions

#### `escapeHtml(text)`
- **Purpose**: Sanitizes text to prevent XSS attacks
- **Returns**: HTML-escaped string

#### `showError(message)`
- **Purpose**: Displays error message in the popup UI
- **Parameters**: `message` - Error message to display

#### `copyAllCookies()`
- **Purpose**: Copies all cookies to clipboard in format: `name=value; name2=value2`
- **Behavior**: Shows alert on success, error message on failure

## Initialization

The extension initializes when the DOM is loaded:
1. Loads cookies for current page
2. Sets up event listeners for:
   - Copy All button
   - Post Cursor Query button

## How It Works

1. **User opens extension popup** → `loadCookies()` runs automatically
2. **Extension finds cookies** → Displays them in the UI
3. **User clicks "Post Cursor Query"** → `postCursorQuery()` executes:
   - Finds cursor cookie from current page
   - Gets compass.sli.ke authentication cookies
   - Builds request matching curl format
   - Sends API request
   - Shows success/error message

## API Endpoint

**Endpoint**: `PUT https://compass.sli.ke/api/users/profile`

**Request Body**:
```json
{
  "cursor_cookie": "<cursor_cookie_value>"
}
```

**Authentication**: 
- Uses cookies from compass.sli.ke domain
- Cookies are automatically included in the Cookie header

**Response**:
- Success: 200 OK
- Authentication Error: 401 Unauthorized
- Server Error: 500 Internal Server Error

## Browser Compatibility

- Requires Chrome/Chromium browser
- Uses Chrome Extension API (`chrome.cookies`, `chrome.tabs`)
- Manifest V3 compatible

