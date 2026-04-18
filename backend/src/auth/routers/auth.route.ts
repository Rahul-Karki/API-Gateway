import express from  "express";
import { Router } from "express";
import { getMe, googleLogin, login, signUp , forgotPassword , resendResetLink , resetPassword } from "../controller/authController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { authRateLimiter } from "../../middleware/distributed-rate-limit";
import { dynamicNoStorePolicy } from "../../middleware/cache-policy";
import { attachCacheVersionHeader, bumpCacheVersionOnWrite } from "../../middleware/cache-version";

const router = express.Router();

router.use(attachCacheVersionHeader('global'));
router.use(bumpCacheVersionOnWrite('global'));

// Strict distributed rate limiting on authentication endpoints
// Protects against brute force attacks using Redis Upstash
const authLimiter = authRateLimiter();

router.post("/signup", dynamicNoStorePolicy, authLimiter, signUp);
router.post('/login', dynamicNoStorePolicy, authLimiter, login);
router.post("/google-login", dynamicNoStorePolicy, authLimiter, googleLogin);

router.post("/forgot-password", dynamicNoStorePolicy, authLimiter, forgotPassword);
router.post("/reset-password", dynamicNoStorePolicy, authLimiter, resetPassword);
router.post("/resend", dynamicNoStorePolicy, authLimiter, resendResetLink);

// Protected routes - only logged-in users
router.get("/me", dynamicNoStorePolicy, authMiddleware, getMe);

export default router;