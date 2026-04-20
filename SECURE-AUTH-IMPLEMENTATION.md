# Secure Authentication System Implementation

## Overview

This document describes the complete secure authentication system implementation featuring httpOnly cookie-based tokens, CSRF protection, and automatic token refresh with retry logic.

## Architecture

### Backend (Express)

#### Token Strategy
- **Access Token**: Short-lived JWT (15 minutes)
- **Refresh Token**: Long-lived JWT (7 days)
- Both stored in **httpOnly, secure, sameSite cookies** (never in localStorage)

#### Endpoints

##### `POST /api/auth/signup`
- Creates new user account
- Issues access and refresh tokens
- Issues CSRF token
- **CSRF Protection**: Exempt (initial auth endpoint)

##### `POST /api/auth/login`
- Authenticates user with email/password
- Issues new access and refresh tokens
- Issues CSRF token
- **CSRF Protection**: Exempt (initial auth endpoint)

##### `POST /api/refresh`
- **Purpose**: Obtain new access token when current one expires
- **HTTP Status 401**: No refresh token cookie present (session invalid)
- **HTTP Status 403**: Refresh token invalid, malformed, or expired (session compromised)
- **Response includes**:
  - New access token (httpOnly cookie)
  - New refresh token (httpOnly cookie)
  - New CSRF token (in JSON response body AND httpOnly cookie)
- **CSRF Protection**: Exempt (must be callable without valid CSRF token)

##### `POST /api/auth/logout`
- Clears all auth cookies (access token, refresh token, CSRF token)
- **CSRF Protection**: Exempt (logout is safe to call even without valid CSRF token)

##### `GET /api/auth/me`
- Returns current user profile
- **Requires**: Valid access token in cookie
- **Returns 401**: If access token missing or invalid
- **Response does NOT trigger retry** in frontend (by design - auth bootstrap should fail quietly)

#### CSRF Protection

**Exempt Routes** (no CSRF token required):
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/google-login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/resend`
- `POST /auth/logout`
- `POST /refresh` ← Key exemption for token refresh

**Protected Routes** (all other POST/PUT/PATCH/DELETE requests):
- Requires matching `csrfToken` cookie and `X-CSRF-Token` header
- Returns **403** if validation fails
- Frontend automatically retries by calling `/refresh` to get new CSRF token

#### Middleware Stack

```javascript
// Cookie parsing and CSRF setup
app.use(cookieParser());
app.use(csrfCookieMiddleware); // Issues CSRF token if missing

// CORS and security headers
app.use(cors({...}));
app.use(helmet({...}));

// CSRF protection for state-changing requests
app.use(csrfProtectionMiddleware);

// Rate limiting
app.use(createRateLimiter());

// Routes
app.use('/api/auth', authRouter);      // signup, login, logout, etc.
app.use('/api/refresh', refreshRouter);  // Token refresh
app.use('/api/products', authMiddleware, productRouter); // Protected
```

#### Cookie Configuration

All cookies configured with:
- **httpOnly**: `true` - Inaccessible to JavaScript (prevents XSS attacks)
- **secure**: `true` in production, `false` in development
- **sameSite**: 
  - `Lax` for secure=false (development)
  - `None` for secure=true (production, allows cross-site cookies with explicit HTTPS)
- **path**: `/`
- **domain**: Configurable via `COOKIE_DOMAIN` env var

**Token Expiry**:
- Access token: 15 minutes
- Refresh token: 7 days
- CSRF token: 24 hours

### Frontend (React + Axios)

#### Axios Interceptor Flow

```
Request Interceptor:
  1. Add Idempotency-Key header (for write operations)
  2. Add X-CSRF-Token header (from csrfToken cookie, if write operation)
  3. Send request with credentials=true

Response Interceptor (Success):
  1. Update CSRF token from response if provided (from /refresh)
  2. Update cache version from headers
  3. Return response

Response Interceptor (Error):
  1. If 401 (token expired):
     - Call /refresh to get new tokens
     - Replay original request
     - Prevent infinite loops (single retry per request)
     - If refresh fails, redirect to /login
  
  2. If 403 (CSRF token invalid):
     - Call /refresh to get new CSRF token
     - Replay original request
     - Prevent infinite loops (single retry per request)
     - If refresh fails, redirect to /login
  
  3. Never retry on:
     - Auth routes (/api/auth/*)
     - Auth bootstrap (/api/auth/me)
     - /refresh endpoint itself
```

#### Retry Logic Details

**Single-Retry Pattern**:
- Each request can retry a maximum of once per error type
- Uses `_retry` flag for 401 errors
- Uses `_csrfRetry` flag for 403 CSRF errors
- Prevents infinite loops caused by misconfiguration

**Request Queue**:
- While refreshing, subsequent requests are queued
- After refresh completes, all queued requests retry with new tokens
- Ensures consistent token state across concurrent requests

#### Session Bootstrap

On app start, `AuthProvider` executes:

```javascript
1. Try to refresh session (may fail silently if no existing session)
2. Call GET /api/auth/me to fetch user profile
3. If successful: Set authenticated state with user data
4. If failed (401/403): Clear auth state, user is not authenticated
5. Set loading=false and sessionChecked=true
```

**Key Design Decision**: `/api/auth/me` response interceptor does NOT trigger retry. This allows silent failure during bootstrap if user is not logged in.

#### State Management

**Auth Context** provides:
- `user`: Current user profile (null if not authenticated)
- `isAuthenticated`: Boolean flag
- `loading`: True while checking session on app start
- `sessionChecked`: True after initial session check completes
- `logout()`: Function to call logout endpoint and clear state
- `setUser()`: Manual user update (used by login/signup forms)
- `setIsAuthenticated()`: Manual auth state update

#### Protected Routes

Example implementation:

```jsx
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```

Uses `loading`, `sessionChecked`, and `isAuthenticated` to:
- Show loading spinner during bootstrap
- Redirect to /login if session check completes and user not authenticated
- Show protected content if authenticated

## Security Features

### 1. **HTTPOnly Cookies**
- Access tokens inaccessible to JavaScript
- Eliminates XSS vulnerability for token theft
- Automatic browser management of cookie lifecycle

### 2. **CSRF Protection**
- Dual-token pattern (cookie + header)
- Cookie accessible to JavaScript for reading, but:
  - Must be sent back in `X-CSRF-Token` header
  - Server validates cookie value matches header value
- Frontend automatically refreshes CSRF token on validation failure

### 3. **Short-Lived Access Tokens**
- 15-minute expiry minimizes impact of token compromise
- Automatic refresh via `/refresh` endpoint
- Transparent to user experience

### 4. **Long-Lived Refresh Tokens**
- 7-day expiry for persistent sessions
- Can revoke by:
  - User logout
  - Server-side session invalidation
  - Token expiry
- Isolated in httpOnly cookie, protected from XSS

### 5. **Secure Token Rotation**
- Both tokens rotate on every refresh
- Prevents token fixation attacks
- Old tokens immediately invalidated

### 6. **Retry-Safe Architecture**
- Single retry per error prevents infinite loops
- Request queue ensures atomic token refresh
- Failed refresh triggers logout + redirect

### 7. **Backend Downtime Resilience**
- `refreshDisabled` flag prevents retry storms during outages
- Re-enabled only after successful login/signup/refresh
- User manually can retry or refresh page
- No continuous background retry loops

## Error Handling

### HTTP Status Codes

| Status | Meaning | Frontend Action |
|--------|---------|-----------------|
| 200 | Success | Return response |
| 400 | Invalid input | Show error to user |
| 401 | Token expired/missing | Call /refresh, retry once |
| 403 CSRF | CSRF token invalid | Call /refresh, retry once |
| 403 other | Forbidden | Show error to user |
| 5xx | Server error | Show error to user |

### Frontend Error Scenarios

**Scenario 1: Access Token Expires**
1. Request fails with 401
2. Frontend calls `POST /api/refresh`
3. Backend returns new access token (+ new refresh token)
4. Frontend replays original request
5. If refresh fails: Redirect to /login

**Scenario 2: CSRF Token Invalid**
1. Request fails with 403 (CSRF validation failed)
2. Frontend calls `POST /api/refresh`
3. Backend returns new CSRF token
4. Frontend replays original request
5. If refresh fails: Redirect to /login

**Scenario 3: Refresh Token Expires**
1. User makes request
2. Access token has expired, request fails with 401
3. Frontend calls `POST /api/refresh`
4. Backend returns 403 (refresh token invalid/expired)
5. Frontend treats as session loss, redirects to /login

**Scenario 4: Multiple Concurrent Requests**
1. Access token expires
2. Multiple requests fail with 401 simultaneously
3. First request triggers refresh, others queue
4. After refresh, all queued requests retry with new token

## Configuration

### Environment Variables

**Backend**:
```env
# Token secrets (use strong random values)
ACCESS_TOKEN_SECRET=your-secret-key-here
REFRESH_TOKEN_SECRET=your-other-secret-key

# Cookie configuration
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_SAME_SITE=None
COOKIE_DOMAIN=.yourdomain.com

# CORS configuration
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

**Frontend**:
```env
# API configuration
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_GATEWAY_URL=https://gateway.yourdomain.com
```

### Development vs Production

**Development**:
- COOKIE_SECURE=false (localhost doesn't support secure cookies)
- COOKIE_SAME_SITE=Lax
- Access tokens: 15 minutes
- Refresh tokens: 7 days

**Production**:
- COOKIE_SECURE=true (HTTPS required)
- COOKIE_SAME_SITE=None (for cross-origin, if needed)
- Consider shorter token lifetimes for higher security
- Monitor token refresh rates

## Testing

### Manual Testing Checklist

**Session Bootstrap**:
- [ ] First page load shows loading state
- [ ] Authenticating user appears after bootstrap
- [ ] Non-authenticating user redirects to /login

**Login/Signup**:
- [ ] Successful login sets user context
- [ ] Successful signup sets user context
- [ ] CSRF token issued after login

**Token Refresh**:
- [ ] Wait 15 minutes, make API request
- [ ] Should see silent `/refresh` call, request succeeds
- [ ] Token refresh also works when navigating between pages

**Logout**:
- [ ] Logout clears user context
- [ ] Cookies cleared
- [ ] Redirects to /login

**CSRF Protection**:
- [ ] Modify csrfToken cookie manually
- [ ] Make POST request
- [ ] Should fail with 403
- [ ] Frontend should retry, succeed with new token

**Concurrent Requests**:
- [ ] Make multiple API requests simultaneously
- [ ] If access token expires during requests
- [ ] All requests should complete successfully
- [ ] Not see multiple `/refresh` calls

### Automated Testing

```typescript
// Example: Test 401 retry
test('automatically retries on 401', async () => {
  // Mock 401 response on first request
  // Mock 200 response on second request
  const result = await apiClient.get('/api/protected');
  // Should call /refresh once
  // Should return successful response
  expect(result.status).toBe(200);
});

// Example: Test CSRF retry
test('automatically retries on 403 CSRF', async () => {
  // Mock 403 CSRF response on first request
  // Mock 200 response on second request
  const result = await apiClient.post('/api/protected', {});
  // Should call /refresh once
  // Should return successful response
  expect(result.status).toBe(200);
});

// Example: Test single retry per request
test('only retries once per request', async () => {
  // Mock 401 on all requests
  const result = await apiClient.get('/api/protected');
  // Should be rejected after first retry
  expect(result).toReject();
});
```

## Migration Guide

### From Old Auth System

If migrating from localStorage-based tokens:

1. **Backend**:
   - Ensure refresh endpoint exists and returns both tokens
   - Add CSRF middleware
   - Configure httpOnly cookies

2. **Frontend**:
   - Remove localStorage token reading
   - Remove manual token sending in headers
   - Update axios interceptor with new logic
   - Update auth context for bootstrap flow

3. **Testing**:
   - Verify cookies are httpOnly
   - Verify CSRF tokens are rotating
   - Test retry logic with artificial delays

## Troubleshooting

### Problem: "CSRF token validation failed"

**Causes**:
- CSRF cookie and header out of sync
- Browser privacy mode limiting cookies
- Different domain/subdomain issues

**Solutions**:
1. Check `COOKIE_DOMAIN` configuration
2. Ensure SameSite is configured correctly
3. Check browser console for cookie values
4. Verify frontend is sending X-CSRF-Token header

### Problem: "No refresh token provided" (401 on /refresh)

**Causes**:
- User never logged in (first visit)
- Refresh token expired (7 days)
- Browser cookies disabled
- Private browsing mode

**Solutions**:
1. This is expected on first visit
2. User should log in
3. Check browser cookie settings
4. Confirm HTTPS for production (affects secure cookies)

### Problem: Token refresh loops

**Causes**:
- Misconfigured token secrets
- Clock skew between servers
- Concurrent refresh calls

**Solutions**:
1. Check token expiry times
2. Sync server clocks
3. Verify request queue is working
4. Check `_retry` flags are being set correctly

### Problem: CSRF token not updating

**Causes**:
- Response csrfToken field not being read
- Document.cookie not being set properly
- Server not returning CSRF token in response

**Solutions**:
1. Verify /refresh endpoint returns csrfToken in JSON
2. Check browser console for document.cookie calls
3. Verify server-side setCsrfCookie function

## Security Checklist

- [x] Access tokens are httpOnly cookies
- [x] Refresh tokens are httpOnly cookies
- [x] CSRF token is not httpOnly (readable by JS for header)
- [x] CSRF validation implemented for POST/PUT/PATCH/DELETE
- [x] CSRF validation exempts initial auth endpoints
- [x] /refresh endpoint is CSRF exempt
- [x] Token refresh rotates both tokens
- [x] Logout clears all cookies
- [x] Retry logic prevents infinite loops
- [x] Backend downtime doesn't cause retry storms
- [x] Frontend redirects to /login on session loss
- [x] No tokens stored in localStorage
- [x] Cookies use secure, httpOnly, sameSite flags
- [x] Response interceptor handles both 401 and 403
- [x] Request queue prevents race conditions
- [x] Single retry per request prevents misconfiguration loops

## Performance Considerations

1. **Token Refresh Overhead**:
   - Most users won't notice, happens transparently
   - Network roundtrip ~100-200ms
   - Retry adds ~200-400ms to first request after token expiry

2. **Request Queuing**:
   - Minimal memory overhead
   - Only active when multiple requests pending during refresh
   - Typical queue depth: 0-3 requests

3. **CSRF Validation**:
   - Minimal CPU overhead
   - Simple string comparison
   - Every POST/PUT/PATCH/DELETE validates

4. **Recommendations**:
   - Monitor `/refresh` endpoint response times
   - Consider longer token lifetimes (30-60 min) for less traffic
   - Use CDN for fast token refresh responses
   - Monitor queue depths in production

## Future Enhancements

1. **Sliding Window Tokens**:
   - Auto-extend refresh token on successful requests
   - Keep users in "fresh" state automatically

2. **Token Versioning**:
   - Detect compromised tokens
   - Invalidate all tokens for user if needed

3. **Device Tracking**:
   - Bind tokens to device fingerprint
   - Prevent token replay on different devices

4. **Audit Logging**:
   - Log all token refresh attempts
   - Alert on suspicious patterns
   - Track failed refresh attempts

5. **Biometric Integration**:
   - Require biometric on refresh after timeout
   - Enhanced security for sensitive operations

