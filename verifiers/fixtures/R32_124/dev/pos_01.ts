import express, { Express } from "express";

function InitializeHandlers(app: Express): void {
  app.get("/health", (_req, res) => res.send("ok"));
  app.post("/echo", (req, res) => res.json(req.body));
}

function InitializeMiddleware(app: Express): void {
  app.use(express.json());
}

export function createServer(): Express {
  const app = express();
  InitializeMiddleware(app);
  InitializeHandlers(app);
  return app;
}
