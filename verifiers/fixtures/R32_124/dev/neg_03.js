const { Pool } = require("pg");

const InitDatabase = async (url) => {
  const pool = new Pool({ connectionString: url });
  await pool.query("SELECT 1");
  return pool;
};

module.exports = { InitDatabase };
