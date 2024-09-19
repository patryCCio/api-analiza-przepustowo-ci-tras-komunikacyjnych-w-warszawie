import express from "express";
import { getStops, getVehicles } from "../controllers/stops.js";

const router = express.Router();

router.post("/all", getStops);
router.get("/vehicles/:id", getVehicles);

export default router;
