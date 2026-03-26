import express from  "express";
import { Router } from "express";
import { getMe, googleLogin, login, signUp } from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/signup",signUp);
router.post('/login',login);
router.post("/google-login",googleLogin);

router.get("/me",authMiddleware,getMe);

export default router;