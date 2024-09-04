import { db } from "../config/db-config.js";
import { getTimeDifferenceInMinutes } from "../functions.js";

export const getTraces = async (req, res) => {
  const { id } = req.params;

  const query = "SELECT * FROM traces WHERE vehicle_id = ?";

  try {
    const [result] = await db.query(query, [id]);

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

export const getRouteByTraceId = async (req, res) => {
  const { id } = req.params;

  const query =
    "SELECT routes.*, stops.longitude, stops.latitude FROM routes LEFT JOIN stops ON routes.stop_id = stops.id WHERE routes.trace_id = ? ORDER BY routes.`order` ASC";

  try {
    const [result] = await db.query(query, [id]);

    const routes = [];

    for (const item of result) {
      const query2 =
        "SELECT * FROM timetables WHERE route_id = ? AND stop_id = ? ORDER BY `order` ASC";

      const [result2] = await db.query(query2, [item.id, item.stop_id]);

      routes.push({
        ...item,
        timetables: result2,
      });
    }

    const routesNew = [];

    const startTime = routes
      .find((el) => el.order == 0)
      .timetables.find((el) => el.order == 0);

    for (let x = 0; x < routes.length; x++) {
      if (x >= 1) {
        const timePrev = routes[x - 1].timetables.find((el) => el.order == 0);
        const timeActual = routes[x].timetables.find((el) => el.order == 0);

        if (timePrev == undefined || timeActual == undefined) {
          res.status(500).json("Bad!");
          return;
        }

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

    res.status(200).json(routesNew);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
