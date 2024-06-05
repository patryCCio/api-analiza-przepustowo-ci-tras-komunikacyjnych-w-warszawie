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
