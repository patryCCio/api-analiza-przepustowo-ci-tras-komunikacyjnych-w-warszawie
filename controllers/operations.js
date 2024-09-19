import {
  getCoordsWithDistances,
  getDistanceFromLatLonInMeters,
  getLOSClass,
  getOnlyDistances,
  getRoadClass,
  getSignalDensity,
  getVCRatio,
  sortLines,
  getLOSHoursPerDay,
  calculateTimeDifference,
} from "../functions.js";
import { db } from "../config/db-config.js";

export const getLineCapacity = async (req, res) => {
  const { traceData } = req.body;
  try {
    const timeS = traceData.traces.routes[0].timetables.find(
      (el) => el.order == 0
    );
    const timeE = traceData.traces.routes[0].timetables.find(
      (el) => el.order == traceData.traces.routes[0].timetables.length - 1
    );

    const lengthTime = traceData.traces.routes[0].timetables.length;

    const a = calculateTimeDifference(timeS.time, timeE.time);
    const avg = parseInt(lengthTime) / parseInt(a.hours);

    let actualHour = new Date().getHours();

    actualHour = actualHour < 10 ? "0" + actualHour : actualHour;

    let count = 0;

    traceData.traces.routes[0].timetables.forEach((el) => {
      const time = el.time.split(":")[0];

      if (time == actualHour) {
        count++;
      }
    });

    let numberOfTrains = 1;

    if (traceData.type == "Tramwaj") {
      numberOfTrains = 2;
    }

    const cV = count * numberOfTrains * traceData.capacity;
    const losHour = getLOSHoursPerDay(parseInt(a.hours));

    let distance = 0;
    let duration_osrm = 0;
    let duration_timetable = 0;

    traceData.traces.coords.distance.forEach((el) => {
      distance += el.distance;
      duration_osrm += el.duration;
    });

    traceData.traces.routes.forEach((el) => {
      duration_timetable += el.timeFromPrev;
    });

    distance = Math.round(distance);

    res.status(200).json({
      routeInfo: {
        duration_osrm,
        duration_timetable,
        distance,
      },
      times: {
        start: timeS.time,
        end: timeE.time,
      },
      cVeh: cV,
      hourActivity: parseInt(a.hours),
      averagePerHour: count,
      averagePerDay: avg,
      losHour: losHour,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

export const getTrafficAnalizeData = async (req, res) => {
  const { analizeEl, labelArray, traceData } = req.body;

  try {
    const data_1_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.avgSpeed * 3.6;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_1_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.avgSpeed * 3.6;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_1_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.avgSpeed * 3.6;
      it = parseFloat(it.toFixed(2));
      return it;
    });

    const data_2_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.avgConfidence * 100;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_2_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.avgConfidence * 100;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_2_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.avgConfidence * 100;
      it = parseFloat(it.toFixed(2));
      return it;
    });

    const data_3_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.avgJamFactor;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_3_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.avgJamFactor;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_3_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.avgJamFactor;
      it = parseFloat(it.toFixed(2));
      return it;
    });

    const data_4_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.avgFreeFlow * 3.6;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_4_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.avgFreeFlow * 3.6;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_4_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.avgFreeFlow * 3.6;
      it = parseFloat(it.toFixed(2));
      return it;
    });

    const data_5_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.avgPopulationDensity;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_5_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.avgPopulationDensity;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_5_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.avgPopulationDensity;
      it = parseFloat(it.toFixed(2));
      return it;
    });

    const data_6_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.avgLanes;
      it = parseFloat(it);
      return it;
    });
    const data_6_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.avgLanes;
      it = parseFloat(it);
      return it;
    });
    const data_6_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.avgLanes;
      it = parseFloat(it.toFixed(2));
      return it;
    });

    const data_7_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.c;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_7_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.c;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_7_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.c;
      it = parseFloat(it.toFixed(2));
      return it;
    });

    const data_8_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.travelTimeWithDelays / 60;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_8_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.travelTimeWithDelays / 60;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_8_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.travelTimeWithDelays / 60;
      it = parseFloat(it.toFixed(2));
      return it;
    });

    const data_9_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.totalDelay / 60;
      it = parseFloat(it.toFixed(0));
      return it;
    });
    const data_9_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.totalDelay / 60;
      it = parseFloat(it.toFixed(0));
      return it;
    });
    const data_9_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.totalDelay / 60;
      it = parseFloat(it.toFixed(0));
      return it;
    });

    const data_10_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.finalSpeed * 3.6;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_10_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.finalSpeed * 3.6;
      it = parseFloat(it.toFixed(2));
      return it;
    });
    const data_10_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.finalSpeed * 3.6;
      it = parseFloat(it.toFixed(2));
      return it;
    });

    const data_11_0 = analizeEl.traces.results_0.map((el) => {
      let it = el.cVehS;
      it = parseFloat(it.toFixed(0));
      return it;
    });
    const data_11_1 = analizeEl.traces.results_1.map((el) => {
      let it = el.cVehS;
      it = parseFloat(it.toFixed(0));
      return it;
    });
    const data_11_2 = analizeEl.traces.results_2.map((el) => {
      let it = el.cVehS;
      it = parseFloat(it.toFixed(0));
      return it;
    });

    let averageSpeed0 = 0;
    let averageJamFactor0 = 0;
    let averageFreeFlow0 = 0;
    let averageFinalSpeed0 = 0;
    let totalTimeWithDelay0 = 0;
    let totalTimeWithoutDelay0 = 0;
    let cVehS0 = 0;
    let c0 = 0;

    let averageSpeed1 = 0;
    let averageJamFactor1 = 0;
    let averageFreeFlow1 = 0;
    let averageFinalSpeed1 = 0;
    let totalTimeWithDelay1 = 0;
    let totalTimeWithoutDelay1 = 0;
    let cVehS1 = 0;
    let c1 = 0;

    let averageSpeed2 = 0;
    let averageJamFactor2 = 0;
    let averageFreeFlow2 = 0;
    let averageFinalSpeed2 = 0;
    let totalTimeWithDelay2 = 0;
    let totalTimeWithoutDelay2 = 0;
    let cVehS2 = 0;
    let c2 = 0;

    let total = 0;

    let speed = 0;
    let jamFactor = 0;
    let freeFlow = 0;
    let finalSpeed = 0;
    let totalTimeWithDelay = 0;
    let totalTimeWithoutDelay = 0;
    let c = 0;
    let cVehS = 0;

    for (let x = 0; x < labelArray.length - 1; x++) {
      const result0 = analizeEl.traces.results_0[x];
      const result1 = analizeEl.traces.results_1[x];
      const result2 = analizeEl.traces.results_2[x];

      averageSpeed0 += result0.avgSpeed;
      averageSpeed1 += result1.avgSpeed;
      averageSpeed2 += result2.avgSpeed;

      averageJamFactor0 += result0.avgJamFactor;
      averageJamFactor1 += result1.avgJamFactor;
      averageJamFactor2 += result2.avgJamFactor;

      c0 += result0.c;
      c1 += result1.c;
      c2 += result2.c;

      cVehS0 += result0.cVehS;
      cVehS1 += result1.cVehS;
      cVehS2 += result2.cVehS;

      averageFreeFlow0 += result0.avgFreeFlow;
      averageFreeFlow1 += result1.avgFreeFlow;
      averageFreeFlow2 += result2.avgFreeFlow;

      averageFinalSpeed0 += result0.finalSpeed;
      averageFinalSpeed1 += result1.finalSpeed;
      averageFinalSpeed2 += result2.finalSpeed;

      totalTimeWithDelay0 += result0.travelTimeWithDelays;
      totalTimeWithDelay1 += result1.travelTimeWithDelays;
      totalTimeWithDelay2 += result2.travelTimeWithDelays;

      totalTimeWithoutDelay0 += result0.travelTimeWithoutDelays;
      totalTimeWithoutDelay1 += result1.travelTimeWithoutDelays;
      totalTimeWithoutDelay2 += result2.travelTimeWithoutDelays;

      let min = total / 60;

      if (min < 15) {
        total += result0.travelTimeWithDelays;

        speed += result0.avgSpeed;
        jamFactor += result0.avgJamFactor;
        c += result0.c;
        freeFlow += result0.avgFreeFlow;
        finalSpeed += result0.finalSpeed;
        totalTimeWithDelay += result0.travelTimeWithDelays;
        totalTimeWithoutDelay += result0.travelTimeWithoutDelays;
        cVehS += result0.cVehS;
      } else if (min >= 15 && min < 30) {
        total += result1.travelTimeWithDelays;

        speed += result1.avgSpeed;
        jamFactor += result1.avgJamFactor;
        c += result1.c;
        freeFlow += result1.avgFreeFlow;
        finalSpeed += result1.finalSpeed;
        totalTimeWithDelay += result1.travelTimeWithDelays;
        totalTimeWithoutDelay += result1.travelTimeWithoutDelays;
        cVehS += result1.cVehS;
      } else {
        total += result2.travelTimeWithDelays;

        speed += result2.avgSpeed;
        jamFactor += result2.avgJamFactor;
        c += result2.c;
        freeFlow += result2.avgFreeFlow;
        finalSpeed += result2.finalSpeed;
        totalTimeWithDelay += result2.travelTimeWithDelays;
        totalTimeWithoutDelay += result2.travelTimeWithoutDelays;
        cVehS += result2.cVehS;
      }
    }

    const count = labelArray.length;

    averageSpeed0 /= count;
    averageJamFactor0 /= count;
    averageFreeFlow0 /= count;
    averageFinalSpeed0 /= count;
    c0 /= count;
    cVehS0 /= count;

    averageSpeed1 /= count;
    averageJamFactor1 /= count;
    averageFreeFlow1 /= count;
    averageFinalSpeed1 /= count;
    c1 /= count;
    cVehS1 /= count;

    averageSpeed2 /= count;
    averageJamFactor2 /= count;
    averageFreeFlow2 /= count;
    averageFinalSpeed2 /= count;
    c2 /= count;
    cVehS2 /= count;

    speed /= count;
    jamFactor /= count;
    freeFlow /= count;
    finalSpeed /= count;
    c /= count;
    cVehS /= count;

    const roadClass0 = getRoadClass(averageFreeFlow0);
    const roadClass1 = getRoadClass(averageFreeFlow1);
    const roadClass2 = getRoadClass(averageFreeFlow2);
    const roadClassFuture = getRoadClass(freeFlow);

    const los0 = getLOSClass(roadClass0, averageFinalSpeed0);
    const los1 = getLOSClass(roadClass1, averageFinalSpeed1);
    const los2 = getLOSClass(roadClass2, averageFinalSpeed2);
    const losFuture = getLOSClass(roadClassFuture, finalSpeed);

    const districts = [];

    traceData.traces.coords.coordinates.forEach((el) => {
      let isIn = false;
      districts.forEach((el2) => {
        if (el.name == el2.name) {
          isIn = true;
        }
      });

      if (!isIn) {
        districts.push({
          name: el.name,
          population_density: el.population_density,
          area: el.area,
        });
      }
    });

    const d = [];
    const de = [];

    districts.forEach((el) => {
      let count = 0;
      traceData.traces.coords.distance.forEach((el2) => {
        if (el.name == el2.name) {
          count++;
        }
      });

      d.push({
        ...el,
        count,
      });
    });

    let total2 = 0;
    let total3 = 0;

    d.forEach((el) => {
      let aspeed = 0;
      let ajamFactor = 0;
      let afreeFlow = 0;
      let afinalSpeed = 0;
      let atotalTimeWithDelay = 0;
      let atotalTimeWithoutDelay = 0;
      let ac = 0;
      let aCvehS = 0;

      for (let x = total2; x < total2 + el.count; x++) {
        let min = total3 / 60;
        let obj = {};
        if (min < 15) {
          obj = analizeEl.traces.results_0[x];
        } else if (min >= 15 && min < 30) {
          obj = analizeEl.traces.results_1[x];
        } else if (min >= 30) {
          obj = analizeEl.traces.results_2[x];
        }

        total3 += obj.travelTimeWithDelays;

        aspeed += obj.avgSpeed;
        ajamFactor += obj.avgJamFactor;
        ac += obj.c;
        afreeFlow += obj.avgFreeFlow;
        afinalSpeed += obj.finalSpeed;
        atotalTimeWithDelay += obj.travelTimeWithDelays;
        atotalTimeWithoutDelay += obj.travelTimeWithoutDelays;
        aCvehS += obj.cVehS;
      }
      total2 += el.count;

      aspeed /= el.count;
      ajamFactor /= el.count;
      ac /= el.count;
      afreeFlow /= el.count;
      afinalSpeed /= el.count;
      atotalTimeWithDelay /= el.count;
      atotalTimeWithoutDelay /= el.count;
      aCvehS /= el.count;

      const road_class = getRoadClass(afreeFlow);
      const los = getLOSClass(road_class, afinalSpeed);

      de.push({
        ...el,
        speed: aspeed,
        jamFactor: ajamFactor,
        c: ac,
        cVehS: aCvehS.toFixed(0),
        freeFlow: afreeFlow,
        finalSpeed: afinalSpeed,
        travelTimeWithDelays: atotalTimeWithDelay,
        travelTimeWithoutDelays: atotalTimeWithoutDelay,
        los: los,
      });
    });

    const data1 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_1_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_1_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_1_2 }],
      },
    };
    const data2 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_2_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_2_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_2_2 }],
      },
    };

    const data3 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_3_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_3_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_3_2 }],
      },
    };

    const data4 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_4_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_4_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_4_2 }],
      },
    };

    const data5 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_5_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_5_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_5_2 }],
      },
    };

    const data6 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_6_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_6_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_6_2 }],
      },
    };

    const data7 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_7_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_7_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_7_2 }],
      },
    };

    const data8 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_8_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_8_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_8_2 }],
      },
    };

    const data9 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_9_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_9_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_9_2 }],
      },
    };

    const data10 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_10_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_10_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_10_2 }],
      },
    };

    const data11 = {
      data_0: {
        labels: labelArray,
        datasets: [{ data: data_11_0 }],
      },
      data_1: {
        labels: labelArray,
        datasets: [{ data: data_11_1 }],
      },
      data_2: {
        labels: labelArray,
        datasets: [{ data: data_11_2 }],
      },
    };

    res.status(200).json({
      values: {
        time_0: {
          speed: averageSpeed0,
          freeFlow: averageFreeFlow0,
          jamFactor: averageJamFactor0,
          finalSpeed: averageFinalSpeed0,
          travelTimeWithDelays: totalTimeWithDelay0,
          travelTimeWithoutDelays: totalTimeWithoutDelay0,
          c: c0,
          cVehS: cVehS0,
          los: los0,
        },
        time_1: {
          speed: averageSpeed1,
          freeFlow: averageFreeFlow1,
          jamFactor: averageJamFactor1,
          finalSpeed: averageFinalSpeed1,
          travelTimeWithDelays: totalTimeWithDelay1,
          travelTimeWithoutDelays: totalTimeWithoutDelay1,
          c: c1,
          cVehS: cVehS1,
          los: los1,
        },
        time_2: {
          speed: averageSpeed2,
          freeFlow: averageFreeFlow2,
          jamFactor: averageJamFactor2,
          finalSpeed: averageFinalSpeed2,
          travelTimeWithDelays: totalTimeWithDelay2,
          travelTimeWithoutDelays: totalTimeWithoutDelay2,
          c: c2,
          cVehS: cVehS2,
          los: los2,
        },
        future: {
          speed: speed,
          freeFlow: freeFlow,
          jamFactor: jamFactor,
          finalSpeed: finalSpeed,
          travelTimeWithDelays: totalTimeWithDelay,
          travelTimeWithoutDelays: totalTimeWithoutDelay,
          c: c,
          cVehS: cVehS.toFixed(0),
          los: losFuture,
        },
        districts: de,
      },
      data: {
        data1,
        data2,
        data3,
        data4,
        data5,
        data6,
        data7,
        data8,
        data9,
        data10,
        data11,
      },
    });
  } catch (err) {
    res.status(500).json(err);
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

export const calculateDelayForStops = (el, type, stops) => {
  const totalpassengerInBusPerDay = 1238961;
  const totalpassengerInTramPerDay = 681928;
  const totalPassengersPerDay =
    totalpassengerInBusPerDay + totalpassengerInTramPerDay;
  const percentageOfTram = totalpassengerInTramPerDay / totalPassengersPerDay;
  const percentageOfBus = totalpassengerInBusPerDay / totalPassengersPerDay;

  let tramStops = 0;
  let busStops = 0;

  for (const it of stops) {
    if (it.type == "Tramwajowy") {
      if (it.district_name == el.name) {
        tramStops++;
      }
    } else {
      if (it.district_name == el.name) {
        busStops++;
      }
    }
  }

  let population = 0;

  if (type == "Tramwaj") {
    population = parseInt(
      (el.population_density * el.area * 0.65 * percentageOfTram) / 24
    );
  } else {
    population = parseInt(
      (el.population_density * el.area * 0.65 * percentageOfBus) / 24
    );
  }

  const crowdingFactor = getPassengerFlowFactor();

  if (type == "Tramwaj") {
    population = population / tramStops;
  } else {
    population = population / busStops;
  }

  population = (population * crowdingFactor) / 4;

  const boardingTimePerPassenger = 3; 
  const alightingTimePerPassenger = 2;
  const stopTime = 5; 

  const passengersBoarding = Math.floor(population * 0.5);
  const passengersAlighting = Math.floor(population * 0.5);

  const totalDelay =
    passengersBoarding * boardingTimePerPassenger +
    passengersAlighting * alightingTimePerPassenger +
    stopTime;

  return totalDelay;
};

export const getPassengerFlowFactor = () => {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 9) {
    return 1.2; // Poranny szczyt
  } else if (hour >= 9 && hour < 15) {
    return 0.6; // Środek dnia
  } else if (hour >= 15 && hour < 18) {
    return 1.5; // Popołudniowy szczyt
  } else if (hour >= 18 && hour < 21) {
    return 0.7; // Wieczór
  } else {
    return 0.3; // Noc, minimalny ruch
  }
};

const getCapacity = async (arr, traceData, choice, stops) => {
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

    let distances = traceData.traces.coords_0.distance[x - 1];

    let d2 = 0;

    if (distances != null) {
      d2 = calculateDelayForStops(distances, traceData.type, stops);
    }

    let g = 35;
    let C = 90;

    const S = 1900;
    const N = avgLanes;

    const gC = g / C;

    let L = 0;

    if (traceData.type == "Autobus") {
      if (traceData.capacity == 50) {
        L = 13.5;
      } else if (traceData.capacity == 80) {
        L = 15;
      } else {
        L = 18.75;
      }
    } else {
      L = 30 * 2;
    }

    let h = 0;
    let safetyDistance = 3;
    if (traceData.type == "Autobus") {
      safetyDistance = 3;
    } else {
      safetyDistance = 10;
    }

    h = (L + safetyDistance) / avgSpeed;
    const Sveh = 3600 / h;

    const cVehS = Sveh * gC * N;

    let d = (0.5 * C * Math.pow(1 - gC, 2)) / (1 - X * gC); // s

    const cLane = S * gC;
    const c = cLane * N;

    const number_of_signals = signalDensity * (distance / 1000);
    let totalDelay = number_of_signals * d;

    totalDelay = parseInt(totalDelay + d2);

    const travelTimeWithoutDelays = distance / avgSpeed;

    const travelTimeWithDelays = travelTimeWithoutDelays + totalDelay;
    const finalSpeed = distance / travelTimeWithDelays;

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
      distance,
      cVehS,
    });
  }
  return newValues;
};

export const getTrafficFlow = async (req, res) => {
  const { traceData, stops } = req.body;

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

    arr.push({ order, index });
  });

  const results_0 = await getCapacity(arr, traceData, 0, stops);
  const results_1 = await getCapacity(arr, traceData, 1, stops);
  const results_2 = await getCapacity(arr, traceData, 2, stops);
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

// tych jeszcze nie ma V

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

//===============================================================

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

        const adjustedDistance = distance - capacityPerHour / 20;

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

const removeEdgesAboveThreshold = (graph, maxWeight) => {
  for (const node in graph) {
    graph[node] = graph[node].filter((edge) => edge.weight <= maxWeight);
    if (graph[node].length === 0) {
      delete graph[node];
    }
  }

  return graph;
};

class PriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(val, priority) {
    this.values.push({ val, priority });
    this.bubbleUp();
  }

  dequeue() {
    const min = this.values[0];
    const end = this.values.pop();
    if (this.values.length > 0) {
      this.values[0] = end;
      this.sinkDown();
    }
    return min;
  }

  bubbleUp() {
    let idx = this.values.length - 1;
    const element = this.values[idx];

    while (idx > 0) {
      let parentIdx = Math.floor((idx - 1) / 2);
      let parent = this.values[parentIdx];
      if (element.priority >= parent.priority) break;
      this.values[parentIdx] = element;
      this.values[idx] = parent;
      idx = parentIdx;
    }
  }

  sinkDown() {
    let idx = 0;
    const length = this.values.length;
    const element = this.values[0];

    while (true) {
      let leftChildIdx = 2 * idx + 1;
      let rightChildIdx = 2 * idx + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIdx < length) {
        leftChild = this.values[leftChildIdx];
        if (leftChild.priority < element.priority) {
          swap = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        rightChild = this.values[rightChildIdx];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < leftChild.priority)
        ) {
          swap = rightChildIdx;
        }
      }

      if (swap === null) break;
      this.values[idx] = this.values[swap];
      this.values[swap] = element;
      idx = swap;
    }
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
  const numTransfers = {};
  const pq = new PriorityQueue();

  for (let node in graph) {
    distances[node] = Infinity;
    previous[node] = null;
    previousTraceId[node] = null;
    numTransfers[node] = 0;
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
          additionalCost = 1000 * (numTransfers[smallest] + 1);
        }

        const candidate =
          distances[smallest] + neighbor.weight + additionalCost;
        const nextNeighbor = neighbor.node;

        if (candidate < distances[nextNeighbor]) {
          distances[nextNeighbor] = candidate;
          previous[nextNeighbor] = smallest;
          previousTraceId[nextNeighbor] = neighbor.trace_id;
          numTransfers[nextNeighbor] =
            numTransfers[smallest] +
            (neighbor.trace_id !== previousTraceId[smallest] ? 1 : 0);
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

  const maxLength = 40;

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
  const { from, to } = req.body;

  const walkSpeed = 1.75; //  m/s

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

      const q = `
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
        (COUNT(timetables.id)) AS average_per_hour,
        (vehicles.capacity * (COUNT(timetables.id))) AS capacity_per_hour
        FROM routes 
        JOIN traces ON traces.id = routes.trace_id 
        JOIN stops ON stops.id = routes.stop_id
        JOIN vehicles ON vehicles.id = traces.vehicle_id
        LEFT JOIN timetables ON timetables.route_id = routes.id
          AND TIME_FORMAT(NOW(), '%H:%i') <= timetables.time
          AND TIME_FORMAT(DATE_ADD(NOW(), INTERVAL 1 HOUR), '%H:%i') > timetables.time
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
        ORDER BY routes.trace_id, routes.order
      `;

      const [respons] = await db.query(q);

      const groupedData = respons.reduce((acc, row) => {
        const traceId = row.trace_id;

        if (!acc[traceId]) {
          acc[traceId] = {
            trace_id: traceId,
            routes: [],
          };
        }

        acc[traceId].routes.push({
          route_id: row.route_id,
          order: row.order,
          stop_id: row.stop_id,
          trace_id: row.trace_id,
          stop_from: row.stop_from,
          stop_end: row.stop_end,
          longitude: row.longitude,
          latitude: row.latitude,
          number_of_stop: row.number_of_stop,
          stop_name: row.stop_name,
          route: row.route,
          type: row.type,
          capacity: row.capacity,
          count_timetables: row.count_timetables,
          average_per_hour: row.average_per_hour,
          capacity_per_hour: row.capacity_per_hour,
        });

        return acc;
      }, {});

      const resultArray = Object.values(groupedData);

      const all = [];

      resultArray.forEach((el) => {
        const sorted = el.routes.sort((a, b) => a.order - b.order);
        all.push(sorted);
      });

      const allDone = [];

      for (const item of all) {
        const coord = await getOnlyDistances(item);
        if (coord != null && coord.length > 0) {
          allDone.push(coord);
        }
      }

      let graph = createGraph(allDone);
      let cleanedGraph = removeDuplicateEdges(graph);

      const maxWeightThreshold = 15000;
      cleanedGraph = removeEdgesAboveThreshold(
        cleanedGraph,
        maxWeightThreshold
      );

      console.log("zaczynam dijkstra");
      await findNearestStop(from, to, cleanedGraph);
      console.log("skonczylem!");

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

        const dataToRd2 = dataToRd.filter((el) => {
          let count = 0;
          el.forEach((el2) => {
            if (el2.type == "Pieszo") {
              count++;
            }
          });

          if (count - 2 < 5) {
            return el;
          }
        });

        const dataToRd3 = [];

        dataToRd2.forEach((el) => {
          const arr = [];
          let x = 0;

          while (x < el.length) {
            const current = el[x];
            const next = el[x + 1];

            if (current.type === "Pieszo" && next && next.type === "Pieszo") {
              arr.push({
                type: "Pieszo",
                data: [
                  {
                    ride: false,
                    type: "Pieszo",
                    longitude: current.data[0].longitude,
                    latitude: current.data[0].latitude,
                    latFrom: current.data[0].latFrom,
                    latTo: next.data[0].latTo,
                    lonFrom: current.data[0].lonFrom,
                    lonTo: next.data[0].lonTo,
                  },
                ],
              });

              x += 2;
            } else {
              arr.push(current);
              x++;
            }
          }

          dataToRd3.push(arr);
        });

        const dataToRd4 = [];

        dataToRd3.forEach((el) => {
          let count = 0;
          el.forEach((el2) => {
            if (el2.type == "Pieszo") {
              count++;
            }
          });

          if (count - 2 <= 2) {
            dataToRd4.push(el);
          }
        });


        const arrToReturn = [];

        for (const el of dataToRd4) {
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
                  let tDelay = number_of_signals * d;

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
                totalTram: totalTram,
              },
            },
          });
        });

        dToReturn.forEach((el) => {
          let count = 0;
          el.arr.forEach((el2, index) => {
            if (el2.type == "Pieszo") {
              count++;
            }

            if (index > 0) {
              if (el.arr[index - 1].type == "Pieszo") {
                count--;
              }
            }
          });
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
