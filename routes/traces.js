import express from "express";
import { getRouteByTraceId, getTraces } from "../controllers/traces.js";

const router = express.Router();

router.get("/get-traces/:id", getTraces);
router.get("/get-route/:id", getRouteByTraceId);

export default router;
