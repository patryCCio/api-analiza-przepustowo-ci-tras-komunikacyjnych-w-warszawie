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

export const getStopsWithinRadius = (from, stops, radius) => {
  const toRadians = (degree) => (degree * Math.PI) / 180;

  const distanceBetweenCoordinates = (coord1, coord2) => {
    const earthRadiusKm = 6371;

    const dLat = toRadians(
      parseFloat(coord2.latitude) - parseFloat(coord1.latitude)
    );
    const dLon = toRadians(
      parseFloat(coord2.longitude) - parseFloat(coord1.longitude)
    );

    const lat1 = toRadians(parseFloat(coord1.latitude));
    const lat2 = toRadians(parseFloat(coord2.latitude));

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  };

  const stopsWithinRadius = stops.filter((stop) => {
    const distance = distanceBetweenCoordinates(from, stop);
    return distance <= radius;
  });

  if (stopsWithinRadius.length > 0) {
    return stopsWithinRadius;
  } else {
    let closestStop = null;
    let minDistance = Infinity;

    stops.forEach((stop) => {
      const distance = distanceBetweenCoordinates(from, stop);
      if (distance < minDistance) {
        minDistance = distance;
        closestStop = stop;
      }
    });

    return closestStop ? [closestStop] : [];
  }
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

const sortNumbers = (a, b) => {
  const aNumber = parseInt(a.route);
  const bNumber = parseInt(b.route);

  return aNumber - bNumber;
};

const sortLetters = (a, b) => {
  return a.route.localeCompare(b.route);
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
    } else if (type == "Pociąg") {
      r = await api.get(d + "5002" + url);
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
    } else if (type == "Pociąg") {
      r = await api.get(d + "5002" + url);
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
      } else if (type == "Pociąg") {
        r = await api.get(d + "5002" + url);
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
