# Secure Auth System - Implementation Examples

## Backend Examples

### Setting Up the Auth Middleware

```typescript
// server.ts
import express from 'express';
import cookieParser from 'cookie-parser';
import { csrfCookieMiddleware, csrfProtectionMiddleware } from './middleware/csrf';
import { authMiddleware } from './auth/middlewares/authMiddleware';

const app = express();

// 1. Parse cookies
app.use(cookieParser());

// 2. Issue CSRF token if missing
app.use(csrfCookieMiddleware);

// 3. Protect state-changing requests with CSRF
app.use(csrfProtectionMiddleware);

// 4. Your routes (protected by CSRF middleware)
app.use('/api/auth', authRouter);
app.use('/api/refresh', refreshRouter);
app.use('/api/products', authMiddleware, productRouter);
```

### Protected Route Example

```typescript
// products/router/product.route.ts
import { Router } from 'express';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

// This route requires:
// 1. Valid accessToken cookie
// 2. Valid X-CSRF-Token header (matched against csrfToken cookie)
router.post('/api/products', authMiddleware, async (req, res) => {
  const userId = req.user._id;
  
  // Create product for authenticated user
  const product = await Product.create({
    ...req.body,
    userId,
  });

  res.json(product);
});
```

### Checking Response Codes

```typescript
// controllers/example.ts

// For operations that expect auth failures
export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// For operations that should not be retried
export const login = async (req: Request, res: Response) => {
  try {
    // ... validation and auth logic ...
    
    if (!validCredentials) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // Issue tokens
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
```

## Frontend Examples

### Using Protected Routes

```tsx
// pages/Dashboard.tsx
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';

export function DashboardPage() {
  const { user, isAuthenticated, loading, sessionChecked } = useAuth();

  if (!sessionChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="p-8">
      <h1>Welcome, {user?.name}!</h1>
      {/* Your dashboard content */}
    </div>
  );
}
```

### Making Authenticated API Calls

```tsx
// components/ProductForm.tsx
import { useState } from 'react';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

export function ProductForm() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/products', {
        name: 'New Product',
        description: 'Product description',
      });

      console.log('Product created:', response.data);
      // The X-CSRF-Token header is automatically added by interceptor
      // The accessToken cookie is automatically sent
      // If either expires, the interceptor handles retry transparently

    } catch (err) {
      // Error handling:
      // - 401: Interceptor tried refresh and failed, user redirected
      // - 403 CSRF: Interceptor tried refresh for new CSRF token and failed, user redirected
      // - 400: Validation error from server
      // - 5xx: Server error
      
      if (err instanceof AxiosError) {
        if (err.response?.status === 401) {
          setError('Your session expired. Please log in again.');
          logout();
        } else if (err.response?.status === 403) {
          setError('Request validation failed. Please try again.');
        } else {
          setError(err.response?.data?.message || 'An error occurred');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateProduct}>
      {/* form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Product'}
      </button>
      {error && <div className="text-red-600">{error}</div>}
    </form>
  );
}
```

### Implementing Login

```tsx
// components/login-form.tsx
import { useState } from 'react';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export function LoginForm() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post<LoginResponse>(
        '/api/auth/login',
        {
          email: formData.email,
          password: formData.password,
        }
      );

      // Set user in context
      setUser(response.data.user);
      setIsAuthenticated(true);

      // Cookies set automatically by backend:
      // - accessToken cookie (httpOnly)
      // - refreshToken cookie (httpOnly)
      // - csrfToken cookie (readable by JS)

      // Navigate to dashboard
      navigate('/dashboard');

    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Invalid email or password');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Login failed. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="mb-4">
        <label className="block mb-2">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div className="mb-6">
        <label className="block mb-2">Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Implementing Logout

```tsx
// components/NavBar.tsx
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      // logout() calls /api/auth/logout and clears auth state
      // Cookies are cleared by backend
      // Frontend redirects to login
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state and redirect
      navigate('/login');
    }
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="flex justify-between items-center">
        <h1>My App</h1>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-4">
            <span>Welcome, {user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        ) : (
          <a href="/login" className="hover:text-gray-300">
            Login
          </a>
        )}
      </div>
    </nav>
  );
}
```

## Advanced Scenarios

### Handling Concurrent Requests with Automatic Retry

```tsx
// This happens automatically through the request queue
const [data1, data2, data3] = await Promise.all([
  apiClient.get('/api/resource1'),
  apiClient.get('/api/resource2'),
  apiClient.get('/api/resource3'),
]);

// If access token expires during these calls:
// 1. First request fails with 401
// 2. Other two requests are queued
// 3. /refresh called once
// 4. All three requests retried with new token
// 5. All three promises resolve successfully
```

### Custom Interceptor for Additional Headers

```typescript
// If you need to add custom headers to all requests:
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Add custom header
  const headers = AxiosHeaders.from(config.headers);
  headers.set('X-Custom-Header', 'value');

  // Access token already in cookie
  // CSRF token already in header (for writes)
  // Idempotency-Key already added

  return config;
});
```

### Testing Token Refresh

```typescript
// Simulate token expiration in dev tools console:
// 1. Open Network tab
// 2. Make API request
// 3. Should see one request, one response

// 2. To test refresh:
// Open browser console and wait 15 minutes
// Or artificially expire the token in dev tools
// Make API request
// Should see two requests:
//   - Original request (fails with 401)
//   - /api/refresh request (succeeds)
//   - Then original request retried (succeeds)
```

### Monitoring Token Refresh in Production

```typescript
// Add custom logic to track refresh calls
apiClient.interceptors.response.use(
  (response) => {
    // Track successful responses
    if (response.config.url === '/api/refresh') {
      console.log('Token refreshed successfully');
      // Could send analytics event here
    }
    return response;
  },
  (error) => {
    if (error.config?.url === '/api/refresh') {
      console.error('Token refresh failed:', error.status);
      // Could send error alert here
    }
    return Promise.reject(error);
  }
);
```

### Handling Session Loss Gracefully

```tsx
// When the interceptor detects session loss:
// It sets window.location.href = '/login'

// But you can also detect it in your component:
export function SessionLossHandler() {
  const navigate = useNavigate();
  const { isAuthenticated, sessionChecked, loading } = useAuth();

  useEffect(() => {
    // After session check completes
    if (sessionChecked && !loading && !isAuthenticated) {
      // User lost their session (was logged in, now isn't)
      // This could be due to:
      // - Refresh token expiration
      // - Logout from another tab
      // - Server-side session invalidation

      navigate('/login', { 
        replace: true,
        state: { message: 'Your session has expired. Please log in again.' }
      });
    }
  }, [sessionChecked, loading, isAuthenticated, navigate]);

  return null;
}
```

## Performance Testing

### Load Testing Script

```bash
#!/bin/bash
# test-token-refresh.sh

# Test 1000 concurrent requests
ab -n 1000 -c 100 \
  -C "accessToken=<token>; refreshToken=<token>; csrfToken=<token>" \
  -H "X-CSRF-Token: <token>" \
  https://api.example.com/api/products

# Monitor /refresh endpoint hit rate:
# - Should be ~1 /refresh call per 15 minutes per user
# - Not one per request
```

