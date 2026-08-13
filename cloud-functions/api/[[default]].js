import express from "express";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const api = require("./copies-api.js");

const app = express();
app.use(express.json({ limit: "5mb" }));

// EdgeOne 会把函数目录前缀（/api）剥掉后再交给 Express，
// 这里同时注册带前缀和不带前缀两套路由，两种挂载方式都能命中。
const P = (p) => [p, "/api" + p];

app.get(P("/ping"), (req, res) => {
  res.json({ pong: true, now: Date.now() });
});

app.get(P("/diag"), async (req, res) => {
  const url = process.env.UPSTASH_REST_URL || "";
  const token = process.env.UPSTASH_REST_TOKEN ? "set" : "missing";
  let upstash = "not-tested";
  if (url) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(`${url}/get/life-copies`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REST_TOKEN}` },
        signal: ctl.signal,
      });
      clearTimeout(timer);
      upstash = "status=" + r.status;
    } catch (e) {
      upstash = "error=" + e.name + ":" + e.message;
    }
  }
  res.json({ ping: true, upstashUrl: url ? "set" : "missing", upstashToken: token, upstash });
});

app.get(P("/copies"), async (req, res) => {
  res.json(await api.list());
});

app.post(P("/copies"), async (req, res) => {
  const result = await api.create(req.body || {});
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result);
});

app.get(P("/copies/:id"), async (req, res) => {
  const copy = await api.get(req.params.id);
  if (!copy) return res.status(404).json({ error: "副本不存在" });
  res.json(copy);
});

app.put(P("/copies/:id"), async (req, res) => {
  const copy = await api.update(req.params.id, req.body || {});
  if (!copy) return res.status(404).json({ error: "副本不存在" });
  res.json(copy);
});

app.delete(P("/copies/:id"), async (req, res) => {
  const ok = await api.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: "副本不存在" });
  res.json({ ok: true });
});

app.use((req, res) => res.status(404).json({ error: "not found" }));

export default app;
