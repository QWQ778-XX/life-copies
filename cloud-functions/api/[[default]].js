import express from "express";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("./server-impl.js");

const app = express();

// EdgeOne 会把函数目录前缀（/api）剥掉后再交给 Express 框架，
// 这里把前缀补回来，保证 server-impl 里以 /api 开头的路由能命中。
app.use((req, res) => {
  if (!req.url.startsWith("/api")) {
    req.url = "/api" + req.url;
  }
  return handler(req, res);
});

export default app;
