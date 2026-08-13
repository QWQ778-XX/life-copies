const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const storage = require("./storage.js");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

let copies = [];

storage
  .loadCopies()
  .then((list) => {
    copies = list;
    console.log(
      `已加载 ${copies.length} 个副本（${storage.useUpstash ? "Upstash 云存储" : "本地 JSON 文件"}）`
    );
  })
  .catch((e) => {
    console.error("loadCopies failed:", e.message);
  });

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function publicSummary(c) {
  return {
    id: c.id,
    title: c.title,
    author: c.author,
    description: c.description,
    coverColor: c.coverColor,
    createdAt: c.createdAt,
    stats: c.config && c.config.stats ? Object.keys(c.config.stats) : [],
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  try {
    // ---- API ----
    if (pathname === "/api/copies" && req.method === "GET") {
      return sendJSON(res, 200, copies.map(publicSummary));
    }

    if (pathname === "/api/copies" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)) || "{}");
      if (!body.title || !body.config) {
        return sendJSON(res, 400, { error: "缺少标题或配置" });
      }
      const copy = {
        id: crypto.randomUUID(),
        title: String(body.title),
        author: String(body.author || "匿名"),
        description: String(body.description || ""),
        coverColor: String(body.coverColor || "#5b7fa6"),
        createdAt: Date.now(),
        config: body.config,
      };
      copies.unshift(copy);
      await storage.saveCopies(copies);
      return sendJSON(res, 201, copy);
    }

    const m = pathname.match(/^\/api\/copies\/([^/]+)$/);
    if (m) {
      const id = m[1];
      const idx = copies.findIndex((c) => c.id === id);
      if (idx === -1) return sendJSON(res, 404, { error: "副本不存在" });

      if (req.method === "GET") return sendJSON(res, 200, copies[idx]);

      if (req.method === "PUT") {
        const body = JSON.parse((await readBody(req)) || "{}");
        const old = copies[idx];
        copies[idx] = {
          id: old.id,
          title: String(body.title || old.title),
          author: String(body.author || old.author),
          description: String(body.description ?? old.description),
          coverColor: String(body.coverColor || old.coverColor),
          createdAt: old.createdAt,
          config: body.config || old.config,
        };
        await storage.saveCopies(copies);
        return sendJSON(res, 200, copies[idx]);
      }

      if (req.method === "DELETE") {
        copies.splice(idx, 1);
        await storage.saveCopies(copies);
        return sendJSON(res, 200, { ok: true });
      }
    }

    // ---- Static ----
    let rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    let filePath = path.normalize(path.join(PUBLIC, rel));
    if (!filePath.startsWith(PUBLIC)) return sendJSON(res, 403, { error: "forbidden" });

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC, "index.html");
    }
    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": content.length,
    });
    res.end(content);
  } catch (e) {
    console.error("server error:", e);
    sendJSON(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`人生副本服务已启动: http://localhost:${PORT}`);
});
