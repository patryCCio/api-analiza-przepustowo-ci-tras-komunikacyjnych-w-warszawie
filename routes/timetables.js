import express from "express";
import {
  getAllData,
  getAllDataForOneTrace,
  getTimetables,
  getTimetablesByRouteAndStopId,
} from "../controllers/timetables.js";

const router = express.Router();

router.post("/get-all", getTimetables);
router.get("/get-current/:route_id/:stop_id", getTimetablesByRouteAndStopId);
router.get("/get-data/:vehicle_id", getAllData);
router.get("/get-data-one/:trace_id", getAllDataForOneTrace);

export default router;
