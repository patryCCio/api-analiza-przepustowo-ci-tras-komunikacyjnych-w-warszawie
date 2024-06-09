import express from "express";
import {
  getRoutesByStop,
  getRoutesByVehicle,
  getStops,
  getTimetableInfoAll,
  getTimetableInfoById,
  getVehicles,
} from "../controllers/timetables.js";

const router = express.Router();

router.get("/timetable-info-all/:table", getTimetableInfoAll);
router.get("/timetable-info-by-id/:table/:id", getTimetableInfoById);
router.get("/vehicles", getVehicles);
router.get("/stops", getStops);
router.get("/routes-by-vehicle/:id", getRoutesByVehicle);
router.get("/routes-by-stop/:id", getRoutesByStop);

export default router;
