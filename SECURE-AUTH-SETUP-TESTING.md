# Secure Auth System - Setup & Testing Guide

## Environment Configuration

### Backend (.env)

```env
# ========== NODE CONFIG ==========
NODE_ENV=production
PORT=5000

# ========== DATABASE ==========
MONGODB_URI=mongodb://...
DATABASE_NAME=app_db

# ========== TOKEN SECRETS ==========
# Generate with: openssl rand -hex 32
ACCESS_TOKEN_SECRET=your-access-token-secret-here
REFRESH_TOKEN_SECRET=your-refresh-token-secret-here

# ========== COOKIE CONFIG ==========
# Development
COOKIE_SECURE=false
COOKIE_SAME_SITE=Lax
COOKIE_DOMAIN=

# Production (HTTPS)
# COOKIE_SECURE=true
# COOKIE_SAME_SITE=None
# COOKIE_DOMAIN=.yourdomain.com

# ========== CORS CONFIG ==========
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# ========== EMAIL (if needed) ==========
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Frontend (.env)

```env
# ========== API CONFIG ==========
VITE_API_BASE_URL=http://localhost:5000
VITE_GATEWAY_URL=http://localhost:5000

# ========== Google OAuth (optional) ==========
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Generate Secure Secrets

```bash
# Linux/Mac
openssl rand -hex 32

# Windows (PowerShell)
[System.Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

## Verification Steps

### 1. Basic Setup Verification

```bash
# Backend
cd backend
npm install
npm run build
npm run dev

# Should see: "Server running on port 5000"
# Should see: "Connected to MongoDB"

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Should see: "VITE v5... ready in 123 ms"
# Should see: "localhost:5173"
```

### 2. Cookie Verification

Open browser and navigate to http://localhost:5173:

```javascript
// In browser console:
console.log(document.cookie);

// After login, should see:
// accessToken=...; refreshToken=...; csrfToken=...
```

### 3. CSRF Header Verification

Open Network tab, make POST request:

```javascript
// In browser console (after login):
fetch('http://localhost:5000/api/products', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': document.cookie
      .split('; ')
      .find(c => c.startsWith('csrfToken='))
      ?.split('=')[1],
  },
  body: JSON.stringify({ name: 'Test' }),
});

// In Network tab, should see:
// - Request Headers include X-CSRF-Token
// - Request Cookies include accessToken, refreshToken, csrfToken
```

### 4. Token Refresh Verification

```bash
# In backend, set short token expiry temporarily:
const ACCESS_TOKEN_MAX_AGE_MS = 10 * 1000; // 10 seconds instead of 15 min

# Restart backend

# In frontend:
1. Login successfully
2. Wait 10 seconds
3. Make API request (POST /api/products)
4. Watch Network tab
5. Should see:
   - First request fails with 401
   - /api/refresh succeeds
   - Original request retried and succeeds
```

## Testing Checklist

### Manual Testing

#### Setup
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] MongoDB connected
- [ ] No console errors
- [ ] Browser cookies enabled

#### Session Bootstrap (App Load)
- [ ] Open app in new private window (no cookies)
- [ ] App loads without errors
- [ ] User is not authenticated
- [ ] Login link appears
- [ ] No redirect loops

#### Login
- [ ] Navigate to /login
- [ ] Enter valid credentials
- [ ] Click login
- [ ] Redirect to /dashboard
- [ ] User name appears in nav
- [ ] Check cookies: should have accessToken, refreshToken, csrfToken

#### Making Protected Requests
- [ ] Click "Create Product" button
- [ ] Watch Network tab
- [ ] Single request to /api/products
- [ ] X-CSRF-Token header present
- [ ] Response 200 OK
- [ ] Product appears in list

#### Token Refresh (After 15 min in dev, 10 sec with code change)
- [ ] Make POST request
- [ ] Wait for access token to expire
- [ ] Make another POST request
- [ ] Watch Network tab
- [ ] Should see 3 requests:
  1. POST /api/products → 401
  2. POST /api/refresh → 200 (with new tokens)
  3. POST /api/products → 200 (retry)

#### CSRF Token Rotation
- [ ] After login, note csrfToken value
- [ ] Make POST request
- [ ] Check csrfToken value again
- [ ] May have changed (server sends new one)
- [ ] After token expiry refresh
- [ ] csrfToken definitely changed

#### Logout
- [ ] Click logout button
- [ ] Redirect to /login
- [ ] Check cookies: should be empty
- [ ] Try to access /dashboard
- [ ] Redirect to /login

#### Concurrent Requests
- [ ] Make 3 API requests simultaneously (click button 3 times quickly)
- [ ] If access token is expired
- [ ] Watch Network tab
- [ ] Should see only 1 /api/refresh call
- [ ] Not 3 refresh calls
- [ ] All requests should complete

#### Browser Private Mode
- [ ] Open app in private window
- [ ] Try to access protected page
- [ ] Should redirect to login
- [ ] Login should work
- [ ] Cookies should work in private mode

### Automated Testing

#### Setup Test Environment

```typescript
// jest.config.ts (frontend)
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};

// src/test/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### Mock API Server

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Login endpoint
  http.post('http://localhost:5000/api/auth/login', async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json(
        { user: { id: '1', email: 'test@example.com', name: 'Test User' } },
        {
          headers: {
            'Set-Cookie': [
              'accessToken=test-access-token',
              'refreshToken=test-refresh-token',
              'csrfToken=test-csrf-token',
            ].join('; '),
          },
        }
      );
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // Refresh endpoint
  http.post('http://localhost:5000/api/refresh', () => {
    return HttpResponse.json(
      { csrfToken: 'new-csrf-token' },
      {
        headers: {
          'Set-Cookie': [
            'accessToken=new-access-token',
            'refreshToken=new-refresh-token',
            'csrfToken=new-csrf-token',
          ].join('; '),
        },
      }
    );
  }),

  // Get user endpoint
  http.get('http://localhost:5000/api/auth/me', () => {
    return HttpResponse.json({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
    });
  }),
];
```

#### Test Cases

```typescript
// src/test/auth.test.ts
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/context/AuthContext';
import { LoginForm } from '@/components/login-form';

describe('Authentication', () => {
  test('bootstrap session on app load', async () => {
    render(
      <AuthProvider>
        <div>
          <div data-testid="loading">Loading...</div>
        </div>
      </AuthProvider>
    );

    // Should show loading during bootstrap
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // After bootstrap, loading should be gone
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });
  });

  test('login sets auth state', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    // Fill form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');

    // Submit
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Should redirect (in real app, would use router)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
    });
  });

  test('retries on 401', async () => {
    // Mock first request to fail with 401, second to succeed
    const { server } = await import('./mocks/server');
    const { http, HttpResponse } = await import('msw');

    let attempts = 0;
    server.use(
      http.get('http://localhost:5000/api/protected', () => {
        attempts++;
        if (attempts === 1) {
          return HttpResponse.json(
            { message: 'Unauthorized' },
            { status: 401 }
          );
        }
        return HttpResponse.json({ data: 'success' });
      })
    );

    const response = await apiClient.get('/api/protected');

    // Should have retried
    expect(attempts).toBe(2);
    expect(response.data).toEqual({ data: 'success' });
  });

  test('prevents infinite retry loops', async () => {
    // Mock all requests to fail with 401
    const { server } = await import('./mocks/server');
    const { http, HttpResponse } = await import('msw');

    let attempts = 0;
    server.use(
      http.get('http://localhost:5000/api/protected', () => {
        attempts++;
        return HttpResponse.json(
          { message: 'Unauthorized' },
          { status: 401 }
        );
      })
    );

    try {
      await apiClient.get('/api/protected');
    } catch (error) {
      // Should fail after one retry (two total attempts)
      expect(attempts).toBe(2);
    }
  });

  test('retry queues concurrent requests', async () => {
    // Simulate concurrent requests during token expiry
    const results = await Promise.allSettled([
      apiClient.get('/api/protected'),
      apiClient.get('/api/protected'),
      apiClient.get('/api/protected'),
    ]);

    // All should resolve (after retry)
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);

    // Only one /refresh call should have been made
    // (check via MSW request tracking)
  });

  test('logout clears auth state', async () => {
    // Start authenticated
    // Call logout
    // Check auth state cleared
  });

  test('CSRF protection works', async () => {
    // Send request without X-CSRF-Token header
    // Should fail with 403
    // Frontend should retry with new CSRF token
    // Should succeed
  });
});
```

## Performance Testing

### Load Testing with Apache Bench

```bash
# Install Apache Bench
# macOS: brew install httpd
# Linux: sudo apt-get install apache2-utils
# Windows: Use WSL or download separately

# 1. Get auth tokens via login
curl -c cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  http://localhost:5000/api/auth/login

# 2. Extract tokens from cookies.txt
# 3. Run load test (100 concurrent requests, 1000 total)
ab -n 1000 -c 100 \
  -C "$(cat cookies.txt | grep -oE 'accessToken.*' | head -1)" \
  -H "X-CSRF-Token: <csrf-token-here>" \
  http://localhost:5000/api/protected

# Expected results:
# - Most requests: 50-200ms
# - p95: <500ms
# - p99: <1000ms
# - No 401 errors (tokens should not expire during test)
```

### Memory Leak Testing

```bash
# Monitor request queue memory usage
# Open DevTools Memory tab
# Trigger many concurrent requests
# Check for memory leaks
# Queue should clear after requests complete

# Good sign: Memory usage returns to baseline
# Bad sign: Memory usage keeps growing
```

### Network Throttling Test

```javascript
// In Chrome DevTools:
// 1. Open DevTools
// 2. Go to Network tab
// 3. Click throttling dropdown
// 4. Select "Slow 3G"
// 5. Make requests
// 6. Verify timeout handling works

// Expected behavior:
// - Requests timeout after 10 seconds
// - Proper error handling
// - No infinite loops
```

## Monitoring

### Key Metrics to Track

```
1. /api/refresh endpoint:
   - Response time (should be <200ms)
   - Error rate (should be <1%)
   - Call frequency (1 per 15 min per user)

2. 401 errors on protected endpoints:
   - Should see spike 15 min after login
   - Then should drop to near 0 (because of retry)

3. 403 CSRF errors:
   - Should be rare (<1%)
   - Followed by successful retry

4. /api/auth/login endpoint:
   - Response time (should be <500ms)
   - Success rate
   - Failed attempts (brute force attempts)
```

### Logging Configuration

```typescript
// backend/logger.ts
const auditLog = (event: string, details: any) => {
  logger.info({
    type: 'auth_event',
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Log token refresh attempts
export const logTokenRefresh = (userId: string, success: boolean) => {
  auditLog('token_refresh', {
    userId,
    success,
    timestamp: Date.now(),
  });
};

// Log login attempts
export const logLoginAttempt = (email: string, success: boolean) => {
  auditLog('login_attempt', {
    email,
    success,
    timestamp: Date.now(),
  });
};
```

## Troubleshooting

### Problem: "Infinite redirect loops"

**Diagnosis**:
```bash
# Check if /refresh redirects to /login
curl -v -X POST http://localhost:5000/api/refresh

# Should return 401, not redirect
```

**Solution**:
- Check CSRF exempt routes
- Check `/refresh` not in retry list
- Review response interceptor logic

### Problem: "CSRF tokens not matching"

**Diagnosis**:
```javascript
// Check if tokens match
const cookie = document.cookie.split('; ').find(c => c.startsWith('csrfToken='));
const header = 'X-CSRF-Token: ...'; // from request
console.log(cookie, header);
```

**Solution**:
- Check CSRF middleware logic
- Verify token is being set correctly
- Check for encoding issues

### Problem: "Tokens in localStorage"

**Diagnosis**:
```javascript
console.log(localStorage.getItem('token'));
console.log(localStorage.getItem('accessToken'));
```

**Solution**:
- Remove any custom code storing tokens
- Use cookies only
- Clear localStorage if present

