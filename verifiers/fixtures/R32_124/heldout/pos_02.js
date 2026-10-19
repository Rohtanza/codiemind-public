const router = require("express").Router();

module.exports.InitializeRoutes = function (app) {
  router.get("/users", (req, res) => res.json([]));
  app.use("/api", router);
};

module.exports.InitializeErrorPages = (app) => {
  app.use((req, res) => res.status(404).send("Not found"));
};
