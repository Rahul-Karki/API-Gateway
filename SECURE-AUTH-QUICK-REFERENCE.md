# Secure Auth System - Quick Reference

## What Changed

### Backend
- ✅ `/refresh` endpoint now returns CSRF token in response body
- ✅ `/refresh` added to CSRF exempt list
- ✅ `POST /auth/logout` added to CSRF exempt list
- ✅ All 401/403 error handling already in place

### Frontend
- ✅ Enhanced axios interceptor with CSRF retry logic
- ✅ Improved auth context bootstrap flow
- ✅ CSRF token automatically updated from refresh response
- ✅ Request queuing for concurrent requests during token refresh

## File Locations

| File | Purpose |
|------|---------|
| `backend/src/middleware/csrf.ts` | CSRF protection middleware |
| `backend/src/auth/controller/refreshController.ts` | Token refresh endpoint |
| `backend/src/auth/utils/cookieOptions.ts` | Cookie configuration |
| `frontend/src/services/apiClient.ts` | Axios client with interceptors |
| `frontend/src/context/AuthContext.tsx` | Auth state and bootstrap |

## Key Concepts

### Cookies (Automatic - Server Managed)
```
✅ accessToken     -> httpOnly=true, expires in 15 min
✅ refreshToken    -> httpOnly=true, expires in 7 days  
✅ csrfToken       -> httpOnly=false, expires in 24 hours
```

### Request Headers (Automatic - Interceptor Adds)
```
✅ X-CSRF-Token    -> Added for POST/PUT/PATCH/DELETE
✅ Idempotency-Key -> Added for all write operations
✅ Authorization   -> NOT used (cookies instead)
```

### Response Codes
```
200 Success
400 Bad Request (validation error)
401 Unauthorized (token expired or invalid)
403 Forbidden (CSRF validation failed)
5xx Server Error
```

## API Flow Diagrams

### Login Flow
```
User submits login form
        ↓
POST /api/auth/login (email, password)
        ↓
Backend validates, generates tokens
        ↓
Backend sets cookies:
  - Set-Cookie: accessToken=...
  - Set-Cookie: refreshToken=...
  - Set-Cookie: csrfToken=...
        ↓
Response: { user: {...} }
        ↓
Frontend sets user in context
Frontend redirects to /dashboard
```

### Making Protected Request (Fresh Token)
```
User clicks "Create Product"
        ↓
Frontend calls apiClient.post('/api/products', {...})
        ↓
Request Interceptor:
  - Adds X-CSRF-Token header (from csrfToken cookie)
  - Adds cookies automatically (browser sends them)
        ↓
POST /api/products
  Headers: { X-CSRF-Token: "..." }
  Cookies: { accessToken: "...", csrfToken: "..." }
  Body: { ...productData }
        ↓
Backend:
  - Verifies X-CSRF-Token matches csrfToken cookie
  - Verifies accessToken
        ↓
200 OK: { product: {...} }
        ↓
Response Interceptor extracts CSRF token (if any)
Frontend returns response to handler
```

### Token Refresh (Automatic)
```
User makes request after 15 minutes
        ↓
POST /api/products (same as before)
        ↓
Backend: Access token expired ← but request still has it
        ↓
401 Unauthorized
        ↓
Response Interceptor catches 401:
  if !_retry:
    mark request._retry = true
    POST /api/refresh (no data needed)
        ↓
Backend verifies refreshToken cookie
        ↓
Backend generates new tokens + CSRF token
        ↓
Sets cookies:
  - Set-Cookie: accessToken=new...
  - Set-Cookie: refreshToken=new...
  - Set-Cookie: csrfToken=new...
        ↓
Response: { csrfToken: "new..." }
        ↓
Response Interceptor:
  - Updates csrfToken from response
  - Replays original request
        ↓
POST /api/products (RETRY)
  Now with new accessToken & csrfToken
        ↓
200 OK
        ↓
Frontend returns response to handler
```

### CSRF Failure Retry
```
User makes request
X-CSRF-Token header stale
        ↓
POST /api/products
  X-CSRF-Token: "old-token"
  csrfToken cookie: "old-token"
  (still matches, but server invalidated it)
        ↓
Backend: CSRF validation failed
        ↓
403 Forbidden + message: "CSRF token validation failed"
        ↓
Response Interceptor catches 403:
  if isCsrfError && !_csrfRetry:
    POST /api/refresh
        ↓
Backend issues new CSRF token
        ↓
Response Interceptor:
  - Updates csrfToken
  - Replays original request
        ↓
POST /api/products (RETRY)
  X-CSRF-Token: "new-token"
  csrfToken cookie: "new-token"
        ↓
200 OK
```

## Common Tasks

### Add New Protected Endpoint

```typescript
// backend/src/products/router/product.route.ts
router.post('/api/products', authMiddleware, async (req, res) => {
  // ✅ CSRF automatically checked (it's a POST)
  // ✅ Access token automatically verified by authMiddleware
  // ✅ No need to do anything else!
  
  const userId = req.user._id;
  // ... create product ...
  res.json(product);
});
```

### Make API Call in Component

```typescript
// frontend/src/components/MyComponent.tsx
const response = await apiClient.post('/api/products', {
  name: 'Product',
  description: 'Description',
});

// ✅ Automatically sends cookies
// ✅ Automatically adds CSRF header
// ✅ Automatically retries on 401/403
// ✅ Automatically updates CSRF token
// ✅ No manual token handling needed!
```

### Logout User

```typescript
const { logout } = useAuth();

// Call logout (clears cookies + auth state)
await logout();

// User is now logged out
// Frontend will redirect to /login
```

### Check if User Authenticated

```typescript
const { isAuthenticated, user, loading, sessionChecked } = useAuth();

// During app load
if (!sessionChecked || loading) return <LoadingSpinner />;

// After session check
if (!isAuthenticated) return <Navigate to="/login" />;

// User is authenticated
return <Dashboard user={user} />;
```

## Debugging

### In Browser Console

```javascript
// Check cookies
console.log(document.cookie);
// Should see: accessToken=..., refreshToken=..., csrfToken=...

// Check CSRF token value
console.log(
  document.cookie
    .split('; ')
    .find(c => c.startsWith('csrfToken='))
    ?.split('=')[1]
);

// Check if tokens in localStorage (shouldn't be)
console.log(localStorage.getItem('token')); // Should be null
```

### Network Tab

**What to look for**:

1. **Login request**:
   - Request: POST /api/auth/login
   - Response Headers should include Set-Cookie with tokens

2. **Protected request** (first time):
   - Request: POST /api/products
   - Should see X-CSRF-Token header
   - Cookies sent automatically (request should show them)
   - Response: 200 OK

3. **Protected request** (after 15 min):
   - Request 1: POST /api/products → 401 Unauthorized
   - Request 2: POST /api/refresh → 200 OK
   - Request 3: POST /api/products (retry) → 200 OK

4. **Logout request**:
   - POST /api/auth/logout
   - Response Headers should clear cookies (Set-Cookie with expiry=0)

### Common Issues

**"X-CSRF-Token header missing"**
- ✅ Should not happen, interceptor adds it
- Check: Is it a POST/PUT/PATCH/DELETE?
- Check: Is csrfToken cookie set?

**"CSRF token validation failed" (recurring)**
- ✅ First time is expected, interceptor retries
- Check: Are you seeing it twice? Then retry logic broke
- Check: Browser console for JavaScript errors

**"401 Unauthorized" (recurring)**
- ✅ First time is expected, interceptor retries
- Check: Is refresh endpoint working?
- Check: Is refresh token expired? (7 days)

**Access token in localStorage**
- ✅ Should NOT be there
- Check: Remove it manually
- Check: No custom code storing tokens

## Performance

### Token Refresh Frequency
- **Expected**: ~1 per 15 minutes per active user
- **Bad**: Multiple per minute (indicates misconfiguration)
- **Monitor**: Dashboard/logs for `/api/refresh` frequency

### Request Retry Overhead
- **First request after token expiry**: +200-400ms (one refresh call)
- **Concurrent requests during refresh**: Queued, no additional overhead
- **Normal requests**: No overhead

## Security Checklist

Before production, verify:

- [ ] `COOKIE_SECURE=true` (production)
- [ ] `COOKIE_SAME_SITE=None` (or Lax for same-site)
- [ ] Tokens are httpOnly
- [ ] No tokens in localStorage
- [ ] `/refresh` is CSRF exempt
- [ ] Auth endpoints are CSRF exempt
- [ ] All POST/PUT/PATCH/DELETE check CSRF
- [ ] Logout clears all cookies
- [ ] Retry logic prevents infinite loops
- [ ] 401 and 403 both handled
- [ ] Request queue working for concurrency
- [ ] Bootstrap flow works on app load

## Migration Checklist

If migrating from old auth:

- [ ] Remove localStorage token reading
- [ ] Update env vars for new API
- [ ] Verify httpOnly cookies working
- [ ] Test retry logic with artificial delays
- [ ] Check CSRF tokens rotating
- [ ] Verify no localStorage auth data
- [ ] Test concurrent requests
- [ ] Test token expiry at 15 min mark
- [ ] Load test /refresh endpoint
- [ ] Verify browser compatibility (cookies)

