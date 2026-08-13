const crypto = require("crypto");
const storage = require("./storage-impl.js");

let copies = [];

storage
  .loadCopies()
  .then((list) => {
    copies = list;
    console.log(`loaded ${copies.length} copies (${storage.useUpstash ? "upstash" : "local json"})`);
  })
  .catch((e) => {
    console.error("loadCopies failed:", e.message);
  });

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

async function list() {
  return copies.map(publicSummary);
}

async function create(payload) {
  const body = payload || {};
  if (!body.title || !body.config) {
    return { error: "缺少标题或配置" };
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
  return copy;
}

async function get(id) {
  return copies.find((c) => c.id === id) || null;
}

async function update(id, payload) {
  const idx = copies.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const body = payload || {};
  const old = copies[idx];
  const copy = {
    id: old.id,
    title: String(body.title || old.title),
    author: String(body.author || old.author),
    description: String(body.description ?? old.description),
    coverColor: String(body.coverColor || old.coverColor),
    createdAt: old.createdAt,
    config: body.config || old.config,
  };
  copies[idx] = copy;
  await storage.saveCopies(copies);
  return copy;
}

async function remove(id) {
  const idx = copies.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  copies.splice(idx, 1);
  await storage.saveCopies(copies);
  return true;
}

module.exports = { list, create, get, update, remove };
