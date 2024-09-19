import { db } from "../config/db-config.js";
import fs from "fs/promises";
import { spawn } from "child_process";
import {
  equalizeFlowsLength,
  groupByName,
  groupBySpeed,
  joinDistrict,
  removeDuplicates,
} from "../functions.js";
import api from "../api.js";

export const getTrafficFlow = async (req, res) => {

  const query = "SELECT * FROM traffic_flow WHERE order_time >= 0";

  try {
    const [result] = await db.query(query);

    const t0 = result.filter((el) => el.order_time == 0);
    const t1 = result.filter((el) => el.order_time == 1);
    const t2 = result.filter((el) => el.order_time == 2);

    res.status(200).json({ t0, t1, t2 });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

const reset = async () => {
  try {
    const query = "DELETE FROM traffic_flow";

    const [res] = await db.query(query);

    const dataP1 = await fs.readFile("response_p1.json", "utf8");
    const jsonDataP1 = JSON.parse(dataP1);

    const dataP2 = await fs.readFile("response_p2.json", "utf8");
    const jsonDataP2 = JSON.parse(dataP2);

    const dataP3 = await fs.readFile("response_p3.json", "utf8");
    const jsonDataP3 = JSON.parse(dataP3);

    refactorAllTrafficFlowData(jsonDataP1, jsonDataP2, jsonDataP3);
  } catch (err) {
    console.error("Error reading JSON files", err);
    return null;
  }
};

const insert = async (traffic_flow) => {
  let count = 0;
  let countName = 0;

  let lastWrongIndex = 0;
  let lastWrongIndexName = 0;

  traffic_flow.forEach((el, index) => {
    if (!el.speed && el.speed != 0) {
      count++;
      lastWrongIndex = index;
    }

    if (!el.name) {
      countName++;
      lastWrongIndexName = index;
    }
  });

  if (count > 0) {
    console.log("WRONG: ", traffic_flow[lastWrongIndex]);
    console.log("WRONG_COUNT: ", count);
  } else {
    try {
      const values = traffic_flow.map((item) => [
        item.name,
        item.speed,
        item.speedUncapped,
        item.freeFlow,
        item.jamFactor,
        item.confidence,
        item.traversability,
        item.longitude,
        item.latitude,
        item.order_time,
        0,
      ]);

      const query =
        "INSERT INTO traffic_flow (name, speed, speedUncapped, freeFlow, jamFactor, confidence, traversability, longitude, latitude, order_time, is_anomaly) VALUES ?";

      const [res] = await db.query(query, [values]);
      console.log("inserted rows", res.affectedRows);
    } catch (err) {
      console.log(err);
      return;
    }
  }
};

const compareAndEqualizeArraysInPlace = (
  trafficFlowP0,
  trafficFlowP1,
  trafficFlowP2
) => {
  const withoutDuplicatesP0 = removeDuplicates(trafficFlowP0);
  const withoutDuplicatesP1 = removeDuplicates(trafficFlowP1);
  const withoutDuplicatesP2 = removeDuplicates(trafficFlowP2);

  const allData = [
    ...withoutDuplicatesP0,
    ...withoutDuplicatesP1,
    ...withoutDuplicatesP2,
  ];

  insert(allData);
};

const refactorAllTrafficFlowData = (dataP1, dataP2, dataP3) => {
  const trafficFlowP1 = [];
  const trafficFlowP2 = [];
  const trafficFlowP3 = [];

  dataP1.results.forEach((result) => {
    result.location.shape.links.forEach((lnk) => {
      lnk.points.forEach((pnt) => {
        if (result.location.description) {
          if (!result.currentFlow.speed) {
            trafficFlowP1.push({
              name: result.location.description,
              speed: 0,
              speedUncapped: 0,
              freeFlow: result.currentFlow.freeFlow,
              jamFactor: result.currentFlow.jamFactor,
              confidence: 1.0,
              traversability: result.currentFlow.traversability,
              longitude: pnt.lng,
              latitude: pnt.lat,
              order_time: 0,
            });
          } else {
            trafficFlowP1.push({
              name: result.location.description,
              speed: result.currentFlow.speed,
              speedUncapped: result.currentFlow.speedUncapped,
              freeFlow: result.currentFlow.freeFlow,
              jamFactor: result.currentFlow.jamFactor,
              confidence: result.currentFlow.confidence,
              traversability: result.currentFlow.traversability,
              longitude: pnt.lng,
              latitude: pnt.lat,
              order_time: 0,
            });
          }
        }
      });
    });
  });
  dataP2.results.forEach((result) => {
    result.location.shape.links.forEach((lnk) => {
      lnk.points.forEach((pnt) => {
        if (result.location.description) {
          if (!result.currentFlow.speed) {
            trafficFlowP2.push({
              name: result.location.description,
              speed: 0,
              speedUncapped: 0,
              freeFlow: result.currentFlow.freeFlow,
              jamFactor: result.currentFlow.jamFactor,
              confidence: 1.0,
              traversability: result.currentFlow.traversability,
              longitude: pnt.lng,
              latitude: pnt.lat,
              order_time: -1,
            });
          } else {
            trafficFlowP2.push({
              name: result.location.description,
              speed: result.currentFlow.speed,
              speedUncapped: result.currentFlow.speedUncapped,
              freeFlow: result.currentFlow.freeFlow,
              jamFactor: result.currentFlow.jamFactor,
              confidence: result.currentFlow.confidence,
              traversability: result.currentFlow.traversability,
              longitude: pnt.lng,
              latitude: pnt.lat,
              order_time: -1,
            });
          }
        }
      });
    });
  });
  dataP3.results.forEach((result) => {
    result.location.shape.links.forEach((lnk) => {
      lnk.points.forEach((pnt) => {
        if (result.location.description) {
          if (!result.currentFlow.speed) {
            trafficFlowP3.push({
              name: result.location.description,
              speed: 0,
              speedUncapped: 0,
              freeFlow: result.currentFlow.freeFlow,
              jamFactor: result.currentFlow.jamFactor,
              confidence: 1.0,
              traversability: result.currentFlow.traversability,
              longitude: pnt.lng,
              latitude: pnt.lat,
              order_time: -2,
            });
          } else {
            trafficFlowP3.push({
              name: result.location.description,
              speed: result.currentFlow.speed,
              speedUncapped: result.currentFlow.speedUncapped,
              freeFlow: result.currentFlow.freeFlow,
              jamFactor: result.currentFlow.jamFactor,
              confidence: result.currentFlow.confidence,
              traversability: result.currentFlow.traversability,
              longitude: pnt.lng,
              latitude: pnt.lat,
              order_time: -2,
            });
          }
        }
      });
    });
  });

  compareAndEqualizeArraysInPlace(trafficFlowP1, trafficFlowP2, trafficFlowP3);
};

const runPythonScript = (t0, t1, t2, outputFilePath) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python", [
      "lstm.py",
      t0,
      t1,
      t2,
      outputFilePath,
    ]);

    pythonProcess.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Python process exited with code ${code}`));
      }
    });
  });
};

const prepareData = async () => {
  try {
    const radius = 12000;
    const string = 52.2297 + "," + 21.0122 + ";r=" + radius;
    const url = `https://data.traffic.hereapi.com/v7/flow?in=circle:${string}&locationReferencing=shape&apiKey=${process.env.API_KEY_HERE}`;

    // const dataP0 = await fs.readFile("response_p0.json", "utf8");
    // const p0D = JSON.parse(dataP0);

    const here = await api.get(url);
    const p0D = here.data;


    if (p0D.results.length > 0) {
      const withDuplicates = [];

      p0D.results.forEach((result) => {
        result.location.shape.links.forEach((lnk) => {
          lnk.points.forEach((pnt) => {
            if (result.location.description) {
              if (!result.currentFlow.speed) {
                withDuplicates.push({
                  name: result.location.description,
                  speed: 0,
                  speedUncapped: 0,
                  freeFlow: result.currentFlow.freeFlow,
                  jamFactor: result.currentFlow.jamFactor,
                  confidence: 1.0,
                  traversability: result.currentFlow.traversability,
                  longitude: pnt.lng,
                  latitude: pnt.lat,
                  order_time: 0,
                });
              } else {
                withDuplicates.push({
                  name: result.location.description,
                  speed: result.currentFlow.speed,
                  speedUncapped: result.currentFlow.speedUncapped,
                  freeFlow: result.currentFlow.freeFlow,
                  jamFactor: result.currentFlow.jamFactor,
                  confidence: result.currentFlow.confidence,
                  traversability: result.currentFlow.traversability,
                  longitude: pnt.lng,
                  latitude: pnt.lat,
                  order_time: 0,
                });
              }
            }
          });
        });
      });

      const p0 = removeDuplicates(withDuplicates);

      const query1 =
        "UPDATE traffic_flow SET order_time = order_time - 1 WHERE order_time <= 0";
      const [res] = await db.query(query1);

      const query2 = "DELETE FROM traffic_flow WHERE order_time <= -3";
      const [res2] = await db.query(query2);

      const query4 = "SELECT * FROM traffic_flow WHERE order_time < 0";
      const [res4] = await db.query(query4);

      const p1 = res4.filter((el) => el.order_time == -1);
      const p2 = res4.filter((el) => el.order_time == -2);

      const p0Group = groupBySpeed(p0);
      const p1Group = groupBySpeed(p1);
      const p2Group = groupBySpeed(p2);

      const p0GroupRD = groupByName(p0Group);
      const p1GroupRD = groupByName(p1Group);
      const p2GroupRD = groupByName(p2Group);

      const p0Names = new Set(p0GroupRD.map((el) => el.name));
      const p1Names = new Set(p1GroupRD.map((el) => el.name));
      const p2Names = new Set(p2GroupRD.map((el) => el.name));

      const all0 = [];
      const all1 = [];
      const all2 = [];

      p0GroupRD.forEach((el) => {
        if (p1Names.has(el.name) && p2Names.has(el.name)) {
          all0.push(el);
        }
      });

      p1GroupRD.forEach((el) => {
        if (p0Names.has(el.name) && p2Names.has(el.name)) {
          all1.push(el);
        }
      });

      p2GroupRD.forEach((el) => {
        if (p0Names.has(el.name) && p1Names.has(el.name)) {
          all2.push(el);
        }
      });

      const p0Sorted = all0.sort((a, b) => {
        return String(a.name).localeCompare(String(b.name));
      });
      const p1Sorted = all1.sort((a, b) => {
        return String(a.name).localeCompare(String(b.name));
      });
      const p2Sorted = all2.sort((a, b) => {
        return String(a.name).localeCompare(String(b.name));
      });

      equalizeFlowsLength(p0Sorted, p1Sorted, p2Sorted);

      const all0Rd = [];
      const all1Rd = [];
      const all2Rd = [];

      p0Sorted.forEach((el) => {
        el.flows.forEach((el2) => {
          all0Rd.push({
            name: el.name,
            order_time: el.order_time,
            ...el2,
          });
        });
      });

      p1Sorted.forEach((el) => {
        el.flows.forEach((el2) => {
          all1Rd.push({
            name: el.name,
            order_time: el.order_time,
            ...el2,
          });
        });
      });

      p2Sorted.forEach((el) => {
        el.flows.forEach((el2) => {
          all2Rd.push({
            name: el.name,
            order_time: el.order_time,
            ...el2,
          });
        });
      });

      console.log("-----------------");
      console.log(all0Rd.length);
      console.log(all1Rd.length);
      console.log(all2Rd.length);

      const t0 = "t0.json";
      const t1 = "t1.json";
      const t2 = "t2.json";

      fs.writeFile(t0, JSON.stringify(all0Rd));
      fs.writeFile(t1, JSON.stringify(all1Rd));
      fs.writeFile(t2, JSON.stringify(all2Rd));

      console.log("Uruchamiam skrypt Pythona...");

      const outputFilePath = "predictions.json";

      await runPythonScript(t0, t1, t2, outputFilePath);

      console.log("Skrypt Pythona zakończony");

      const pred = await fs.readFile(outputFilePath, "utf-8");

      const predictions = JSON.parse(pred);
      const predictionsReady = [];

      predictions.forEach((el) => {
        el.points.forEach((el2) => {
          predictionsReady.push({
            name: el.name,
            speed: el.speed,
            speedUncapped: el.speedUncapped,
            freeFlow: el.freeFlow,
            jamFactor: el.jamFactor,
            confidence: el.confidence,
            traversability: el.traversability,
            order_time: el.order_time,
            is_anomaly: el.is_anomaly,
            latitude: el2.latitude,
            longitude: el2.longitude,
          });
        });
      });


      const toAdd = [...p0, ...predictionsReady];

      const values = toAdd.map((item) => [
        item.name,
        item.speed,
        item.speedUncapped,
        item.freeFlow,
        item.jamFactor,
        item.confidence,
        item.traversability,
        item.longitude,
        item.latitude,
        item.order_time,
        0,
      ]);

      const query3 = "DELETE FROM traffic_flow WHERE order_time > 0";
      const [res3] = await db.query(query3);

      const query =
        "INSERT INTO traffic_flow (name, speed, speedUncapped, freeFlow, jamFactor, confidence, traversability, longitude, latitude, order_time, is_anomaly) VALUES ?";

      const [res5] = await db.query(query, [values]);
    }
  } catch (err) {
    console.log(err);
    return;
  }
};

const intervalFunction = async () => {
  // reset();
  prepareData();
};


export const startInterval = () => {
  const currentMinutes = new Date().getMinutes();
  if (currentMinutes % 1 == 0) {
    setInterval(intervalFunction, 1000 * 60 * 15);
    intervalFunction();
    return true;
  }
  return false;
};