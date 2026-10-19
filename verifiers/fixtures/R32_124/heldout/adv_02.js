const express = require("express");

module.exports.initRoutes = function (app) {
  const router = express.Router();
  router.get("/status", (req, res) => res.send("up"));
  app.use(router);
};
