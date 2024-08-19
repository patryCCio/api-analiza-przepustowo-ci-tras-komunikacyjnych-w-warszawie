import express from "express";
import { getDistrictsInfo } from "../controllers/districts.js";

const router = express.Router();

router.get("/districts-info", getDistrictsInfo);

export default router;
