import express from "express";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const marker = require("./copies-api.js");

const app = express();
const P = (p) => [p, "/api" + p];

app.get(P("/ping"), (req, res) => {
  res.json({ pong: true, hasApi: typeof marker.list === "function", now: Date.now() });
});

export default app;
