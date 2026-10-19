import express from "npm:express@4";

export { default as cors } from "cors";

const app = express();
app.get("/health", (_req, res) => res.send("ok"));
export default app;
