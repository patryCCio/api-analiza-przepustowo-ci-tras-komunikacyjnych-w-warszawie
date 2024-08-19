import { db } from "../config/db-config.js";
import { getTimeDifferenceInMinutes } from "../functions.js";

export const getAllData = async (req, res) => {
  const { vehicle_id } = req.params;

  try {
    const query = "SELECT * FROM traces WHERE vehicle_id = ?";
    const [result] = await db.query(query, [vehicle_id]);

    const array = [];

    for (const item of result) {
      const query2 =
        "SELECT routes.*, stops.longitude, stops.latitude FROM routes LEFT JOIN stops ON routes.stop_id = stops.id WHERE routes.trace_id = ? ORDER BY routes.`order` ASC";

      const routes = [];

      const [result2] = await db.query(query2, [item.id]);

      for (const item2 of result2) {
        const query3 =
          "SELECT * FROM timetables WHERE route_id = ? AND stop_id = ? ORDER BY `order` ASC";

        const [result3] = await db.query(query3, [item2.id, item2.stop_id]);

        routes.push({
          ...item2,
          timetables: result3,
        });
      }

      const routesNew = [];

      for (let x = 0; x < routes.length; x++) {
        const startTime = routes
          .find((el) => el.order == 0)
          .timetables.find((el) => el.order == 0);

        if (x >= 1) {
          const timePrev = routes[x - 1].timetables.find((el) => el.order == 0);
          const timeActual = routes[x].timetables.find((el) => el.order == 0);

          const timeDifference = await getTimeDifferenceInMinutes(
            timePrev.time,
            timeActual.time
          );

          const timeDifferenceZero = await getTimeDifferenceInMinutes(
            startTime.time,
            timeActual.time
          );

          routesNew.push({
            ...routes[x],
            timeFromPrev: parseInt(timeDifference),
            timeFromZero: parseInt(timeDifferenceZero),
          });
        } else {
          routesNew.push({
            ...routes[x],
            timeFromPrev: parseInt(0),
          });
        }
      }

      array.push({
        ...item,
        routes: routesNew,
      });
    }

    res.status(200).json(array);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

export const getAllDataForOneTrace = async (req, res) => {
  const { trace_id } = req.params;

  try {
    const query = "SELECT * FROM traces WHERE id = ?";
    const [result] = await db.query(query, [trace_id]);

    const trace = result[0];

    const query2 =
      "SELECT * FROM routes WHERE trace_id = ? ORDER BY `order` ASC";

    const [result2] = await db.query(query2, [trace_id]);

    const routes = [];

    for (const item2 of result2) {
      const query3 =
        "SELECT * FROM timetables WHERE route_id = ? AND stop_id = ? ORDER BY `order` ASC";

      const [result3] = await db.query(query3, [item2.id, item2.stop_id]);

      routes.push({
        ...item2,
        timetables: result3,
      });
    }

    const ready = {
      ...trace,
      routes: routes,
    };

    res.status(200).json(ready);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

export const getTimetables = async (req, res) => {
  const { data } = req.body;

  try {
    let result = [];
    for (const item of data) {
      const query =
        "SELECT * FROM timetables WHERE stop_id = ? AND route_id = ? ORDER BY `order` ASC";
      const [rows] = await db.query(query, [item.stop_id, item.id]);

      result.push({
        ...item,
        timetables: rows,
      });
    }
    res.status(200).json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

export const getTimetablesByRouteAndStopId = async (req, res) => {
  const { route_id, stop_id } = req.params;

  try {
    const query =
      "SELECT * FROM timetables WHERE route_id = ? and stop_id = ? ORDER BY `order` ASC";

    const [result] = await db.query(query, [route_id, stop_id]);

    res.status(200).json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
