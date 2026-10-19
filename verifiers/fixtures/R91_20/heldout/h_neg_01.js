const express = require("express");
const { auth, requiresAuth } = require("express-openid-connect");

const app = express();

app.use(
  auth({
    authRequired: false,
    issuerBaseURL: "https://my-tenant.us.auth0.com",
    baseURL: "http://localhost:3000",
    clientID: process.env.AUTH0_CLIENT_ID,
    secret: process.env.SESSION_SECRET,
  }),
);

app.get("/profile", requiresAuth(), (req, res) => res.json(req.oidc.user));

app.listen(3000);
