import express from "express";

const app = express();
const P = (p) => [p, "/api" + p];

app.get(P("/ping"), (req, res) => {
  res.json({ pong: true, now: Date.now() });
});

export default app;
