import express from  "express";
import { Router } from "express";
import { refreshAccessToken } from "../controller/refreshController";
import { dynamicNoStorePolicy } from "../../middleware/cache-policy";


const router = express.Router();

// ✅ Refresh endpoint should also check for valid refresh token
router.post("/refresh", dynamicNoStorePolicy, refreshAccessToken);  // This generates new accessToken from refreshToken, so it's okay to be public

export default router;
