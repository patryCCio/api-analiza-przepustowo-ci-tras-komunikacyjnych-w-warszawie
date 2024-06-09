import { getConnection } from "../config/db-config.js";

export const getTimetableInfoAll = async (req, res) => {
  const { table } = req.params;

  var db = getConnection();

  const q = `SELECT * FROM ${table}`;
  db.connect(async (errC) => {
    if (!errC) {
      try {
        db.query(q, [table], (err, result) => {
          if (err) {
            res.status(500).json(err);
          }
          res.status(200).json(result);
        });
      } catch (error) {
        res.status(500).json(error);
      }
      db.end();
    }
  });
};

export const getStops = async (req, res) => {
  var db = getConnection();

  const q = `SELECT * FROM stops`;
  db.connect(async (errC) => {
    if (!errC) {
      try {
        db.query(q, (err, result) => {
          if (err) {
            res.status(500).json(err);
          }

          const data = result.map((el) => {
            const lat = el.latitude.replace(",", ".");
            const lon = el.longitude.replace(",", ".");

            return {
              ...el,
              longitude: parseFloat(lon),
              latitude: parseFloat(lat),
            };
          });

          res.status(200).json(data);
        });
      } catch (error) {
        res.status(500).json(error);
      }
      db.end();
    }
  });
};

export const getTimetableInfoById = async (req, res) => {
  const { table, id } = req.params;
  var db = getConnection();

  const q = `SELECT * FROM ${table} WHERE id = ${id}`;
  db.connect(async (errC) => {
    if (!errC) {
      try {
        db.query(q, [table, id], (err, result) => {
          if (err) {
            res.status(500).json(err);
          }
          res.status(200).json(result);
        });
      } catch (error) {
        res.status(500).json(error);
      }
      db.end();
    }
  });
};

export const getVehicles = async (req, res) => {
  var db = getConnection();
  const q = "SELECT * FROM vehicles";
  db.connect(async (errC) => {
    if (!errC) {
      try {
        db.query(q, (err, result) => {
          if (err) {
            res.status(500).json(err);
          }

          res.status(200).json(result);
        });
      } catch (error) {
        res.status(500).json(error);
      }
      db.end();
    }
  });
};

export const getRoutesByVehicle = async (req, res) => {
  const { id } = req.params;

  var db = getConnection();

  const q = `SELECT * FROM routes 
  LEFT JOIN vehicles ON vehicles.id = routes.vehicle_id 
  LEFT JOIN stops ON stops.id = routes.stop_id
  WHERE vehicles.id = ${id}`;
  db.connect(async (errC) => {
    if (!errC) {
      try {
        db.query(q, (err, result) => {
          if (err) {
            res.status(500).json(err);
          }
          const duplicates = findDuplicatesByParams(result, [
            "direction_route",
          ]);

          const route1 = [];
          const route2 = [];

          result.forEach((el) => {
            duplicates.forEach((el2, index) => {
              if (el.direction_route == el2.direction_route) {
                if (index == 0) {
                  route1.push(el);
                } else {
                  route2.push(el);
                }
              }
            });
          });

          route1.sort((a, b) => a.order - b.order);
          route2.sort((a, b) => a.order - b.order);

          res.status(200).json({ route1, route2 });
        });
      } catch (error) {
        res.status(500).json(error);
      }
      db.end();
    }
  });
};

const findDuplicatesByParams = (data, params) => {
  const itemMap = new Map();
  const duplicates = [];

  data.forEach((item) => {
    const key = params.map((param) => item[param]).join("|");

    if (itemMap.has(key)) {
      const existingItem = itemMap.get(key);
      existingItem.count += 1;
    } else {
      itemMap.set(key, { ...item, count: 1 });
    }
  });
  itemMap.forEach((value) => {
    if (value.count > 1) {
      duplicates.push(value);
    }
  });

  return duplicates;
};
const removeDuplicatesByParams = (data, params) => {
  const itemMap = new Map();

  data.forEach((item) => {
    const key = params.map((param) => item[param]).join("|");

    if (itemMap.has(key)) {
      const existingItem = itemMap.get(key);
      existingItem.count += 1;
    } else {
      itemMap.set(key, { ...item, count: 1 });
    }
  });

  const uniqueItems = [];
  itemMap.forEach((value) => {
    if (value.count === 1) {
      delete value.count;
      uniqueItems.push(value);
    }
  });

  return uniqueItems;
};

export const getRoutesByStop = async (req, res) => {
  const { id } = req.params;

  var db = getConnection();

  const q = `SELECT * FROM routes 
  LEFT JOIN vehicles ON vehicles.id = routes.vehicle_id 
  LEFT JOIN stops ON stops.id = routes.stop_id
  WHERE stops.id = ${id}`;
  db.connect(async (errC) => {
    if (!errC) {
      try {
        db.query(q, (err, result) => {
          if (err) {
            res.status(500).json(err);
          }
          const duplicates = findDuplicatesByParams(result, ["route"]);
          const removedDuplicates = removeDuplicatesByParams(result, ["route"]);

          const array = [...duplicates, ...removedDuplicates];
          res.status(200).json(array);
        });
      } catch (error) {
        res.status(500).json(error);
      }
      db.end();
    }
  });
};
