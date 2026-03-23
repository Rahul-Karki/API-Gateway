import express from  "express";
import { Router } from "express";
import { refreshAccessToken } from "../controllers/refreshController";

const router = express.Router();

router.post("/refresh", refreshAccessToken);

export default router;
