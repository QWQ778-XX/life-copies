/* 人生副本 - 游戏引擎 */

function clamp(v, min, max) {
  if (v === undefined || v === null || isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function parseEffects(text) {
  // "金钱:100\n健康:-5" 或 "金钱:100, 健康:-5"
  const effects = {};
  if (!text) return effects;
  const parts = String(text).split(/[,，\n;；]/);
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const m = part.match(/^([^:：=]+)\s*[:：=]\s*(-?\d+(?:\.\d+)?)$/);
    if (m) effects[m[1].trim()] = parseFloat(m[2]);
  }
  return effects;
}

function effectsToText(effects) {
  if (!effects) return "";
  return Object.entries(effects)
    .map(([k, v]) => `${k}:${v > 0 ? "+" : ""}${v}`)
    .join("\n");
}

function evalOneCondition(expr, stats) {
  const m = String(expr).match(/^([^\s<>!=]+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return false;
  const stat = m[1].trim();
  const op = m[2];
  const val = parseFloat(m[3]);
  const s = stats[stat];
  if (s === undefined || s === null) return false;
  switch (op) {
    case ">=": return s >= val;
    case "<=": return s <= val;
    case "==": return s === val;
    case "!=": return s !== val;
    case ">": return s > val;
    case "<": return s < val;
    default: return false;
  }
}

function evalCondition(cond, stats) {
  if (!cond || !String(cond).trim()) return true;
  const orParts = String(cond).split("||");
  return orParts.some((orPart) => {
    const andParts = orPart.split("&&");
    return andParts.every((p) => evalOneCondition(p.trim(), stats));
  });
}

class LifeGame {
  constructor(copy) {
    const c = copy.config || {};
    this.copy = copy;
    this.name = c.name || "你";
    this.startAge = Number(c.startAge) || 0;
    this.maxAge = Number(c.maxAge) || 80;
    this.year0 = Number(c.year0) || 1970;
    this.background = c.background || "";
    this.statMeta = c.statMeta || {};
    this.freeActions = Array.isArray(c.freeActions) ? c.freeActions : [];
    this.events = Array.isArray(c.events) ? c.events : [];
    this.endings = Array.isArray(c.endings) ? c.endings : [];

    this.stats = {};
    for (const [k, v] of Object.entries(c.stats || {})) this.stats[k] = Number(v) || 0;
    this.age = this.startAge;
    this.year = this.year0 + (this.age - this.startAge);
    this.log = [];
    this.history = [{ age: this.age, year: this.year, stats: { ...this.stats } }];
    this.over = false;
    this.endReason = "";
    this.achievedEndings = [];
    this.usedOnce = new Set();
  }

  pushLog(text, kind = "") {
    this.log.push({ age: this.age, year: this.year, text, kind });
  }

  applyEffects(effects) {
    for (const [k, delta] of Object.entries(effects || {})) {
      if (this.stats[k] === undefined) continue;
      const meta = this.statMeta[k] || {};
      const min = meta.min === undefined ? 0 : Number(meta.min);
      const max = meta.max === undefined ? 999999 : Number(meta.max);
      this.stats[k] = clamp(this.stats[k] + (Number(delta) || 0), min, max);
    }
    this.pushLog("状态变化：" + Object.entries(effects || {})
      .map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`)
      .join("，"));
  }

  randomDrift() {
    for (const k of Object.keys(this.stats)) {
      if (k === "金钱") continue;
      const meta = this.statMeta[k] || {};
      const min = meta.min === undefined ? 0 : Number(meta.min);
      const max = meta.max === undefined ? 100 : Number(meta.max);
      const drift = Math.floor(Math.random() * 5) - 2; // -2..2
      this.stats[k] = clamp(this.stats[k] + drift, min, max);
    }
  }

  availableEvents() {
    const out = [];
    for (const ev of this.events) {
      const chance = ev.chance === undefined || ev.chance === null ? 1 : Number(ev.chance);
      const ageOk = ev.age === undefined || ev.age === null || ev.age === "" || Number(ev.age) === this.age;
      const onceOk = !ev.once || !this.usedOnce.has(ev.id);
      const condOk = evalCondition(ev.condition, this.stats);
      if (ageOk && onceOk && condOk && Math.random() <= chance) {
        out.push(ev);
      }
    }
    return out;
  }

  resolveEvent(ev, choiceIndex) {
    this.usedOnce.add(ev.id);
    const choice = (ev.choices || [])[choiceIndex];
    if (choice) {
      this.applyEffects(choice.effects);
      if (choice.log) this.pushLog(choice.log, "event");
    }
  }

  advanceYear() {
    this.age += 1;
    this.year += 1;
    if (this.age > this.maxAge) {
      this.over = true;
      this.endReason = "你走完了这一生。";
      return;
    }
    this.randomDrift();
    this.pushLog(`进入 ${this.age} 岁（${this.year} 年）`, "event");
    this.history.push({ age: this.age, year: this.year, stats: { ...this.stats } });
    this.checkEnd();
  }

  doFreeAction(action) {
    this.applyEffects(action.effects);
    if (action.log) this.pushLog(action.log, "event");
  }

  checkEnd() {
    const health = this.stats["健康"];
    if (health !== undefined && health <= 0) {
      this.over = true;
      this.endReason = "你的健康耗尽了，人生戛然而止。";
      return;
    }
    for (const end of this.endings) {
      if (this.achievedEndings.includes(end.id)) continue;
      if (evalCondition(end.condition, this.stats)) {
        this.achievedEndings.push(end.id);
        this.pushLog(`达成结局「${end.name}」：${end.text || ""}`, "ending");
      }
    }
  }

  chartData() {
    const keys = Object.keys(this.stats);
    const meta = this.statMeta;
    const rows = this.history.map((h) => {
      const row = { age: h.age, year: h.year };
      for (const k of keys) {
        const m = meta[k] || {};
        const max = m.max === undefined ? 100 : Number(m.max);
        const min = m.min === undefined ? 0 : Number(m.min);
        row[k] = clamp(h.stats[k], min, max);
        row["_" + k] = max - min === 0 ? 0.5 : (row[k] - min) / (max - min);
      }
      return row;
    });
    return { keys, rows };
  }
}

function drawChart(canvas, game) {
  const { keys, rows } = game.chartData();
  if (!keys.length || rows.length < 1) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 400;
  const H = canvas.clientHeight || 180;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const padL = 34, padR = 10, padT = 12, padB = 22;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const colors = ["#b07b4a", "#5f8f5a", "#4a6fa5", "#b0524a", "#8b6fb0", "#3c8d8d", "#c08a3e", "#6b7280"];

  ctx.strokeStyle = "#e5ddcc";
  ctx.fillStyle = "#8a8276";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = padT + (ih * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.fillText(String((4 - i) * 25) + "%", padL - 6, y + 4);
  }

  const n = rows.length;
  const xOf = (i) => padL + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  keys.forEach((k, ki) => {
    const color = colors[ki % colors.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    rows.forEach((r, i) => {
      const x = xOf(i);
      const y = padT + ih * (1 - r["_" + k]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  ctx.fillStyle = "#8a8276";
  ctx.textAlign = "center";
  if (n > 1) {
    const step = Math.max(1, Math.floor(n / 8));
    for (let i = 0; i < n; i += step) {
      ctx.fillText(rows[i].age + "岁", xOf(i), H - 6);
    }
    ctx.fillText(rows[n - 1].age + "岁", xOf(n - 1), H - 6);
  } else {
    ctx.fillText(rows[0].age + "岁", W / 2, H - 6);
  }

  ctx.textAlign = "left";
  let lx = padL;
  keys.forEach((k, ki) => {
    ctx.fillStyle = colors[ki % colors.length];
    ctx.fillRect(lx, 4, 10, 10);
    ctx.fillText(k, lx + 14, 13);
    lx += 14 + ctx.measureText(k).width + 16;
  });
}
