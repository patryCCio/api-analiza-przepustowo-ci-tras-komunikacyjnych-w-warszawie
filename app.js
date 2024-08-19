/* eslint-disable no-undef */
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

// trasy
import timetableRoutes from "./routes/timetables.js";
import districtRoutes from "./routes/districts.js";
import vehicleRoutes from "./routes/vehicles.js";
import stopRoutes from "./routes/stops.js";
import traceRoutes from "./routes/traces.js";

dotenv.config();

export const initServer = (port) => {
  const PORT = port;

  const app = express();
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  app.use(cors());

  // trasy
  app.use("/api/vehicles", vehicleRoutes);
  app.use("/api/stops", stopRoutes);
  app.use("/api/traces", traceRoutes);
  app.use("/api/timetables", timetableRoutes);
  app.use("/api/districts", districtRoutes);
  app.listen(port, () => {
    console.log("The server is listening at " + port);
  }) || 4040;
};

export const getPort = async () => {
  return process.env.PORT;
};
