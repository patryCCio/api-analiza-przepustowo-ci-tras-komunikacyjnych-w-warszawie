import express from "express";
import {
  getDistrictInfoById,
  getDistrictsInfo
} from "../controllers/districts.js";

const router = express.Router();

router.get("/districts-info", getDistrictsInfo);
router.get("/districts-info-by-id/:id", getDistrictInfoById);

export default router;
