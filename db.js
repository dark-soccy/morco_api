const sql = require("mssql");

const dbHost = (process.env.DB_SERVER || process.env.DB_HOST || "").trim();
const dbName = (process.env.DB_NAME || process.env.DB_DATABASE || "").trim();
const dbUser = (process.env.DB_USER || "").trim();
const dbPort = Number.parseInt(process.env.DB_PORT || "1433", 10);
const connectionTimeout = Number.parseInt(
  process.env.DB_CONNECTION_TIMEOUT_MS || "30000",
  10,
);
const requestTimeout = Number.parseInt(
  process.env.DB_REQUEST_TIMEOUT_MS || "30000",
  10,
);

if (!dbUser || !dbName || !dbHost) {
  throw new Error(
    "Database environment variables (DB_USER, DB_NAME/DB_DATABASE, DB_SERVER/DB_HOST) are not defined.",
  );
}

const config = {
  user: dbUser,
  password: process.env.DB_PASSWORD,
  server: dbHost,
  database: dbName,
  port: Number.isNaN(dbPort) ? 1433 : dbPort,
  connectionTimeout: Number.isNaN(connectionTimeout)
    ? 30000
    : connectionTimeout,
  requestTimeout: Number.isNaN(requestTimeout) ? 30000 : requestTimeout,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config).connect();

function buildQueryWithNamedParams(query, params) {
  let index = 0;
  const transformedQuery = query.replace(/\?/g, () => {
    const name = `@p${index}`;
    index += 1;
    return name;
  });

  if (index !== params.length) {
    throw new Error(
      `Parameter count mismatch: query expects ${index}, received ${params.length}.`,
    );
  }

  return transformedQuery;
}

async function query(queryText, params = []) {
  const pool = await poolPromise;
  const request = pool.request();

  params.forEach((value, index) => {
    request.input(`p${index}`, value);
  });

  const finalQuery = buildQueryWithNamedParams(queryText, params);
  const result = await request.query(finalQuery);
  return [result.recordset || [], result];
}

module.exports = { query };
