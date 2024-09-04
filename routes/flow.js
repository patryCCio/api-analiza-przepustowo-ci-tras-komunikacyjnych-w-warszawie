import express from "express";
import { getTrafficFlow } from "../controllers/flow.js";

const router = express.Router();

router.get("/get-flow/:order_time", getTrafficFlow);

export default router;