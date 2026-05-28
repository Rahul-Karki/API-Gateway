import express from  "express";
import { Router } from "express";
import { refreshAccessToken } from "../controller/refreshController";
import { dynamicNoStorePolicy } from "../../middleware/cache-policy";
import { authRateLimiter } from "../../middleware/distributed-rate-limit";
import { validateRequest } from "../../middleware/validate-request";
import { refreshBodySchema } from "../schemas/auth.schemas";


const router = express.Router();

// Add rate limiting to refresh endpoint to prevent brute-force
const refreshLimiter = authRateLimiter({
  points: Number(process.env.RATE_LIMIT_REFRESH_POINTS || 20),
  duration: Number(process.env.RATE_LIMIT_REFRESH_DURATION || 60),
  prefix: "rl:refresh",
});

router.post("/refresh", dynamicNoStorePolicy, refreshLimiter, validateRequest({ body: refreshBodySchema }), refreshAccessToken);

export default router;
