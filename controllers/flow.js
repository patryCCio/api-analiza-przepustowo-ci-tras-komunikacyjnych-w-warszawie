import { db } from "../config/db-config.js";
import fs from "fs";
import { exec } from "child_process";

export const getTrafficFlow = async (req, res) => {
  const { order_time } = req.params;

  const query = "SELECT FROM flows WHERE order_time = ?";

  try {
    const [result] = await db.query(query, [order_time]);

    res.status(200).json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

const getJSON = async () => {
  try {
    fs.readFile("responseData.json", "utf8", (err, data) => {
      if (err) {
        console.error("Error reading JSON file", err);
        return null;
      } else {
        // Parsowanie danych JSON na obiekt
        const jsonData = JSON.parse(data);
        refactorAllTrafficFlowData(jsonData);
      }
    });
  } catch (err) {
    console.log(err);
    return null;
  }
};

const joinDistrict = async (traffic_flow) => {
  try {
    const query = `SELECT * FROM districts LEFT JOIN districts_geo ON districts.id = districts_geo.district_id`;

    const [result] = await db.query(query);

    const array = [];
    for (let x = 0; x < result.length; x++) {
      let isDistrict = false;
      array.forEach((arr) => {
        if (arr.name == result[x].name) {
          isDistrict = true;
        }
      });

      if (!isDistrict) {
        const pLat = result[x].pin_latitude.replace(",", ".");
        const pLon = result[x].pin_longitude.replace(",", ".");
        array.push({
          id: result[x].district_id,
          name: result[x].name,
          pin_latitude: parseFloat(pLat),
          pin_longitude: parseFloat(pLon),
          population_density: result[x].population_density,
          update_date: result[x].update_date,
          warsaw_population: result[x].warsaw_population,
        });
      }
    }

    const arrayToReturn = [];

    for (let x = 0; x < array.length; x++) {
      const array2 = [];
      result.forEach((el, index) => {
        if (el.district_id == array[x].id) {
          const latitude = el.latitude.replace(",", ".");
          const longitude = el.longitude.replace(",", ".");

          array2.push({
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          });
        }
      });

      arrayToReturn.push({
        id: array[x].id,
        name: array[x].name,
        pin_latitude: parseFloat(array[x].pin_latitude),
        pin_longitude: parseFloat(array[x].pin_longitude),
        population_density: array[x].population_density,
        update_date: array[x].update_date,
        warsaw_population: array[x].warsaw_population,
        border_coords: array2,
      });
    }

    // lstm();
    // insert(traffic_flow);
    // updateTraffic(traffic_flow, arrayToReturn);
  } catch (err) {
    console.log(err);
    return;
  }
};

const getRandomValue = (min, max) => {
  return Math.random() * (max - min) + min;
};

const generateRandomObject = (order_time) => {
  const speed = getRandomValue(5, 20);
  const speedUncapped = getRandomValue(5, 20);
  const freeFlow = getRandomValue(10, 30);
  const jamFactor = getRandomValue(0, 10);
  const confidence = getRandomValue(0.8, 1);

  return [
    {
      tr_id: 0,
      lnk_id: 0,
      pnt_id: 0,
      speed,
      speedUncapped,
      freeFlow,
      jamFactor,
      confidence,
      traversability: "open",
      longitude: 21.00546,
      latitude: 52.22844,
      order_time: order_time,
    },
    {
      tr_id: 0,
      lnk_id: 0,
      pnt_id: 1,
      speed,
      speedUncapped,
      freeFlow,
      jamFactor,
      confidence,
      traversability: "open",
      longitude: 21.00559,
      latitude: 52.22847,
      order_time: order_time,
    },
  ];
};

const lstm = async () => {
  try {
    const query =
      "SELECT * FROM traffic_flow WHERE order_time >= -4 AND order_time <= 0";
    const [res] = await db.query(query);

    const dataFilePath = "traffic_data.json";
    fs.writeFileSync(dataFilePath, JSON.stringify(res));
    

    const outputFilePath = "predictions.json";
    exec(
      `python lstm.py ${dataFilePath} ${outputFilePath}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing Python script: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }

        const predictions = JSON.parse(fs.readFileSync(outputFilePath, "utf8"));
        console.log("Prognozy na przyszłe wartości:", predictions);

        savePredictionsToDb(predictions);
      }
    );
  } catch (err) {
    console.log(err);
    return;
  }
};

const savePredictionsToDb = async (predictions) => {
  for (const pred of predictions) {
    const query = `
      INSERT INTO traffic_flow (tr_id, lnk_id, pnt_id, speed, speedUncapped, freeFlow, jamFactor, confidence, traversability, longitude, latitude, order_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.query(query, [
      pred.tr_id,
      pred.lnk_id,
      pred.pnt_id,
      pred.speed,
      pred.speed, 
      pred.freeFlow,
      pred.jamFactor,
      pred.confidence,
      pred.traversability,
      pred.longitude,
      pred.latitude,
      pred.order_time,
    ]);
  }
};

const insert = async (traffic_flow) => {
  const object1 = [traffic_flow[0], traffic_flow[1]];

  const object2 = generateRandomObject(-1);
  const object3 = generateRandomObject(-2);
  const object4 = generateRandomObject(-3);
  const object5 = generateRandomObject(-4);

  const data = [...object1, ...object2, ...object3, ...object4, ...object5];

  try {
    const values = data.map((item) => [
      item.tr_id,
      item.lnk_id,
      item.pnt_id,
      item.speed,
      item.speedUncapped,
      item.freeFlow,
      item.jamFactor,
      item.confidence,
      item.traversability,
      item.longitude,
      item.latitude,
      item.order_time,
    ]);

    const query =
      "INSERT INTO traffic_flow (tr_id, lnk_id, pnt_id, speed, speedUncapped, freeFlow, jamFactor, confidence, traversability, longitude, latitude, order_time) VALUES ?";

    const [res] = await db.query(query, [values]);
    console.log("inserted rows", res.affectedRows);
  } catch (err) {
    console.log(err);
    return;
  }
};

const updateTraffic = async (traffic_flow, districts) => {
  try {
    console.log(traffic_flow[1]);
    console.log(districts[0]);
    return;

    const query1 =
      "UPDATE traffic_flow SET order_time = order_time - 1 WHERE order_time < 1";
    const [res] = await db.query(query1);

    const query2 =
      "DELETE FROM traffic_flow WHERE order_time > 0 AND order_time = -5";
    const [res2] = await db.query(query2);

    const query3 = "SELECT * FROM traffic_flow WHERE order_time < 0";
    const [res3] = await db.query(query3);

    if (res3.length > 0) {
      const paired = [...data, ...res3];

      // uczenie sztucnej inteligencji
      // rezultat
    }
  } catch (err) {
    console.log(err);
    return;
  }
};

const refactorAllTrafficFlowData = (data) => {
  const trafficFlow = [];
  data.results.forEach((result, index) => {
    result.location.shape.links.forEach((lnk, index2) => {
      lnk.points.forEach((pnt, index3) => {
        trafficFlow.push({
          tr_id: index,
          lnk_id: index2,
          pnt_id: index3,
          ...result.currentFlow,
          longitude: pnt.lng,
          latitude: pnt.lat,
          order_time: 0,
        });
      });
    });
  });

  if (trafficFlow.length > 0) {
    joinDistrict(trafficFlow);
  }
};

const intervalFunction = async () => {
  getJSON();
};

export const startInterval = () => {
  const currentMinutes = new Date().getMinutes();
  if (currentMinutes % 2 == 0) {
    setInterval(intervalFunction, 1000 * 60);
    intervalFunction();
    return true;
  }
  return false;
};
