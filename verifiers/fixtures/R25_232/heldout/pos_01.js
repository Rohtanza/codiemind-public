const express = require('express');
const config = require('@/config');
const { connectDb } = require('@/db/connection');

async function start() {
  await connectDb(config.databaseUrl);
  const app = express();
  app.listen(config.port);
}

module.exports = { start };
