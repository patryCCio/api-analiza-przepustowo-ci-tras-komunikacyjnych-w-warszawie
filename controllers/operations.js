import {
  getCoordsWithDistances,
  getDistanceFromLatLonInMeters,
  getDistances,
  getStopsWithinRadius,
  sortLines,
} from "../functions.js";
import { db } from "../config/db-config.js";

export const getDistancesInDistricts = async (req, res) => {
  const { traceData } = req.body;

  try {
    const helper = traceData.traces.coords.coordinates;

    const withDistances = [];

    for (let x = 0; x < helper.length; x++) {
      if (x == 0) {
        withDistances.push({
          ...helper[0],
          distance: 0,
        });
      } else {
        const lat1 = helper[x].latitude;
        const lon1 = helper[x].longitude;
        const lat2 = helper[x - 1].latitude;
        const lon2 = helper[x - 1].longitude;
        const distance = getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2);
        withDistances.push({
          ...helper[x],
          distance: parseFloat(distance.toFixed(2)),
        });
      }
    }

    const uniqueDistricts = [];

    withDistances.forEach((el) => {
      let isIn = false;
      uniqueDistricts.forEach((el2) => {
        if (el.name == el2.name) {
          isIn = true;
        }
      });

      if (!isIn) {
        uniqueDistricts.push({
          name: el.name,
          population_density: el.population_density,
          area: el.area,
        });
      }
    });

    const dd = [];

    uniqueDistricts.forEach((el) => {
      const arr = [];
      withDistances.forEach((el2) => {
        if (el.name == el2.name) {
          arr.push(el2);
        }
      });

      dd.push({
        ...el,
        data: arr,
      });
    });

    const dd2 = [];

    dd.forEach((el) => {
      let totalLength = 0;
      el.data.forEach((el2) => {
        totalLength += el2.distance;
      });

      dd2.push({
        ...el,
        total_length: parseFloat(totalLength.toFixed(2)),
      });
    });

    const dd3 = [];

    dd2.forEach((el) => {
      const array = [];
      const array2 = [];
      traceData.traces.coords.distance.forEach((el2, index) => {
        if (el2.name == el.name) {
          array.push(el2);
          array2.push(traceData.traces.routes[index]);
        }
      });

      let total_time = 0;

      array2.forEach((tt) => {
        if (tt.timeFromPrev) {
          total_time += tt.timeFromPrev;
        }
      });

      dd3.push({
        ...el,
        total_time,
        stops: array,
        routes: array2,
      });
    });

    const dd4 = [];

    for (const el of dd3) {
      let arr = [];

      for (const item of el.routes) {
        const query = `
          SELECT * 
          FROM routes 
          LEFT JOIN traces ON routes.trace_id = traces.id 
          LEFT JOIN vehicles ON traces.vehicle_id = vehicles.id
          WHERE stop_id = ?`;

        const [res] = await db.query(query, [item.stop_id]);

        res.forEach((el2) => {
          if (traceData.route != el2.route) {
            arr.push(el2);
          }
        });
      }

      const seenRoutes = new Set();
      arr = arr.filter((item2) => {
        const duplicate = seenRoutes.has(item2.route);
        seenRoutes.add(item2.route);
        return !duplicate;
      });

      arr = sortLines(arr);

      dd4.push({
        ...el,
        other_connects: arr,
      });
    }

    res.status(200).json(dd4);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

export const getDistancesBetweenStops = async (req, res) => {
  const { traceData, stops } = req.body;

  try {
    const array = traceData.traces.coords.distance;
    const newArray = [];

    const timetables = traceData.traces.routes[0].timetables;

    traceData.traces.routes.forEach((el) => {
      array.forEach((el2) => {
        if (el.order == el2.order) {
          newArray.push({
            ...el2,
            route: traceData.route,
            timeFromPrev: el.timeFromPrev,
            timeFromZero: el.timeFromZero,
            stop_id: el.stop_id,
          });
        }
      });
    });

    const rdArr = [];

    newArray.forEach((el) => {
      stops.forEach((el2) => {
        if (el.stop_id == el2.id) {
          rdArr.push({
            ...el,
            latitude: el2.latitude,
            longitude: el2.longitude,
            name: el2.name,
            number_of_stop: el2.number_of_stop,
          });
        }
      });
    });

    const rdArr2 = [];

    for (const item of rdArr) {
      const query = `
        SELECT * 
        FROM routes 
        LEFT JOIN traces ON routes.trace_id = traces.id 
        LEFT JOIN vehicles ON traces.vehicle_id = vehicles.id
        WHERE stop_id = ?`;

      const [res] = await db.query(query, [item.stop_id]);

      const arr = [];

      res.forEach((el) => {
        if (el.route != item.route) {
          arr.push(el);
        }
      });

      rdArr2.push({
        ...item,
        other_connects: arr,
      });
    }

    res.status(200).json({ data: rdArr2, timetables: timetables });
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

export const getTrafficFlowForTraces = async (req, res) => {
  const { vehicles } = req.body;

  try {
    const vehiclesArray = [];

    const query = "SELECT * FROM traffic_flow WHERE order_time IN (0, 1, 2)";
    const [traffic_flow] = await db.query(query);

    const accidents = traffic_flow.filter(
      (el) => el.traversability == "closed" && el.order_time == 0
    );
    const partials = traffic_flow.filter(
      (el) => el.traversability == "partial" && el.order_time == 0
    );
    const anomalies = traffic_flow.filter(
      (el) => el.is_anomaly == 1 && el.order_time == 0
    );

    const distanceThreshold = 300;

    const removeDuplicates = (points) => {
      return points.reduce((acc, current) => {
        const isDuplicate = acc.some((point) => {
          return (
            getDistanceFromLatLonInMeters(
              point.latitude,
              point.longitude,
              current.latitude,
              current.longitude
            ) < distanceThreshold
          );
        });

        if (!isDuplicate) {
          acc.push(current);
        }

        return acc;
      }, []);
    };

    const uniqueAccidents = removeDuplicates(accidents);
    const uniqueAnomalies = removeDuplicates(anomalies);
    const uniquePartials = removeDuplicates(partials);

    for (const el of vehicles) {
      if (el.is_active && el.traces) {
        for (const el2 of el.traces) {
          if (el2.is_active && el2.coords) {
            vehiclesArray.push({
              route: el.route,
              capacity: el.capacity,
              ...el2,
              vehicle_id: el.id,
              trace_id: el2.id,
            });
          }
        }
      }
    }

    const maxDistance = 200;

    const array = vehiclesArray.map((el) => {
      const coords_0 = [];
      const coords_1 = [];
      const coords_2 = [];

      el.coords.coordinates.forEach((coord) => {
        let closestFlow_0 = null;
        let closestFlow_1 = null;
        let closestFlow_2 = null;

        let minDistance_0 = Infinity;
        let minDistance_1 = Infinity;
        let minDistance_2 = Infinity;

        traffic_flow.forEach((flow) => {
          const distance = getDistanceFromLatLonInMeters(
            coord.latitude,
            coord.longitude,
            flow.latitude,
            flow.longitude
          );

          if (flow.order_time === 0 && distance < minDistance_0) {
            minDistance_0 = distance;
            closestFlow_0 = flow;
          } else if (flow.order_time === 1 && distance < minDistance_1) {
            minDistance_1 = distance;
            closestFlow_1 = flow;
          } else if (flow.order_time === 2 && distance < minDistance_2) {
            minDistance_2 = distance;
            closestFlow_2 = flow;
          }
        });

        coords_0.push(
          minDistance_0 > maxDistance
            ? { ...closestFlow_0, ...coord, speed: null }
            : { ...closestFlow_0, ...coord }
        );

        coords_1.push(
          minDistance_1 > maxDistance
            ? { ...closestFlow_1, ...coord, speed: null }
            : { ...closestFlow_1, ...coord }
        );

        coords_2.push(
          minDistance_2 > maxDistance
            ? { ...closestFlow_2, ...coord, speed: null }
            : { ...closestFlow_2, ...coord }
        );
      });

      return {
        ...el,
        coords_0: {
          distance: el.coords.distance,
          coordinates: coords_0,
        },
        coords_1: {
          distance: el.coords.distance,
          coordinates: coords_1,
        },
        coords_2: {
          distance: el.coords.distance,
          coordinates: coords_2,
        },
      };
    });

    res.status(200).json({
      vehicles: array,
      accidents: uniqueAccidents,
      anomalies: uniqueAnomalies,
      partials: uniquePartials,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

const getSignalDensity = (road_class) => {
  // exhibit 10-6

  switch (road_class) {
    case "I":
      return 0.5;
    case "II":
      return 2;
    case "III":
      return 4;
    case "IV":
      return 6;
  }
};

const checkTags = (tags) => {
  if (tags == null) {
    return {
      maxspeed: 50,
      lanes: 1,
      name: "Nieznana",
      laneWidth: 3,
    };
  } else {
    let toReturn = {
      maxspeed: 50,
      lanes: 1,
      name: "Nieznana",
      laneWidth: 3,
    };

    if (tags.maxspeed != null) {
      toReturn.maxspeed = tags.maxspeed;
    }

    if (tags["lanes:forward"] != null) {
      toReturn.lanes = tags["lanes:forward"];
    } else {
      if (tags.lanes != null) {
        toReturn.lanes = tags.lanes;
      }
    }

    if (tags.laneWidth != null) {
      toReturn.laneWidth = tags.laneWidth;
    }

    if (tags.name != null) {
      toReturn.name = tags.name;
    }

    return toReturn;
  }
};

// exhibit 10-5
const getRoadClass = (freeFlow) => {
  const kmh = freeFlow * 3.6;

  if (kmh >= 80) return "I";
  if (kmh >= 65) return "II";
  if (kmh >= 55) return "III";

  return "IV";
};

//exhibit 15-8 -> 15-11
const getVCRatio = (road_class, travelSpeed, signalDensity) => {
  const kmh = travelSpeed * 3.6; // konwersja prędkości z m/s na km/h

  switch (road_class) {
    case "I":
      if (signalDensity === 0.5) {
        if (kmh >= 70) return 0.0;
        if (kmh >= 60 && kmh < 70) return 0.2;
        if (kmh >= 50 && kmh < 60) return 0.4;
        if (kmh >= 40 && kmh < 50) return 0.6;
        if (kmh < 40) return 0.8;
      } else if (signalDensity === 1) {
        if (kmh >= 60) return 0.0;
        if (kmh >= 50 && kmh < 60) return 0.2;
        if (kmh >= 40 && kmh < 50) return 0.4;
        if (kmh >= 30 && kmh < 40) return 0.6;
        if (kmh < 30) return 0.8;
      } else if (signalDensity === 2) {
        if (kmh >= 50) return 0.0;
        if (kmh >= 40 && kmh < 50) return 0.2;
        if (kmh >= 30 && kmh < 40) return 0.4;
        if (kmh >= 20 && kmh < 30) return 0.6;
        if (kmh < 20) return 0.8;
      }
      break;

    case "II":
      if (signalDensity === 0.5) {
        if (kmh >= 60) return 0.0;
        if (kmh >= 50 && kmh < 60) return 0.2;
        if (kmh >= 40 && kmh < 50) return 0.4;
        if (kmh >= 30 && kmh < 40) return 0.6;
        if (kmh < 30) return 0.8;
      } else if (signalDensity === 1) {
        if (kmh >= 50) return 0.0;
        if (kmh >= 40 && kmh < 50) return 0.2;
        if (kmh >= 30 && kmh < 40) return 0.4;
        if (kmh >= 20 && kmh < 30) return 0.6;
        if (kmh < 20) return 0.8;
      } else if (signalDensity === 2) {
        if (kmh >= 40) return 0.0;
        if (kmh >= 30 && kmh < 40) return 0.2;
        if (kmh >= 20 && kmh < 30) return 0.4;
        if (kmh >= 15 && kmh < 20) return 0.6;
        if (kmh < 15) return 0.8;
      }
      break;

    case "III":
      if (signalDensity === 2) {
        if (kmh >= 40) return 0.0;
        if (kmh >= 30 && kmh < 40) return 0.2;
        if (kmh >= 25 && kmh < 30) return 0.4;
        if (kmh >= 20 && kmh < 25) return 0.6;
        if (kmh < 20) return 0.8;
      } else if (signalDensity === 3) {
        if (kmh >= 35) return 0.0;
        if (kmh >= 28 && kmh < 35) return 0.2;
        if (kmh >= 20 && kmh < 28) return 0.4;
        if (kmh >= 15 && kmh < 20) return 0.6;
        if (kmh < 15) return 0.8;
      } else if (signalDensity === 4) {
        if (kmh >= 30) return 0.0;
        if (kmh >= 25 && kmh < 30) return 0.2;
        if (kmh >= 18 && kmh < 25) return 0.4;
        if (kmh >= 12 && kmh < 18) return 0.6;
        if (kmh < 12) return 0.8;
      }
      break;

    case "IV":
      if (signalDensity === 4) {
        if (kmh >= 25) return 0.0;
        if (kmh >= 20 && kmh < 25) return 0.2;
        if (kmh >= 15 && kmh < 20) return 0.4;
        if (kmh >= 10 && kmh < 15) return 0.6;
        if (kmh < 10) return 0.8;
      } else if (signalDensity === 5) {
        if (kmh >= 20) return 0.0;
        if (kmh >= 15 && kmh < 20) return 0.2;
        if (kmh >= 10 && kmh < 15) return 0.4;
        if (kmh >= 8 && kmh < 10) return 0.6;
        if (kmh < 8) return 0.8;
      } else if (signalDensity === 6) {
        if (kmh >= 18) return 0.0;
        if (kmh >= 12 && kmh < 18) return 0.2;
        if (kmh >= 8 && kmh < 12) return 0.4;
        if (kmh >= 5 && kmh < 8) return 0.6;
        if (kmh < 5) return 0.8;
      }
      break;

    default:
      return null;
  }
};

// Funkcja obliczająca kąt między dwoma wektorami i określająca kierunek zakrętu
const getAngleBetweenVectors = (p1, p2, p3) => {
  const vector1 = {
    x: p2.longitude - p1.longitude,
    y: p2.latitude - p1.latitude,
  };

  const vector2 = {
    x: p3.longitude - p2.longitude,
    y: p3.latitude - p2.latitude,
  };

  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
  const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

  const cosineAngle = dotProduct / (magnitude1 * magnitude2);
  const angle = Math.acos(cosineAngle) * (180 / Math.PI); // Kąt w stopniach

  return angle;
};

const checkTurnDirection = (p1, p2, p3) => {
  const angle = getAngleBetweenVectors(p1, p2, p3);

  if (angle >= 45) {
    const crossProduct =
      (p2.longitude - p1.longitude) * (p3.latitude - p2.latitude) -
      (p2.latitude - p1.latitude) * (p3.longitude - p2.longitude);

    if (crossProduct > 0) {
      return "left";
    } else if (crossProduct < 0) {
      return "right";
    }
  }

  return "straight";
};

// exhibit 15-2
const getLOSClass = (road_class, avgSpeed) => {
  const kmh = avgSpeed * 3.6;
  switch (road_class) {
    case "I":
      if (kmh <= 26) {
        return "F";
      } else if (kmh > 26 && kmh <= 32) {
        return "E";
      } else if (kmh > 32 && kmh <= 40) {
        return "D";
      } else if (kmh > 40 && kmh <= 56) {
        return "C";
      } else if (kmh > 56 && kmh <= 72) {
        return "B";
      } else {
        return "A";
      }

    case "II":
      if (kmh <= 21) {
        return "F";
      } else if (kmh > 21 && kmh <= 26) {
        return "E";
      } else if (kmh > 26 && kmh <= 33) {
        return "D";
      } else if (kmh > 33 && kmh <= 46) {
        return "C";
      } else if (kmh > 46 && kmh <= 59) {
        return "B";
      } else {
        return "A";
      }

    case "III":
      if (kmh <= 17) {
        return "F";
      } else if (kmh > 17 && kmh <= 22) {
        return "E";
      } else if (kmh > 22 && kmh <= 28) {
        return "D";
      } else if (kmh > 28 && kmh <= 39) {
        return "C";
      } else if (kmh > 39 && kmh <= 50) {
        return "B";
      } else {
        return "A";
      }

    case "IV":
      if (kmh <= 14) {
        return "F";
      } else if (kmh > 14 && kmh <= 18) {
        return "E";
      } else if (kmh > 18 && kmh <= 23) {
        return "D";
      } else if (kmh > 23 && kmh <= 32) {
        return "C";
      } else if (kmh > 32 && kmh <= 41) {
        return "B";
      } else {
        return "A";
      }
  }
};

const getCapacity = async (arr, traceData, choice) => {
  const newValues = [];
  for (let x = 1; x < arr.length; x++) {
    const end = arr[x].order;
    const start = arr[x - 1].order;

    let avgSpeed = 0;
    let avgSpeedUncapped = 0;
    let avgFreeFlow = 0;
    let avgConfidence = 0;
    let avgJamFactor = 0;
    let avgPopulationDensity = 0;
    let count = 0;

    let is_anomaly = 0;
    let anomaly = 0;

    let avgLanes = 0;
    let avgMaxSpeed = 0;
    let avgLaneWidth = 0;

    let i = 0;

    let coords;

    if (choice == 0) {
      coords = traceData.traces.coords_0.coordinates;
    } else if (choice == 1) {
      coords = traceData.traces.coords_1.coordinates;
    } else if (choice == 2) {
      coords = traceData.traces.coords_2.coordinates;
    }

    for (const el of coords) {
      if (el.order >= start && el.order <= end) {
        count++;

        avgSpeed += el.speed || 10;
        avgSpeedUncapped += el.speedUncapped;
        avgConfidence += el.confidence || 0.5;
        avgJamFactor += el.jamFactor || 3;
        avgFreeFlow += el.freeFlow || 10;
        avgPopulationDensity += el.population_density;
        if (el.is_anomaly) {
          anomaly++;
        }
        const tags = checkTags(el.tags);
        avgMaxSpeed += parseInt(tags.maxspeed, 10) || 13;

        if (traceData.type == "Autobus") {
          avgLanes += parseFloat(tags.lanes, 10) || 1;
        } else {
          avgLanes += 1;
        }

        avgLaneWidth += parseFloat(tags.laneWidth) || 3;
        i++;
      }
    }

    const direction = arr[x - 1].direction;

    const distance = traceData.traces.coords_0.distance[x - 1].distance;
    avgSpeed /= count;
    avgSpeedUncapped /= count;
    avgConfidence /= count;
    avgJamFactor /= count;
    avgFreeFlow /= count;
    avgPopulationDensity /= count;
    avgLanes /= count;
    avgMaxSpeed /= count;
    avgLaneWidth /= count;

    if (avgSpeed > avgMaxSpeed) {
      avgSpeed = avgMaxSpeed;
    }

    if (avgFreeFlow > avgMaxSpeed) {
      avgFreeFlow = avgMaxSpeed;
    }

    if (anomaly > count / 2) {
      is_anomaly = 1;
    }

    const road_class = getRoadClass(avgFreeFlow);
    const signalDensity = getSignalDensity(road_class);
    const los = getLOSClass(road_class, avgSpeed);
    const X = getVCRatio(road_class, avgSpeed, signalDensity);

    const g = 35; //sek
    const C = 90; //sek

    const tc = 33;

    const gC = g / C;

    const d =
      (C * Math.pow(1 - gC, 2)) / (2 * (1 - X * gC)) +
      (Math.pow(X, 2) / (2 * (1 - X))) * tc; // s

    const number_of_signals = signalDensity * (distance / 1000);

    const totalDelay = number_of_signals * d + 15; //s, +15 oznacza postój na przystanku

    const travelTimeWithoutDelays = distance / avgSpeed; //m / m/s

    const travelTimeWithDelays = travelTimeWithoutDelays + totalDelay; //s

    const finalSpeed = distance / travelTimeWithDelays; // m/s

    const S = 1900;
    const N = avgLanes;

    const c = S * gC * N;

    newValues.push({
      avgSpeed,
      avgSpeedUncapped,
      avgConfidence,
      avgJamFactor,
      avgFreeFlow,
      avgPopulationDensity,
      avgLanes,
      avgMaxSpeed,
      avgLaneWidth,
      is_anomaly,
      road_class,
      signalDensity,
      los,
      X,
      gC,
      d,
      totalDelay,
      travelTimeWithoutDelays,
      travelTimeWithDelays,
      finalSpeed,
      number_of_signals,
      S,
      N,
      c,
      direction,
      distance,
    });
  }
  return newValues;
};

export const getTrafficFlow = async (req, res) => {
  const { traceData } = req.body;

  let arr = [];
  const tt = traceData.traces.routes;

  tt.forEach((el) => {
    let index = 0;
    let order = 0;
    let minDistance = Infinity;

    traceData.traces.coords_0.coordinates.forEach((el2, indexx) => {
      let lon1 = el.longitude;
      let lat1 = el.latitude;

      let lon2 = el2.longitude;
      let lat2 = el2.latitude;

      let dLon = Math.abs(lon1 - lon2);
      let dLat = Math.abs(lat1 - lat2);

      let distance = dLon + dLat;

      if (distance < minDistance) {
        minDistance = distance;
        index = indexx;
        order = el2.order;
      }
    });

    arr.push({ order, index, direction: "straight" });
  });

  for (let i = 0; i < arr.length - 2; i++) {
    const p1 = traceData.traces.coords_0.coordinates[arr[i].index];
    const p2 = traceData.traces.coords_0.coordinates[arr[i + 1].index];
    const p3 = traceData.traces.coords_0.coordinates[arr[i + 2].index];

    const direction = checkTurnDirection(p1, p2, p3);

    arr[i + 1].direction = direction;
  }

  const results_0 = await getCapacity(arr, traceData, 0);
  const results_1 = await getCapacity(arr, traceData, 1);
  const results_2 = await getCapacity(arr, traceData, 2);
  const object = {
    ...traceData,
    traces: {
      ...traceData.traces,
      results_0,
      results_1,
      results_2,
    },
  };

  res.status(200).json(object);
};

//= ==============================================================

// Funkcje pomocnicze do przetwarzania grafu

const getDataForGraph = async (arr) => {
  const rdArr = [];
  const problems = [];

  const q = "SELECT * FROM routes WHERE stop_id = ?";
  const q2 = `
          SELECT 
            routes.id AS route_id, 
            routes.order, 
            routes.stop_id, 
            routes.trace_id, 
            traces.stop_from, 
            traces.stop_end,
            stops.longitude, 
            stops.latitude,
            stops.number_of_stop,
            stops.name AS stop_name,
            vehicles.route,
            vehicles.type,
            vehicles.capacity,
            COUNT(timetables.id) AS count_timetables,
            (COUNT(timetables.id) / 2) AS average_per_hour,
            (vehicles.capacity * (COUNT(timetables.id) / 2)) AS capacity_per_hour
          FROM routes 
          JOIN traces ON traces.id = routes.trace_id 
          JOIN stops ON stops.id = routes.stop_id
          JOIN vehicles ON vehicles.id = traces.vehicle_id
          LEFT JOIN timetables ON timetables.route_id = routes.id
            AND TIME_FORMAT(NOW(), '%H:%i') <= timetables.time
            AND TIME_FORMAT(DATE_ADD(NOW(), INTERVAL 2 HOUR), '%H:%i') > timetables.time
          WHERE routes.trace_id = ?
          GROUP BY 
            routes.id, 
            routes.order, 
            routes.stop_id, 
            routes.trace_id, 
            traces.stop_from, 
            traces.stop_end,
            stops.longitude, 
            stops.latitude,
            stops.number_of_stop,
            stops.name,
            vehicles.route,
            vehicles.type,
            vehicles.capacity
          ORDER BY routes.order ASC`;
  for (const item of arr) {
    const [res] = await db.query(q, [item.id]);
    if (res.length > 0) {
      for (const item2 of res) {
        const [res2] = await db.query(q2, [item2.trace_id]);

        let isProblem = false;

        if (res2.length > 0) {
          res2.forEach((el) => {
            if (!el.capacity_per_hour) {
              isProblem = true;
            }
          });
        }

        if (isProblem) {
          problems.push(res2);
        }

        if (res2.length > 0 && !isProblem) {
          rdArr.push(res2);
        }
      }
    }
  }

  const array = [];

  if (problems.length > 0) {
    for (const item2 of problems) {
      const [res] = await db.query(q, [item2.id]);
      if (res.length > 0) {
        for (const item3 of res) {
          const [res2] = await db.query(q2, [item3.trace_id]);

          let isProblem = false;

          if (res2.length > 0) {
            res2.forEach((el) => {
              if (!el.capacity_per_hour) {
                isProblem = true;
              }
            });
          }

          if (res2.length > 0 && !isProblem) {
            rdArr.push(res2);
          }
        }
      }
    }
  }

  rdArr.forEach((el) => {
    let isIn = false;
    array.forEach((el2) => {
      if (el[0].trace_id == el2[0].trace_id) {
        isIn = true;
      }
    });

    if (!isIn) {
      array.push(el);
    }
  });

  return array;
};

const createGraph = (allDone) => {
  startNodes = [];
  endNodes = [];
  totalNodes = [];
  shortestPath = [];
  const graph = {};

  allDone.forEach((route) => {
    route.forEach((stop, index) => {
      const currentStopId = stop.stop_id;
      const nextStop = route[index + 1];

      if (!graph[currentStopId]) {
        graph[currentStopId] = [];
      }

      if (nextStop) {
        const nextStopId = nextStop.stop_id;
        let distance = nextStop.distance;
        const orderRoute = nextStop.order;
        const traceId = nextStop.trace_id;
        const capacityPerHour = nextStop.capacity_per_hour;
        const longitude = nextStop.longitude;
        const latitude = nextStop.latitude;

        const adjustedDistance = distance - capacityPerHour;

        if (adjustedDistance < 0) {
          distance = 0;
        } else {
          distance = adjustedDistance;
        }

        graph[currentStopId].push({
          node: nextStopId,
          weight: distance,
          capacity_per_hour: capacityPerHour,
          order_route: orderRoute,
          trace_id: traceId,
          longitude: longitude,
          latitude: latitude,
        });
      }
    });
  });

  return graph;
};

const removeDuplicateEdges = (graph) => {
  const cleanGraph = {};

  for (const [stopId, edges] of Object.entries(graph)) {
    const uniqueEdges = new Set();

    edges.forEach((edge) => {
      const key = `${edge.node}-${edge.weight}`;
      if (!uniqueEdges.has(key)) {
        uniqueEdges.add(key);
        if (!cleanGraph[stopId]) {
          cleanGraph[stopId] = [];
        }
        cleanGraph[stopId].push(edge);
      }
    });
  }

  return cleanGraph;
};

function removeEdgesAboveThreshold(graph, maxWeight) {
  for (const node in graph) {
    graph[node] = graph[node].filter((edge) => edge.weight <= maxWeight);
    if (graph[node].length === 0) {
      delete graph[node];
    }
  }

  return graph;
}

class PriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(val, priority) {
    this.values.push({ val, priority });
    this.sort();
  }

  dequeue() {
    return this.values.shift();
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

const reconstructPath = (graph, path) => {
  const detailedPath = [];
  for (let i = 0; i < path.length - 1; i++) {
    const currentNode = path[i];
    const nextNode = path[i + 1];
    const edge = graph[currentNode].find(
      (neighbor) => neighbor.node === nextNode
    );
    if (edge) {
      detailedPath.push({
        from: currentNode,
        to: nextNode,
        distance: edge.weight,
        order_route: edge.order_route,
        trace_id: edge.trace_id,
      });
    }
  }
  return detailedPath;
};

const groupRoutesByTraceId = (routes) => {
  const grouped = {};

  routes.forEach((route) => {
    const traceId = route[0].trace_id;
    if (!grouped[traceId]) {
      grouped[traceId] = [];
    }
    grouped[traceId].push(...route);
  });

  return Object.values(grouped);
};

let startNodes = [];
let endNodes = [];
let totalNodes = [];
let shortestPath = [];
let check = "start";

const dijkstra = async (graph, startNode, endNode) => {
  startNode = String(startNode);
  endNode = String(endNode);

  const distances = {};
  const previous = {};
  const previousTraceId = {};
  const pq = new PriorityQueue();

  for (let node in graph) {
    distances[node] = Infinity;
    previous[node] = null;
    previousTraceId[node] = null;
    pq.enqueue(node, Infinity);
  }

  distances[startNode] = 0;
  pq.enqueue(startNode, 0);

  while (!pq.isEmpty()) {
    const smallest = pq.dequeue().val;

    if (smallest === endNode) {
      const path = [];
      let current = smallest;

      while (current !== null) {
        path.push(current);
        current = previous[current];
      }
      return path.reverse();
    }

    if (distances[smallest] !== Infinity) {
      for (let neighbor of graph[smallest]) {
        let additionalCost = 0;
        if (
          previousTraceId[smallest] !== null &&
          neighbor.trace_id !== previousTraceId[smallest]
        ) {
          additionalCost = 1000;
        }

        const candidate =
          distances[smallest] + neighbor.weight + additionalCost;
        const nextNeighbor = neighbor.node;

        if (candidate < distances[nextNeighbor]) {
          distances[nextNeighbor] = candidate;
          previous[nextNeighbor] = smallest;
          previousTraceId[nextNeighbor] = neighbor.trace_id;
          pq.enqueue(nextNeighbor, candidate);
        }
      }
    }
  }

  console.log("Ścieżka nie znaleziona");
  return [];
};

const findNearestStop = async (from, to, graph) => {
  let nearestStartStopId = null;
  let nearestEndStopId = null;
  let minDistance = Infinity;
  let isIn = false;

  const maxLength = 5;

  Object.keys(graph).forEach((nodeId) => {
    if (check == "start") {
      isIn = startNodes.includes(nodeId);
    }

    if (!isIn) {
      graph[nodeId].forEach((stop) => {
        const distance = getDistanceFromLatLonInMeters(
          from.latitude,
          from.longitude,
          stop.latitude,
          stop.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestStartStopId = nodeId;
        }
      });
    }
  });

  isIn = false;
  minDistance = Infinity;

  Object.keys(graph).forEach((nodeId) => {
    if (check == "end") {
      isIn = endNodes.includes(nodeId);
    }

    if (!isIn) {
      graph[nodeId].forEach((stop) => {
        const distance = getDistanceFromLatLonInMeters(
          to.latitude,
          to.longitude,
          stop.latitude,
          stop.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestEndStopId = nodeId;
        }
      });
    }
  });

  const res = await dijkstra(graph, nearestStartStopId, nearestEndStopId);

  if (res.length > 1) {
    shortestPath.push(res);
  }

  if (check == "start") {
    startNodes.push(nearestStartStopId);
    totalNodes.push(nearestStartStopId);
    if (totalNodes.length == maxLength * 2) {
      return;
    } else {
      if (startNodes.length == maxLength) check = "end";
      return await findNearestStop(from, to, graph);
    }
  } else {
    endNodes.push(nearestEndStopId);
    totalNodes.push(nearestEndStopId);
    if (totalNodes.length == maxLength * 2) {
      return;
    } else {
      return await findNearestStop(from, to, graph);
    }
  }
};

export const getShortest = async (req, res) => {
  const { from, to, stops, districts } = req.body;

  const trainSpeed = 15.55; //  m/s
  const walkSpeed = 1.75; //  m/s
  const radius = 2;
  const radiusSmaller = 1;

  try {
    const d = getDistanceFromLatLonInMeters(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );

    if (d < 2) {
      const tp = [
        {
          type: "Pieszo",
          data: [
            {
              ride: false,
              type: "Pieszo",
              latFrom: from.latitude,
              lonFrom: from.longitude,
              latTo: to.latitude,
              lonTo: to.longitude,
            },
          ],
        },
      ];

      const tor = await getCoordsWithDistances(tp);

      let totalTime = 0;
      let totalWalk = 0;

      tor.forEach((el) => {
        if (el.type == "Pieszo") {
          if (el.distance && el.distance.length > 0) {
            const distance = parseFloat(el.distance[0].distance);
            if (distance > 0) {
              totalTime += distance / parseFloat(walkSpeed);
              totalWalk += distance / parseFloat(walkSpeed);
            }
          }
        }
      });

      res.status(200).json([
        {
          arr: tor,
          info: {
            totalDelay: 0,
            totalTime: totalTime,
            totalTimeWithDelay: totalTime,
            total: {
              totalWalk: totalWalk,
              totalBus: 0,
              totalTrain: 0,
              totalTram: 0,
            },
          },
        },
      ]);
      return;
    } else {
      console.log(d, "km");

      let count = 6;

      if (d >= 3 && d < 4) {
        count = 1;
      } else if (d >= 4 && d < 7) {
        count = 2;
      } else if (d >= 7 && d < 10) {
        count = 3;
      } else if (d >= 10 && d < 14) {
        count = 4;
      } else if (d >= 14 && d < 18) {
        count = 5;
      } else if (d >= 18) {
        count = 6;
      }

      const array = [];

      const fromAr = getStopsWithinRadius(from, stops, radius);
      const toAr = getStopsWithinRadius(to, stops, radius);

      for (let i = 0; i <= count; i++) {
        const lat = from.latitude + (to.latitude - from.latitude) * (i / count);
        const lon =
          from.longitude + (to.longitude - from.longitude) * (i / count);

        const point = { latitude: lat, longitude: lon };
        array.push(point);
      }

      const stopsGenerated = [];

      for (const item of array) {
        const values = await getStopsWithinRadius(item, stops, radiusSmaller);

        if (values.length > 0) {
          stopsGenerated.push(...values);
        }
      }

      const allGenerated = await getDataForGraph(stopsGenerated);
      const rdFromAr = await getDataForGraph(fromAr);
      const rdToAr = await getDataForGraph(toAr);

      const all = [...rdFromAr, ...allGenerated, ...rdToAr];

      const uniqueTraceIds = new Set();
      const allRd = [];

      all.forEach((el) => {
        if (!uniqueTraceIds.has(el[0].trace_id)) {
          uniqueTraceIds.add(el[0].trace_id);
          allRd.push(el);
        }
      });

      const groupedRoutes = groupRoutesByTraceId(allRd);

      const allDone = await Promise.all(
        groupedRoutes.map((element) => getDistances(element, districts))
      );

      let graph = createGraph(allDone);
      let cleanedGraph = removeDuplicateEdges(graph);

      const maxWeightThreshold = 15000;
      cleanedGraph = removeEdgesAboveThreshold(
        cleanedGraph,
        maxWeightThreshold
      );

      await findNearestStop(from, to, cleanedGraph);

      if (shortestPath.length > 0) {
        const detailedPath = [];

        shortestPath.forEach((el) => {
          const detailed = reconstructPath(cleanedGraph, el);
          detailedPath.push(detailed);
        });

        const data = [];

        detailedPath.forEach((detail) => {
          const dataIn = [];
          detail.forEach((el, index) => {
            if (index == 0) {
              dataIn.push({
                ride: false,
                type: "Pieszo",
                longitude: from.longitude,
                latitude: from.latitude,
              });
            }

            if (index > 0) {
              if (detail[index - 1].trace_id != detail[index].trace_id) {
                dataIn.push({
                  ride: false,
                  type: "Pieszo",
                });
              }
            }

            allDone.forEach((el2) => {
              el2.forEach((el3) => {
                if (
                  el3.trace_id == el.trace_id &&
                  el3.order == el.order_route
                ) {
                  dataIn.push({
                    ...el3,
                    ride: true,
                  });
                }
              });
            });

            if (index == detail.length - 1) {
              dataIn.push({
                ride: false,
                type: "Pieszo",
              });
            }
          });

          data.push(dataIn);
        });

        const dataRd = [];

        data.forEach((dat) => {
          const dataRdIn = [];
          dat.forEach((el, index) => {
            if (index === 0) {
              let next = dat[index + 1];
              dataRdIn.push({
                ...el,
                latFrom: from.latitude,
                lonFrom: from.longitude,
                latTo: next.latitude,
                lonTo: next.longitude,
              });
            } else if (index === dat.length - 1) {
              let prev = dat[index - 1];
              dataRdIn.push({
                ...el,
                latFrom: prev.latitude,
                lonFrom: prev.longitude,
                latTo: to.latitude,
                lonTo: to.longitude,
              });
            } else {
              let prev = dat[index - 1];
              let next = dat[index + 1];
              if (!el.ride) {
                dataRdIn.push({
                  ...el,
                  latFrom: prev.latitude,
                  lonFrom: prev.longitude,
                  latTo: next.latitude,
                  lonTo: next.longitude,
                });
              } else {
                dataRdIn.push(el);
              }
            }
          });
          dataRd.push(dataRdIn);
        });

        const dataTo = [];

        dataRd.forEach((el) => {
          let segment = [];
          const dataToIn = [];
          for (let x = 0; x < el.length - 1; x++) {
            if (el[x].ride) {
              segment.push(el[x]);
              if (!el[x + 1].ride) {
                dataToIn.push({ type: segment[0].type, data: segment });
                segment = [];
              }
            } else {
              dataToIn.push({
                type: "Pieszo",
                data: [el[x]],
              });
            }
          }

          if (segment.length > 0) {
            segment.push(el[el.length - 1]);
            dataToIn.push({ type: segment[0].type, data: segment });
          } else {
            dataToIn.push({
              type: "Pieszo",
              data: [el[el.length - 1]],
            });
          }

          dataTo.push(dataToIn);
        });

        const dataToRd = [];

        dataTo.forEach((dto) => {
          const dataToRdIn = dto.filter((el) => {
            if (el.type != "Pieszo") {
              if (el.data.length > 1) {
                return el;
              }
            } else return el;
          });

          if (dataToRdIn.length > 0) {
            dataToRd.push(dataToRdIn);
          }
        });

        const arrToReturn = [];

        for (const el of dataToRd) {
          const rr = await getCoordsWithDistances(el);
          arrToReturn.push(rr);
        }

        const q3 = "SELECT * FROM traffic_flow WHERE order_time >= 0";

        const [traffic] = await db.query(q3);

        const t0 = traffic.filter((el) => el.order_time == 0);
        const t1 = traffic.filter((el) => el.order_time == 1);
        const t2 = traffic.filter((el) => el.order_time == 2);

        const maxDistance = 1000;

        const dToReturn = [];

        arrToReturn.forEach((artr) => {
          let totalTime = 0;
          let totalDelay = 0;
          let totalWalk = 0;
          let totalTrain = 0;
          let totalTram = 0;
          let totalBus = 0;
          artr.forEach((el) => {
            if (el.type == "Pieszo") {
              if (el.distance && el.distance.length > 0) {
                const distance = parseFloat(el.distance[0].distance);
                if (distance > 0) {
                  totalTime += distance / parseFloat(walkSpeed);
                  totalWalk += distance / parseFloat(walkSpeed);
                }
              }
            } else if (el.type == "Pociąg") {
              let total = 0;

              if (el.distance && el.distance.length > 0) {
                el.distance.forEach((el2) => {
                  const distance = parseFloat(el2.distance);
                  if (distance > 0) {
                    total += distance / parseFloat(trainSpeed);
                    totalTrain += total;
                  }
                });

                if (total > 0) {
                  totalTime += parseFloat(total);
                }
              }
            } else {
              el.data.forEach((coord, index2) => {
                let closestFlow = null;
                let minDistance = Infinity;

                const timeCategory = totalTime / 60;
                let flows;

                if (timeCategory < 15) {
                  flows = t0;
                } else if (timeCategory < 30) {
                  flows = t1;
                } else {
                  flows = t2;
                }

                flows.forEach((flow) => {
                  const distance = getDistanceFromLatLonInMeters(
                    coord.latitude,
                    coord.longitude,
                    flow.latitude,
                    flow.longitude
                  );

                  if (distance < minDistance) {
                    minDistance = distance;
                    closestFlow = flow;
                  }
                });

                let obj = {};

                if (minDistance > maxDistance) {
                  obj = { ...closestFlow, ...coord, speed: 13 };
                } else {
                  obj = { ...closestFlow, ...coord };
                }

                const road_class = getRoadClass(obj.freeFlow);
                const signalDensity = getSignalDensity(road_class);
                const X = getVCRatio(road_class, obj.speed, signalDensity);

                let distance = 0;
                if (index2 > 0 && el.distance && el.distance.length > 0) {
                  distance = parseFloat(el.distance[index2 - 1].distance) || 0;
                }

                if (distance > 0 && obj.speed > 0) {
                  const g = 35;
                  const C = 90;
                  const tc = 33;
                  const gC = g / C;
                  const d =
                    (C * Math.pow(1 - gC, 2)) / (2 * (1 - X * gC)) +
                    (Math.pow(X, 2) / (2 * (1 - X))) * tc;
                  const number_of_signals = signalDensity * (distance / 1000);
                  const tDelay = number_of_signals * d;

                  totalTime += distance / obj.speed;

                  if (el.type == "Tramwaj") {
                    totalTram += distance / parseFloat(obj.speed);
                  } else if (el.type == "Autobus") {
                    totalBus += distance / parseFloat(obj.speed);
                  }

                  totalDelay += tDelay;
                }
              });
            }
          });
          const totalTimeWithDelay =
            parseFloat(totalTime) + parseFloat(totalDelay);

          dToReturn.push({
            arr: artr,
            info: {
              totalDelay: totalDelay.toFixed(0),
              totalTime: totalTime.toFixed(0),
              totalTimeWithDelay: totalTimeWithDelay.toFixed(0),
              total: {
                totalWalk: totalWalk,
                totalBus: totalBus,
                totalTrain: totalTrain,
                totalTram: totalTram,
              },
            },
          });
        });

        dToReturn.forEach((el) => {
          let count = 0;
          el.arr.forEach((el2) => {
            if (el2.type == "Pieszo") {
              count++;
            }
          });

          console.log(count);
        });
        res.status(200).json(dToReturn);
      } else {
        const tp = [
          {
            type: "Pieszo",
            data: [
              {
                ride: false,
                type: "Pieszo",
                latFrom: from.latitude,
                lonFrom: from.longitude,
                latTo: to.latitude,
                lonTo: to.longitude,
              },
            ],
          },
        ];

        const tor = await getCoordsWithDistances(tp);

        let totalTime = 0;
        let totalWalk = 0;

        tor.forEach((el) => {
          if (el.type == "Pieszo") {
            if (el.distance && el.distance.length > 0) {
              const distance = parseFloat(el.distance[0].distance);
              if (distance > 0) {
                totalTime += distance / parseFloat(walkSpeed);
                totalWalk += distance / parseFloat(walkSpeed);
              }
            }
          }
        });

        res.status(200).json([
          {
            arr: tor,
            info: {
              totalDelay: 0,
              totalTime: totalTime,
              totalTimeWithDelay: totalTime,
              total: {
                totalWalk: totalWalk,
                totalBus: 0,
                totalTrain: 0,
                totalTram: 0,
              },
            },
          },
        ]);
        return;
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
