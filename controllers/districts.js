import { getConnection } from "../config/db-config.js";

export const getDistrictsInfo = (req, res) => {
  var db = getConnection();

  const q = `SELECT * FROM districts LEFT JOIN districts_geo ON districts.id = districts_geo.district_id`;
  db.connect(async (errC) => {
    if (!errC) {
      try {
        db.query(q, (err, result) => {
          if (err) {
            res.status(500).json(err);
          }

          const array = [];
          for (let x = 0; x < result.length; x++) {
            let isDistrict = false;
            array.forEach((arr) => {
              if (arr.name == result[x].name) {
                isDistrict = true;
              }
            });

            if (!isDistrict) {
              const pLat = result[x].pin_latitude.replace(",", ".");
              const pLon = result[x].pin_longitude.replace(",", ".");
              array.push({
                id: result[x].district_id,
                name: result[x].name,
                pin_latitude: parseFloat(pLat),
                pin_longitude: parseFloat(pLon),
                population_density: result[x].population_density,
                update_date: result[x].update_date,
                warsaw_population: result[x].warsaw_population,
              });
            }
          }

          const arrayToReturn = [];

          for (let x = 0; x < array.length; x++) {
            const array2 = [];
            result.forEach((el, index) => {
              if (el.district_id == array[x].id) {
                const latitude = el.latitude.replace(",", ".");
                const longitude = el.longitude.replace(",", ".");

                array2.push({
                  latitude: parseFloat(latitude),
                  longitude: parseFloat(longitude),
                });
              }
            });

            arrayToReturn.push({
              id: array[x].id,
              name: array[x].name,
              pin_latitude: parseFloat(array[x].pin_latitude),
              pin_longitude: parseFloat(array[x].pin_longitude),
              population_density: array[x].population_density,
              update_date: array[x].update_date,
              warsaw_population: array[x].warsaw_population,
              border_coords: array2,
            });
          }

          res.status(200).json(arrayToReturn);
        });
      } catch (error) {
        res.status(500).json(error);
      }
      db.end();
    }
  });
};

export const getDistrictInfoById = (req, res) => {
  const { id } = req.params;

  var db = getConnection();

  const q = `SELECT * FROM districts LEFT JOIN districts_geo ON districts.id = districts_geo.district_id WHERE districts.id = ${id}`;
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
