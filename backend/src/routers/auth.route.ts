import express from  "express";
import { Router } from "express";
import { getMe, googleLogin, login, signUp , forgotPassword , resendResetLink , resetPassword } from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/signup",signUp);
router.post('/login',login);
router.post("/google-login",googleLogin);

router.get("/me",authMiddleware,getMe);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend",resendResetLink);

export default router;