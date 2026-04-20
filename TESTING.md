# Testing Guide

This project now includes automated and manual testing coverage for core backend and frontend behavior, including success and failure scenarios.

## 1. Testing Strategy

Coverage is split into:
- Unit tests: isolated logic and utility behavior.
- Integration tests: middleware + route behavior with realistic request flow.
- Component/hook tests: route guards and client request hooks.
- Manual end-to-end checks: full browser/API verification of auth, CSRF, refresh, and gateway behavior.

## 2. Test Matrix

### Backend

Unit tests:
- `backend/src/tests/unit/csrf.middleware.test.ts`
- `backend/src/tests/unit/cookieOptions.test.ts`
- `backend/src/tests/unit/generateToken.test.ts`
- `backend/src/tests/unit/refreshController.test.ts`
- `backend/src/tests/gateway-only.test.ts`

Integration tests:
- `backend/src/tests/integration/csrf.integration.test.ts`

Scenarios covered:
- Works:
  - CSRF token accepted when cookie/header match.
  - Exempt auth routes bypass CSRF checks.
  - Access/refresh JWT generation succeeds with valid secrets.
  - Refresh endpoint rotates tokens for valid refresh token.
  - Gateway-only middleware allows valid internal gateway secret.
- Fails:
  - CSRF blocked when header is missing or mismatched.
  - Refresh returns `401` when refresh cookie is missing.
  - Refresh returns `403` for invalid/expired refresh token.
  - Token generation throws when env secrets are missing.
  - Gateway-only middleware blocks direct requests without secret.

### Frontend

Utility tests:
- `frontend/src/utils/validation.test.ts`
- `frontend/src/utils/strength.test.ts`
- `frontend/src/utils/metricsParser.test.ts`

Component/hook tests:
- `frontend/src/components/ProtectedRoute.test.tsx`
- `frontend/src/hooks/useLoadTester.test.tsx`

Scenarios covered:
- Works:
  - Validation schemas accept valid login/signup payloads.
  - Password strength scoring behaves correctly.
  - Metrics parser computes totals/avg latency correctly.
  - ProtectedRoute renders children when authenticated.
  - Load tester records success logs.
- Fails:
  - Validation schemas reject invalid inputs.
  - ProtectedRoute redirects to login when unauthenticated.
  - Load tester records failed request status correctly.

## 3. How To Run Tests

From project root:

### Backend

```bash
cd backend
npm install
npm run test
npm run test:watch
npm run test:coverage
```

### Frontend

```bash
cd frontend
npm install
npm run test
npm run test:watch
npm run test:coverage
```

## 4. Coverage Outputs

Coverage reports are generated to:
- `backend/coverage/`
- `frontend/coverage/`

Open `index.html` inside each coverage directory to inspect line/branch/function coverage.

## 5. Manual End-to-End Test Guide

Use this checklist after deployment or major refactors.

### A. Auth and Session

1. Signup with a new email:
- Expected success: user session starts, cookies set.
- Expected failure: duplicate email should return validation error.

2. Login with valid credentials:
- Expected success: redirected to authenticated area.
- Expected failure: wrong password returns `401` and stays on login form.

3. Logout:
- Expected success: user state cleared and public page shown.
- Expected failure path: protected route access should redirect to login.

### B. Refresh and CSRF

1. Refresh with missing token:
- Call `POST /api/refresh` without refresh cookie.
- Expected: `401`.

2. Refresh with invalid token:
- Send malformed/expired refresh token cookie.
- Expected: `403`.

3. CSRF mismatch test:
- Send write request with wrong `X-CSRF-Token` header.
- Expected: `403` then client attempts one refresh retry.

4. CSRF success test:
- Send write request with matching CSRF cookie/header.
- Expected: request succeeds.

### C. Api Tester and Gateway

1. Open api tester route while authenticated:
- Expected: tester loads and can issue requests.

2. Open api tester route while unauthenticated:
- Expected: redirect to login.

3. Rate limit behavior:
- Send burst load in tester.
- Expected: some requests return `429` under configured limits.

4. Cache behavior:
- Repeat `GET` requests in tester.
- Expected: observe cache hit/miss transitions.

## 6. CI Recommendation

Add CI jobs for both packages:
- Backend: `npm ci && npm run test && npm run test:coverage`
- Frontend: `npm ci && npm run test && npm run test:coverage`

Optional hardening:
- Enforce minimum coverage thresholds.
- Run lint + build + tests on every pull request.

## 7. Notes

- Existing scripts under `backend/src/tests/*.ts` used for ad-hoc diagnostics can coexist with Vitest tests.
- For deterministic auth tests, set explicit test secrets in environment before test runs.
