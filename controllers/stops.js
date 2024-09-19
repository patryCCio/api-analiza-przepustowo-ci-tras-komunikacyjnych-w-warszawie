import { db } from "../config/db-config.js";
import { isPointInPolygon } from "../functions.js";

export const getStops = async (req, res) => {
  const { districts } = req.body;

  const query = "SELECT * FROM stops WHERE stops.type IS NOT NULL";

  try {
    const [result] = await db.query(query);

    const stopsRd = [];

    result.forEach((el) => {
      const point = { latitude: el.latitude, longitude: el.longitude };

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

      stopsRd.push({
        ...el,
        ...districtInfo,
      });
    });

    const districtCount = stopsRd.reduce((acc, stop) => {
      const district = stop.district_name;

      if (acc[district]) {
        acc[district]++;
      } else {
        acc[district] = 1;
      }

      return acc;
    }, {});

    const districtsInfo = [];

    districts.forEach((el) => {
      const count = districtCount[el.name];

      districtsInfo.push({
        ...el,
        count_of_stops_in_district: count,
      });
    });

    const stopsToRet = [];

    stopsRd.forEach((el) => {
      districtsInfo.forEach((el2) => {
        if (el.district_name == el2.name) {
          stopsToRet.push({
            ...el,
            avgArea: el,
          });
        }
      });
    });
    res.status(200).json(stopsToRet);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

export const getVehicles = async (req, res) => {
  const { id } = req.params;

  const query = "SELECT * FROM routes WHERE stop_id = ?";

  try {
    const [result] = await db.query(query, [id]);

    let array = [];

    for (const item of result) {
      const query2 = "SELECT * FROM traces WHERE id = ?";

      const [result2] = await db.query(query2, [item.trace_id]);
      array.push(result2[0]);
    }

    let ready = [];

    for (const item of array) {
      const query3 = "SELECT * FROM vehicles WHERE id = ?";

      const [result3] = await db.query(query3, [item.vehicle_id]);

      ready.push({
        ...result3[0],
        trace_id: item.id,
      });
    }

    res.status(200).json(ready);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
