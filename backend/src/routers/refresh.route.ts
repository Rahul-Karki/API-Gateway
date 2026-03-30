import express from  "express";
import { Router } from "express";
import { refreshAccessToken } from "../controllers/refreshController";


const router = express.Router();

// ✅ Refresh endpoint should also check for valid refresh token
router.post("/refresh", refreshAccessToken);  // This generates new accessToken from refreshToken, so it's okay to be public

export default router;
