import express from "express";
import {
  getDistancesBetweenStops,
  getDistancesInDistricts,
  getLineCapacity,
  getShortest,
  getTrafficAnalizeData,
  getTrafficFlow,
  getTrafficFlowForTraces,
} from "../controllers/operations.js";

const router = express.Router();

router.post("/get-flow-for-traces", getTrafficFlowForTraces);
router.post("/get-distances-between-stops", getDistancesBetweenStops);
router.post("/get-distances-in-districts", getDistancesInDistricts);
router.post("/get-traffic-flow", getTrafficFlow);
router.post("/get-line-capacity", getLineCapacity);
router.post("/get-traffic-analize-data", getTrafficAnalizeData);
router.post("/get-shortest", getShortest);

export default router;
