import express from "express";
import { getVehicles } from "../controllers/vehicles.js";

const router = express.Router();

router.get("/all", getVehicles);

export default router;
