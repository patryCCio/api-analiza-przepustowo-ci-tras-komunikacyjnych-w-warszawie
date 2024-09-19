import express from "express";
import { getTrafficFlow } from "../controllers/flow.js";

const router = express.Router();

router.get("/get-flow", getTrafficFlow);

export default router;