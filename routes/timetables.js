import express from "express";
import {
  getTimetableInfoAll,
  getTimetableInfoById,
} from "../controllers/timetables.js";

const router = express.Router();

router.get("/timetable-info-all/:table", getTimetableInfoAll);
router.get("/timetable-info-by-id/:table/:id", getTimetableInfoById);

export default router;
