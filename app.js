import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

// trasy
import timetableRoutes from "./routes/timetables.js";

dotenv.config();

export const initServer = (port) => {
  const PORT = port;

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  app.use(cors());

  // trasy
  app.use("/api/timetables", timetableRoutes);
  app.listen(3000, () => {
    console.log("The server is listening at " + PORT);
  }) || 3000;
};

export const getPort = async () => {
  return process.env.PORT;
};
