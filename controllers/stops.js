import { db } from "../config/db-config.js";

export const getStops = async (req, res) => {
  const query = "SELECT * FROM stops";

  try {
    const [result] = await db.query(query);

    res.status(200).json(result);
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
