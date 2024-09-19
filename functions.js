import api from "./api.js";

export const sortLines = (vehicles) => {
  const numbers = [];
  const letters = [];

  vehicles.forEach((line) => {
    if (/^\d+$/.test(line.route)) {
      numbers.push(line);
    } else {
      letters.push(line);
    }
  });

  const sortedNumbers = numbers.sort(sortNumbers);
  const sortedLetters = letters.sort(sortLetters);

  const sortedLines = [...sortedNumbers, ...sortedLetters];
  return sortedLines;
};

const sortNumbers = (a, b) => {
  const aNumber = parseInt(a.route);
  const bNumber = parseInt(b.route);

  return aNumber - bNumber;
};

const sortLetters = (a, b) => {
  return a.route.localeCompare(b.route);
};

export const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((parseFloat(lat2) - parseFloat(lat1)) * Math.PI) / 180;
  const dLon = ((parseFloat(lon1) - parseFloat(lon2)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getTimeDifferenceInMinutes = async (time1, time2) => {
  const [hours1, minutes1] = await time1.split(":").map(Number);
  const [hours2, minutes2] = await time2.split(":").map(Number);

  const date1 = new Date();
  date1.setHours(hours1, minutes1, 0);

  const date2 = new Date();
  date2.setHours(hours2, minutes2, 0);

  const differenceInMinutes = (date2 - date1) / (1000 * 60);
  return differenceInMinutes;
};

export const getLOSHoursPerDay = (hoursPerDay) => {
  if (hoursPerDay > 18) {
    return "A";
  }

  if (hoursPerDay >= 16) {
    return "B";
  }

  if (hoursPerDay >= 13) {
    return "C";
  }

  if (hoursPerDay >= 11) {
    return "D";
  }

  if (hoursPerDay >= 3) {
    return "E";
  }

  return "F";
};

export const joinDistrict = async (pAr, districts) => {
  const pArReturn = [];

  pAr.forEach((el) => {
    let avgLat = 0;
    let avgLon = 0;
    el.points.forEach((el2) => {
      avgLat += el2.latitude;
      avgLon += el2.longitude;
    });

    avgLat = avgLat / el.points.length;
    avgLon = avgLon / el.points.length;

    const point = { latitude: avgLat, longitude: avgLon };
    let districtInfo = {
      district_name: "Poza Warszawą",
      population_density: 400,
    };

    for (const district of districts) {
      if (isPointInPolygon(point, district.border_coords)) {
        districtInfo = {
          district_name: district.name,
          population_density: district.population_density,
        };
        break;
      }
    }

    pArReturn.push({
      ...el,
      ...districtInfo,
    });
  });

  return pArReturn;
};

export const isPointInPolygon = (point, polygon) => {
  let x = point.longitude,
    y = point.latitude;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].longitude,
      yi = polygon[i].latitude;
    let xj = polygon[j].longitude,
      yj = polygon[j].latitude;
    let intersect =
      yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

export const removeDuplicates = (traffic) => {
  const withoutDuplicates = [];
  const seenCoordinates = new Set();

  traffic.forEach((el) => {
    const key = `${el.latitude},${el.longitude}`;
    if (!seenCoordinates.has(key)) {
      seenCoordinates.add(key);
      withoutDuplicates.push(el);
    }
  });

  return withoutDuplicates;
};

export const groupBySpeed = (trafficFlow) => {
  const groupedData = {};

  trafficFlow.forEach((flow) => {
    const key = `${flow.speed}_${flow.speedUncapped}_${flow.freeFlow}`;

    if (!groupedData[key]) {
      groupedData[key] = {
        name: flow.name,
        speed: flow.speed,
        speedUncapped: flow.speedUncapped,
        freeFlow: flow.freeFlow,
        jamFactor: flow.jamFactor,
        confidence: flow.confidence,
        traversability: flow.traversability,
        order_time: flow.order_time,
        points: [
          {
            latitude: flow.latitude,
            longitude: flow.longitude,
          },
        ],
      };
    } else {
      groupedData[key].points.push({
        latitude: flow.latitude,
        longitude: flow.longitude,
      });
    }
  });

  return Object.values(groupedData);
};

export const groupByName = (trafficFlow) => {
  const groupedData = {};

  trafficFlow.forEach((flow) => {
    const key = flow.name;

    if (!groupedData[key]) {
      groupedData[key] = {
        name: flow.name,
        order_time: flow.order_time,
        flows: [],
      };
    }

    groupedData[key].flows.push({
      speed: flow.speed,
      speedUncapped: flow.speedUncapped,
      freeFlow: flow.freeFlow,
      jamFactor: flow.jamFactor,
      confidence: flow.confidence,
      traversability: flow.traversability,
      points: flow.points,
    });
  });

  return Object.values(groupedData);
};

export const equalizeFlowsLength = (p0Sorted, p1Sorted, p2Sorted) => {
  p0Sorted.forEach((el, index) => {
    const minLength = Math.min(
      el.flows.length,
      p1Sorted[index].flows.length,
      p2Sorted[index].flows.length
    );

    if (el.flows.length > minLength) {
      const pointsToMove = el.flows.slice(minLength).flatMap((f) => f.points);
      el.flows[minLength - 1].points.push(...pointsToMove);
    }
    if (p1Sorted[index].flows.length > minLength) {
      const pointsToMove = p1Sorted[index].flows
        .slice(minLength)
        .flatMap((f) => f.points);
      p1Sorted[index].flows[minLength - 1].points.push(...pointsToMove);
    }
    if (p2Sorted[index].flows.length > minLength) {
      const pointsToMove = p2Sorted[index].flows
        .slice(minLength)
        .flatMap((f) => f.points);
      p2Sorted[index].flows[minLength - 1].points.push(...pointsToMove);
    }

    el.flows = el.flows.slice(0, minLength);
    p1Sorted[index].flows = p1Sorted[index].flows.slice(0, minLength);
    p2Sorted[index].flows = p2Sorted[index].flows.slice(0, minLength);
  });
};

export const getDistances = async (trace, districts) => {
  let string = "";
  const type = trace[0].type;

  trace.forEach((el, index) => {
    string += el.longitude + "," + el.latitude;
    if (index != trace.length - 1) {
      string += ";";
    }
  });

  let url = "";

  if (type != "Pieszo") {
    url = "/route/v1/driving/" + string + "?overview=full&geometries=geojson";
  } else {
    url = "/route/v1/walk/" + string + "?overview=full&geometries=geojson";
  }

  const strSplit = string.split(";");

  try {
    let r;

    const d = process.env.IP_URL;

    if (type == "Autobus") {
      r = await api.get(d + "5000" + url);
    } else if (type == "Tramwaj") {
      r = await api.get(d + "5001" + url);
    } else if (type == "Pieszo") {
      r = await api.get(d + "5000" + url);
    }

    if (
      r.data.routes &&
      r.data.routes.length > 0 &&
      r.data.routes[0].geometry &&
      r.data.routes[0].geometry.coordinates
    ) {
      const other_info = r.data.routes[0].legs.map((el, index) => {
        const coords = strSplit[index].split(",");

        const point = { latitude: coords[1], longitude: coords[0] };
        let districtInfo = { name: "Poza Warszawą", population_density: 400 };

        for (const district of districts) {
          if (isPointInPolygon(point, district.border_coords)) {
            districtInfo = {
              name: district.name,
              population_density: district.population_density,
            };
            break;
          }
        }

        return {
          order: index,
          distance: el.distance,
          duration: el.duration,
          weight: el.weight,
          ...districtInfo,
        };
      });

      const newTrace = other_info.map((el, index) => {
        return {
          ...trace[index],
          distance: el.distance,
          name_district: el.name,
          population_density: el.population_density,
        };
      });

      return newTrace;
    } else {
      const rr = trace.map((el) => {
        return {
          ...el,
          distance: 300,
          name_district: "Poza Warszawą",
          population_density: 400,
        };
      });

      return rr;
    }
  } catch (err) {
    console.log(err);

    const rr = trace.map((el) => {
      return {
        ...el,
        distance: 300,
        name_district: "Poza Warszawą",
        population_density: 400,
      };
    });

    return rr;
  }
};

export const getOnlyDistances = async (array) => {
  const rd = [];

  let index = 0;
  const type = array[0].type;
  let string = "";

  for (const el of array) {
    string += el.longitude + "," + el.latitude;
    if (index != array.length - 1) {
      string += ";";
    }

    index++;
  }

  const url =
    "/route/v1/driving/" + string + "?overview=full&geometries=geojson";

  try {
    let r;

    const d = process.env.IP_URL;

    if (type == "Autobus") {
      r = await api.get(d + "5000" + url);
    } else if (type == "Tramwaj") {
      r = await api.get(d + "5001" + url);
    } else if (type == "Pieszo") {
      r = await api.get(d + "5000" + url);
    }

    if (
      r.data.routes &&
      r.data.routes.length > 0 &&
      r.data.routes[0].geometry &&
      r.data.routes[0].geometry.coordinates
    ) {
      const other_info = r.data.routes[0].legs;

      array.forEach((el, index) => {
        if (index == array.length - 1) {
          rd.push({
            ...el,
            distance: 0,
          });
        } else {
          rd.push({
            ...el,
            distance: other_info[index].distance,
          });
        }
      });

      return rd;
    } else return null;
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const getCoordsWithDistances = async (array) => {
  const rd = [];

  for (const el of array) {
    let string = "";
    const type = el.type;

    let url = "";

    if (type == "Pieszo") {
      string = `${el.data[0].lonFrom},${el.data[0].latFrom};${el.data[0].lonTo},${el.data[0].latTo}`;

      url = "/route/v1/walk/" + string + "?overview=full&geometries=geojson";
    } else {
      el.data.forEach((el2, index) => {
        string += el2.longitude + "," + el2.latitude;
        if (index != el.data.length - 1) {
          string += ";";
        }
      });

      url = "/route/v1/driving/" + string + "?overview=full&geometries=geojson";
    }

    try {
      let r;

      const d = process.env.IP_URL;

      if (type == "Autobus") {
        r = await api.get(d + "5000" + url);
      } else if (type == "Tramwaj") {
        r = await api.get(d + "5001" + url);
      } else if (type == "Pieszo") {
        r = await api.get(d + "5000" + url);
      }

      if (
        r.data.routes &&
        r.data.routes.length > 0 &&
        r.data.routes[0].geometry &&
        r.data.routes[0].geometry.coordinates
      ) {
        const latLngs = r.data.routes[0].geometry.coordinates;

        const ready = await Promise.all(
          latLngs.map(async (coord, index) => {
            const point = { latitude: coord[1], longitude: coord[0] };

            return {
              latitude: point.latitude,
              longitude: point.longitude,
              order: index,
            };
          })
        );

        const other_info = r.data.routes[0].legs.map((el, index) => {
          return {
            order: index,
            distance: el.distance,
            duration: el.duration,
            weight: el.weight,
          };
        });
        rd.push({
          ...el,
          coordinates: ready,
          distance: other_info,
        });
      } else {
        rd.push({
          ...el,
          coordinates: [],
          distance: [],
        });
      }
    } catch (err) {
      rd.push({
        ...el,
        coordinates: [],
        distance: [],
      });
    }
  }

  return rd;
};

// exhibit 15-2
export const getLOSClass = (road_class, avgSpeed) => {
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

// exhibit 10-5
export const getRoadClass = (freeFlow) => {
  const kmh = freeFlow * 3.6;

  if (kmh >= 80) return "I";
  if (kmh >= 65) return "II";
  if (kmh >= 55) return "III";

  return "IV";
};

export const calculateTimeDifference = (time1, time2) => {
  const [hours1, minutes1] = time1.split(":").map(Number);
  const [hours2, minutes2] = time2.split(":").map(Number);

  const totalMinutes1 = hours1 * 60 + minutes1;
  const totalMinutes2 = hours2 * 60 + minutes2;

  let diffMinutes = totalMinutes2 - totalMinutes1;

  const hours = Math.floor(Math.abs(diffMinutes) / 60);
  const minutes = Math.abs(diffMinutes) % 60;

  return { hours, minutes };
};

// exhibit 10-6
export const getSignalDensity = (road_class) => {
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

//exhibit 15-8 -> 15-11
export const getVCRatio = (road_class, travelSpeed, signalDensity) => {
  const kmh = travelSpeed * 3.6;

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
