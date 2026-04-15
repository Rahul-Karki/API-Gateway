import express from  "express";
import { Router } from "express";
import { getMe, googleLogin, login, signUp , forgotPassword , resendResetLink , resetPassword } from "../controller/authController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { authRateLimiter } from "../../middleware/distributed-rate-limit";

const router = express.Router();

// Strict distributed rate limiting on authentication endpoints
// Protects against brute force attacks using Redis Upstash
const authLimiter = authRateLimiter();

router.post("/signup", authLimiter, signUp);
router.post('/login', authLimiter, login);
router.post("/google-login", authLimiter, googleLogin);

router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/resend", authLimiter, resendResetLink);

// Protected routes - only logged-in users
router.get("/me", authMiddleware, getMe);

export default router;