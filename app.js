const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("server Running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error :${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertStateObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//get all states API
app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
    SELECT 
      *
    FROM 
      state;`;
  const statesArray = await db.all(getAllStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStateObjectToResponseObject(eachState)
    )
  );
});

// get state Id API
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
  SELECT
    *
    FROM 
      state
    WHERE
      state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertStateObjectToResponseObject(state));
});

//get districtId API
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
  SELECT
    *
  FROM
    district
  WHERE
    district_id = ${districtId};`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictObjectToResponseObject(district));
});

//post district API
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const postDistrictQuery = `
  INSERT INTO 
     district(state_id,district_name,cases,cured,active,deaths)
    VALUES
        (${stateId},'${districtName}','${cases}',${cured},${active},${deaths});`;
  const newDistrict = await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});

//DELETE API QUERY
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
    DELETE FROM 
        district
    WHERE
        district_id = ${districtId};`;
  await db.run(deleteQuery);
  response.send("District Removed");
});

//update db with put API

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;

  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const districtUpdateQuery = `
    UPDATE district
        SET
            district_name = '${districtName}',
            state_id = '${stateId}',
            cases = '${cases}',
            cured = '${cured}',
            active = '${active}',
            deaths = '${deaths}'
        WHERE
            district_id = ${districtId};`;

  await db.run(districtUpdateQuery);
  response.send("District Details Updated");
});

// state stats api
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
  SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
  FROM
    district
  WHERE
    state_id = ${stateId};`;
  const stateData = await db.get(getStatsQuery);
  response.send({
    totalCases: stateData["SUM(cases)"],
    totalCured: stateData["SUM(cured)"],
    totalActive: stateData["SUM(active)"],
    totalDeaths: stateData["SUM(deaths)"],
  });
});

//get state name api using district id api-8
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
  SELECT
    state_id
  FROM
    district
  WHERE
    district_id = ${districtId};`;
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery);

  const getStateNameQuery = `SELECT state_name as stateName FROM state
  WHERE state_id = ${getDistrictIdQueryResponse.state_id}`;

  const stateName = await db.get(getStateNameQuery);
  response.send(stateName);
});

module.exports = app;
