import { db } from "../config/db-config.js";
import { sortLines } from "../functions.js";

export const getVehicles = async (req, res) => {
  const query = "SELECT * FROM vehicles";

  try {
    const [result] = await db.query(query);

    const sortedLines = sortLines(result);

    res.status(200).json(sortedLines);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};
