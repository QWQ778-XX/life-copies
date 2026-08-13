/* 无限流 · 主神空间 - 前端应用 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function api(path, method = "GET", body) {
  const opt = { method, headers: {} };
  if (body !== undefined) {
    opt.headers["Content-Type"] = "application/json";
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(path, opt);
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch (e) {}
    throw new Error(msg);
  }
  return res.json();
}

function toast(msg) {
  const old = $(".toast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function openModal(html) {
  const root = $("#modal-root");
  root.innerHTML = `<div class="modal-mask"><div class="modal">${html}</div></div>`;
  const mask = $(".modal-mask", root);
  mask.addEventListener("click", (e) => {
    if (e.target === mask) closeModal();
  });
  return $(".modal", root);
}

function closeModal() {
  $("#modal-root").innerHTML = "";
}

/* ================= 玩家系统（单机存档，存本机） ================= */

const SAVE_KEY = "inf-space-player-v1";
const CORE_STATS = ["健康", "智力", "魅力", "幸运", "心情", "金钱"];

const IDENTITIES = [
  { id: "lamp", name: "执灯人", desc: "你提着灯，走过所有熄灭的夜。", bonus: { 智力: 10, 魅力: 5 } },
  { id: "dream", name: "拾梦者", desc: "你偷过很多梦，唯独不敢偷自己的。", bonus: { 魅力: 10, 健康: -5 } },
  { id: "chess", name: "观棋人", desc: "你从不入局，直到棋盘叫了你的名字。", bonus: { 健康: 10, 智力: -5 } },
  { id: "ferry", name: "引渡人", desc: "你渡人渡鬼，唯独渡不了自己。", bonus: { 健康: 5, 智力: 5, 魅力: 5 } },
  { id: "custom", name: "自定义", desc: "这个名字，由你自己落笔。", bonus: { 健康: 5, 智力: 5, 魅力: 5 } },
];

const SKILLS = {
  iron: { name: "铁壁", desc: "所有副本中受到的负面效果降低 30%", cost: 300 },
  insight: { name: "慧眼", desc: "事件选项会显示预估效果，看穿利弊", cost: 250 },
  lucky: { name: "幸运星", desc: "通关奖励 +20%，掉落道具概率提升", cost: 200 },
  startup: { name: "启程", desc: "每次进入副本，随机一项属性初始 +10", cost: 150 },
};

const ITEMS = {
  medkit: { name: "医疗包", desc: "试炼中随时使用，恢复 20 点健康", cost: 40 },
  charm: { name: "护身符", desc: "死亡时自动抵挡一次，恢复 30 点健康", cost: 80 },
};

const COMPANIONS = [
  { id: "wang", name: "棋圣·老王", line: "棋盘上赢过你三次的人，现在跟着你。", bonus: { 智力: 3 } },
  { id: "zhou", name: "睡神·小周", line: "站着也能睡着，却从不误事。", bonus: { 幸运: 3 } },
  { id: "dazhuang", name: "伙·大壮", line: "话不多，拳头很硬。", bonus: { 健康: 3 } },
  { id: "alan", name: "阿岚", line: "记住每一条路，和每一个名字。", bonus: { 魅力: 3 } },
  { id: "xiaoman", name: "小满", line: "总能在口袋里翻出有用的东西。", bonus: { 金钱: 10 } },
  { id: "aye", name: "夜行·阿夜", line: "只在你觉得害怕的时候出现。", bonus: { 心情: 3 } },
];

const LORE = [
  "「你发现每个副本的角落里，都会闪过同一个符号。那不是这个世界的东西。」",
  "「主神空间没有日出。但每次通关后，天花板上的光纹都会多出一道。」",
  "「你注意到：所有副本的背景故事里，都提到了一场『不该发生的雨』。」",
  "「一个声音在你耳边说：别相信积分。积分是枷锁，不是钥匙。」",
  "「某个副本的深夜，你听见主神空间的声音断了一瞬——那是恐惧的声音。」",
  "「你拼凑的符号指向一个坐标：地球，2007 年，某个雨夜。」",
  "「档案显示：第一个进入这里的轮回者，代号『Z』，和你来自同一座城市。」",
  "「最后一段回响亮起。你终于明白：主神空间不是神造的——是『Z』用生命换来的避难所。而『Z』，是平行世界里写下这一切的你。」",
];

function defaultPlayer() {
  return {
    v: 1,
    codeName: "轮回者",
    identity: "lamp",
    points: 0,
    totalEarned: 0,
    upgrades: {},
    skills: [],
    items: { medkit: 0, charm: 0 },
    companions: [],
    clears: {},
    shards: [],
    prologueSeen: false,
  };
}

function loadPlayer() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultPlayer();
    const p = JSON.parse(raw);
    return { ...defaultPlayer(), ...p, items: { medkit: 0, charm: 0, ...(p.items || {}) } };
  } catch (e) {
    return defaultPlayer();
  }
}

function savePlayer(p) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(p));
}

function playerLevel(p) {
  return 1 + Math.floor((p.totalEarned || 0) / 120);
}

function levelTitle(level) {
  const t = ["见习行者", "正式行者", "精英行者", "资深行者", "王牌行者", "传说行者", "神话行者"];
  return t[Math.min(level - 1, t.length - 1)] || ("行者·" + level + "阶");
}

function upgradeLevel(p, stat) {
  return Number(p.upgrades[stat]) || 0;
}

function upgradeCost(p, stat) {
  return (upgradeLevel(p, stat) + 1) * 30;
}

function identityBonus(p) {
  const id = IDENTITIES.find((i) => i.id === p.identity) || IDENTITIES[0];
  return id.bonus;
}

function companionBonuses(p) {
  const m = {};
  for (const cid of p.companions || []) {
    const c = COMPANIONS.find((x) => x.id === cid);
    if (c) for (const [k, v] of Object.entries(c.bonus)) m[k] = (m[k] || 0) + v;
  }
  return m;
}

function shardCount(p) {
  return (p.shards || []).length;
}

/* ================= 副本信息 ================= */

function copyDifficulty(copy) {
  if (copy.config && copy.config.difficulty) {
    const d = Number(copy.config.difficulty);
    if (d >= 1 && d <= 5) return Math.round(d);
  }
  const cfg = copy.config || {};
  const span = (Number(cfg.maxAge) || 80) - (Number(cfg.startAge) || 0);
  const nEvents = (cfg.events || []).length;
  const nEndings = (cfg.endings || []).length;
  let d = span >= 70 ? 4 : span >= 50 ? 3 : span >= 30 ? 2 : 1;
  if (nEvents >= 6 || nEndings >= 2) d += 1;
  if ((cfg.stats || {}).健康 !== undefined) d += 1;
  return Math.min(5, Math.max(1, d));
}

function copyMission(copy) {
  if (copy.config && copy.config.mission && String(copy.config.mission).trim()) {
    return String(copy.config.mission).trim();
  }
  const cfg = copy.config || {};
  const maxAge = Number(cfg.maxAge) || 80;
  let m = `在「${copy.title}」的世界中存活至 ${maxAge} 岁`;
  if ((cfg.endings || []).length) m += "，达成结局可获额外奖励";
  return m;
}

function copyReward(copy) {
  if (copy.config && copy.config.reward) {
    const r = Number(copy.config.reward);
    if (r >= 1) return Math.round(r);
  }
  return 15 + copyDifficulty(copy) * 25;
}

function starsHtml(n) {
  const v = Math.max(1, Math.min(5, Number(n) || 1));
  return `<span class="stars">${"★".repeat(v)}${"☆".repeat(5 - v)}</span>`;
}

function runBonusesText(p) {
  const lines = [];
  const id = IDENTITIES.find((i) => i.id === p.identity) || IDENTITIES[0];
  lines.push(`身份「${id.name}」：` + Object.entries(id.bonus).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join("，"));
  const ups = CORE_STATS.filter((s) => upgradeLevel(p, s) > 0);
  if (ups.length) lines.push("强化：每项 +" + ups.map((s) => `${s}${upgradeLevel(p, s) * 5}`).join("，"));
  const comps = (p.companions || []).map((cid) => (COMPANIONS.find((c) => c.id === cid) || {}).name).filter(Boolean);
  if (comps.length) lines.push("同行者：" + comps.join("、"));
  if ((p.skills || []).length) lines.push("技能：" + p.skills.map((s) => (SKILLS[s] || {}).name).join("、"));
  return lines;
}

/* ================= 路由 ================= */

function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "editor") {
    renderEditor(parts[1] || null);
  } else if (parts[0] === "play") {
    renderPlay(parts[1]);
  } else if (parts[0] === "instances") {
    renderInstances();
  } else {
    renderHome();
  }
  $$(".nav a").forEach((a) => {
    const nav = a.dataset.nav;
    const active =
      (parts[0] === "editor" && nav === "editor") ||
      (parts[0] === "instances" && nav === "instances") ||
      (parts[0] === "play" && nav === "instances") ||
      ((parts[0] === "" || parts[0] === "home") && nav === "home");
    a.classList.toggle("active", active);
  });
}

window.addEventListener("hashchange", route);

/* ================= 主神空间 ================= */

function clearedTotals(p) {
  let clears = 0, deaths = 0;
  for (const r of Object.values(p.clears || {})) {
    clears += r.clears || 0;
    deaths += r.deaths || 0;
  }
  return { clears, deaths };
}

async function renderHome() {
  const p = loadPlayer();
  const app = $("#app");
  const level = playerLevel(p);
  const { clears, deaths } = clearedTotals(p);
  const expIn = (p.totalEarned || 0) % 120;
  const id = IDENTITIES.find((i) => i.id === p.identity) || IDENTITIES[0];

  app.innerHTML = `
    <section class="hero">
      <div class="hero-kicker">MAIN GOD SPACE</div>
      <h1 class="hero-title">主神空间</h1>
      <p class="hero-sub">你死了。再次睁开眼时，你站在一间没有门窗的房间里。天花板上的光纹缓缓旋转，一个声音在你脑海响起：<em>「欢迎回来，轮回者。副本已就绪——活下去，或者，永远留在这里。」</em></p>
    </section>

    <section class="player-card">
      <div class="player-avatar">${esc((p.codeName || "轮").slice(0, 1))}</div>
      <div class="player-info">
        <div class="player-name">${esc(p.codeName)}
          <button class="link-btn" id="btn-rename">改名</button>
          <button class="link-btn" id="btn-identity">换身份</button>
        </div>
        <div class="player-title">${esc(id.name)} · ${levelTitle(level)} · Lv.${level}</div>
        <div class="player-stats-row">
          <span>积分 <b class="gold">${p.points}</b></span>
          <span>通关 ${clears}</span>
          <span>阵亡 ${deaths}</span>
          <span>回响 ${shardCount(p)}/${LORE.length}</span>
        </div>
      </div>
      <div class="player-exp">
        <div class="exp-label">历练 ${p.totalEarned} · 距离下一阶还需 ${120 - expIn} 积分</div>
        <div class="exp-bar"><div style="width:${(expIn / 120) * 100}%"></div></div>
      </div>
    </section>

    <section class="action-grid">
      <button class="action-card primary-card" id="act-instances"><b>进入副本</b><span>选择一个世界，完成生死试炼</span></button>
      <button class="action-card" id="act-upgrade"><b>强化自身</b><span>用积分永久提升属性</span></button>
      <button class="action-card" id="act-skills"><b>技能与道具</b><span>${esc((p.skills || []).length + " 项技能 · " + (p.items.medkit + p.items.charm) + " 件道具")}</span></button>
      <button class="action-card" id="act-lore"><b>主线回响</b><span>${shardCount(p)}/${LORE.length} · 揭开主神空间的秘密</span></button>
    </section>

    ${companionsPanel(p)}
    ${recordsPanel(p)}

    <section class="panel reset-panel">
      <button class="link-btn danger-link" id="btn-reset">重置存档</button>
      <span class="hint-text">重置后轮回者档案、积分、强化、回响将全部清空。</span>
    </section>
  `;

  $("#btn-rename").addEventListener("click", () => {
    const name = prompt("给自己取一个代号：", p.codeName);
    if (name && String(name).trim()) {
      p.codeName = String(name).trim().slice(0, 12);
      savePlayer(p);
      renderHome();
    }
  });
  $("#btn-identity").addEventListener("click", () => openIdentityModal());
  $("#act-instances").addEventListener("click", () => (location.hash = "#/instances"));
  $("#act-upgrade").addEventListener("click", () => openUpgradeModal());
  $("#act-skills").addEventListener("click", () => openSkillsItemsModal());
  $("#act-lore").addEventListener("click", () => openLoreModal());
  $("#btn-reset").addEventListener("click", () => {
    if (confirm("确定重置存档？所有轮回进度都会被清空。")) {
      localStorage.removeItem(SAVE_KEY);
      location.hash = "#/";
      renderHome();
    }
  });

  if (!p.prologueSeen) openPrologueModal();
}

function companionsPanel(p) {
  const list = (p.companions || []).map((cid) => {
    const c = COMPANIONS.find((x) => x.id === cid);
    if (!c) return "";
    return `<div class="companion-chip"><b>${esc(c.name)}</b><span>${esc(c.line)}</span>
      <i>${Object.entries(c.bonus).map(([k, v]) => `${k} +${v}`).join(" · ")}</i></div>`;
  }).join("");
  return `<section class="panel"><h3 class="panel-title">同行者 <span class="panel-sub">${(p.companions || []).length}/3</span></h3>
    ${list || `<div class="hint-text">还没有同行者。通关副本，有几率结识同路人。</div>`}
    ${list ? `<div class="hint-text">同行者在副本中提供少量属性加成。</div>` : ""}</section>`;
}

function recordsPanel(p) {
  const recs = Object.values(p.clears || {}).sort((a, b) => b.lastAt - a.lastAt).slice(0, 6);
  if (!recs.length) {
    return `<section class="panel empty-panel">还没有试炼记录。<br/>去副本库选择一个世界，活着回来。</section>`;
  }
  return `<section class="panel"><h3 class="panel-title">试炼记录</h3>
    <div class="record-list">${recs.map((r) => `
      <div class="record-row">
        <span class="record-name">${esc(r.title || "未知副本")}</span>
        <span class="record-result ${r.clears ? "ok" : "bad"}">${r.clears ? "通关 ×" + r.clears : "阵亡 ×" + r.deaths}</span>
      </div>`).join("")}
    </div></section>`;
}

/* ================= 序幕 & 身份 ================= */

function identityCardsHtml(selected) {
  return IDENTITIES.map((id) => `
    <label class="identity-card ${id.id === selected ? "selected" : ""}" data-identity="${id.id}">
      <div class="identity-head"><b>${esc(id.name)}</b>
        <span class="identity-bonus">${Object.entries(id.bonus).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(" ")}</span></div>
      <div class="identity-desc">${esc(id.desc)}</div>
      <input type="radio" name="identity" value="${id.id}" ${id.id === selected ? "checked" : ""} style="display:none" />
    </label>`).join("");
}

function openPrologueModal() {
  const modal = openModal(`
    <h2>序幕 · 醒来</h2>
    <div class="prologue-text">
      <p>你死在现实世界的那一夜，魂魄却觉得自己还活着。</p>
      <p>你被卷入无限流——主神空间。这里有很多世界，每一个，都让你觉得莫名熟悉。</p>
      <p>通关副本，收集回响。每一段回响、每一缕线索，都在为重塑真相做准备。</p>
      <p class="prologue-goal">集齐八段回响之日，才是真正的结局。</p>
    </div>
    <div class="field"><label>你的代号</label><input id="pg-name" value="${esc(loadPlayer().codeName || "轮回者")}" maxlength="12" /></div>
    <div class="field"><label>选择你的身份（影响每次进入副本的初始属性）</label></div>
    <div class="identity-list">${identityCardsHtml(loadPlayer().identity)}</div>
    <button class="primary" id="btn-pg-ok" style="width:100%">醒来，进入主神空间</button>
  `);
  $$(".identity-card", modal).forEach((card) =>
    card.addEventListener("click", () => {
      $$(".identity-card", modal).forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      $('input[name="identity"]', card).checked = true;
    })
  );
  $("#btn-pg-ok", modal).addEventListener("click", () => {
    const p = loadPlayer();
    const name = $("#pg-name", modal).value.trim() || "轮回者";
    const id = $('input[name="identity"]:checked', modal);
    p.codeName = name.slice(0, 12);
    p.identity = id ? id.value : "lamp";
    p.prologueSeen = true;
    savePlayer(p);
    closeModal();
    renderHome();
  });
}

function openIdentityModal() {
  const p = loadPlayer();
  const modal = openModal(`
    <h2>选择身份</h2>
    <p class="hint-text">皮囊只是入场券。每一次进入副本，身份都会带来固定的属性加成。</p>
    <div class="identity-list">${identityCardsHtml(p.identity)}</div>
    <button class="primary" id="btn-id-ok" style="width:100%">确认身份</button>
  `);
  $$(".identity-card", modal).forEach((card) =>
    card.addEventListener("click", () => {
      $$(".identity-card", modal).forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      $('input[name="identity"]', card).checked = true;
    })
  );
  $("#btn-id-ok", modal).addEventListener("click", () => {
    const id = $('input[name="identity"]:checked', modal);
    if (id) {
      p.identity = id.value;
      savePlayer(p);
      toast("身份已更换");
    }
    closeModal();
    renderHome();
  });
}

/* ================= 强化 / 技能 / 道具 / 回响 ================= */

function openUpgradeModal() {
  const p = loadPlayer();
  const modal = openModal(`
    <h2>强化自身</h2>
    <p class="hint-text">用积分永久强化属性，每升一级，进入副本时对应属性初始 +5。</p>
    <div class="upgrade-list">${CORE_STATS.map((s) => {
      const lv = upgradeLevel(p, s);
      const cost = upgradeCost(p, s);
      return `<div class="upgrade-row">
        <div class="upgrade-name"><b>${esc(s)}</b><span>Lv.${lv} · 入场 +${lv * 5}</span></div>
        <button data-up="${esc(s)}" ${p.points < cost ? "disabled" : ""}>升级（${cost} 积分）</button>
      </div>`;
    }).join("")}
    </div>
    <div class="modal-foot">当前积分：<b class="gold">${p.points}</b></div>
  `);
  $$("[data-up]", modal).forEach((b) =>
    b.addEventListener("click", () => {
      const p2 = loadPlayer();
      const stat = b.dataset.up;
      const cost = upgradeCost(p2, stat);
      if (p2.points < cost) return;
      p2.points -= cost;
      p2.upgrades[stat] = (Number(p2.upgrades[stat]) || 0) + 1;
      savePlayer(p2);
      openUpgradeModal();
    })
  );
}

function openSkillsItemsModal() {
  const p = loadPlayer();
  const modal = openModal(`
    <h2>技能与道具</h2>
    <h3 class="modal-h3">技能（永久持有）</h3>
    <div class="skill-list">${Object.entries(SKILLS).map(([id, s]) => {
      const owned = p.skills.includes(id);
      return `<div class="skill-card ${owned ? "owned" : ""}">
        <div class="skill-head"><b>${esc(s.name)}</b>
          ${owned ? `<span class="owned-tag">已习得</span>` : `<button data-buy-skill="${id}" ${p.points < s.cost ? "disabled" : ""}>习得（${s.cost}）</button>`}
        </div>
        <div class="skill-desc">${esc(s.desc)}</div>
      </div>`;
    }).join("")}</div>
    <h3 class="modal-h3">道具（消耗品）</h3>
    <div class="skill-list">${Object.entries(ITEMS).map(([id, it]) => {
      const n = p.items[id] || 0;
      return `<div class="skill-card">
        <div class="skill-head"><b>${esc(it.name)}</b><span class="owned-tag">持有 ${n}</span></div>
        <div class="skill-desc">${esc(it.desc)}</div>
        <button data-buy-item="${id}" ${p.points < it.cost ? "disabled" : ""}>购买（${it.cost} 积分）</button>
      </div>`;
    }).join("")}</div>
    <div class="modal-foot">当前积分：<b class="gold">${p.points}</b></div>
  `);
  $$("[data-buy-skill]", modal).forEach((b) =>
    b.addEventListener("click", () => {
      const p2 = loadPlayer();
      const id = b.dataset.buySkill;
      const s = SKILLS[id];
      if (!s || p2.skills.includes(id) || p2.points < s.cost) return;
      p2.points -= s.cost;
      p2.skills.push(id);
      savePlayer(p2);
      toast("习得技能「" + s.name + "」");
      openSkillsItemsModal();
    })
  );
  $$("[data-buy-item]", modal).forEach((b) =>
    b.addEventListener("click", () => {
      const p2 = loadPlayer();
      const id = b.dataset.buyItem;
      const it = ITEMS[id];
      if (!it || p2.points < it.cost) return;
      p2.points -= it.cost;
      p2.items[id] = (p2.items[id] || 0) + 1;
      savePlayer(p2);
      toast("获得道具「" + it.name + "」");
      openSkillsItemsModal();
    })
  );
}

function openLoreModal() {
  const p = loadPlayer();
  const modal = openModal(`
    <h2>主线回响</h2>
    <p class="hint-text">每通关一个副本，一段回响会浮现。集齐 ${LORE.length} 段，拼出主神空间的真相。</p>
    <div class="lore-list">${LORE.map((l, i) => {
      const got = (p.shards || []).length > i;
      return `<div class="lore-card ${got ? "got" : "locked"}">
        <div class="lore-index">回响 ${String(i + 1).padStart(2, "0")}${got ? "" : " · 未获得"}</div>
        ${got ? `<div class="lore-text">${esc(l)}</div>` : `<div class="lore-text locked-text">？？？？？？</div>`}
      </div>`;
    }).join("")}</div>
    <button id="btn-replay-prologue" class="link-btn" style="margin-top:12px">重看序幕</button>
  `);
  $("#btn-replay-prologue", modal).addEventListener("click", () => {
    closeModal();
    openPrologueModal();
  });
}

/* ================= 副本库 ================= */

async function renderInstances() {
  const p = loadPlayer();
  const app = $("#app");
  app.innerHTML = `<div class="page-title">副本库</div>
    <div class="page-sub">每一个副本都是一个世界。进入前先看清任务与结局——然后，活着回来。</div>
    <div id="grid" class="copy-grid"><div class="empty">加载中…</div></div>`;
  let list;
  try {
    list = await api("/api/copies");
  } catch (e) {
    $("#grid").innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
    return;
  }
  if (!list.length) {
    $("#grid").innerHTML = `<div class="empty">还没有副本，<a href="#/editor">去设计第一个吧</a></div>`;
    return;
  }
  $("#grid").innerHTML = list.map((c) => {
    const diff = copyDifficulty(c);
    const rec = p.clears[c.id];
    const badge = rec && rec.clears > 0
      ? `<span class="copy-badge ok">通关</span>`
      : rec && rec.deaths > 0
        ? `<span class="copy-badge bad">阵亡</span>`
        : `<span class="copy-badge">未入</span>`;
    return `
    <div class="copy-card">
      <div class="copy-cover" style="background:linear-gradient(135deg,${esc(c.coverColor || "#a87b45")},#6a5638)">
        <div class="copy-cover-text">${esc(c.title)}</div>
        ${badge}
      </div>
      <div class="copy-body">
        <div class="copy-diff">${starsHtml(diff)} <span>难度 ${diff}/5</span></div>
        <div class="copy-mission">任务：${esc(copyMission(c))}</div>
        <div class="copy-desc">${esc(c.description || "（无简介）")}</div>
        <div class="copy-meta">奖励 ${copyReward(c)} 积分 · 作者：${esc(c.author)}</div>
        <div class="copy-actions">
          <button class="primary" data-play="${esc(c.id)}">进入副本</button>
          <button data-edit="${esc(c.id)}">编辑</button>
          <button class="danger" data-del="${esc(c.id)}">删除</button>
        </div>
      </div>
    </div>`;
  }).join("");

  $$("[data-play]", app).forEach((b) => b.addEventListener("click", () => (location.hash = `#/play/${b.dataset.play}`)));
  $$("[data-edit]", app).forEach((b) => b.addEventListener("click", () => (location.hash = `#/editor/${b.dataset.edit}`)));
  $$("[data-del]", app).forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("确定删除这个副本吗？")) return;
      try {
        await api("/api/copies/" + b.dataset.del, "DELETE");
        toast("已删除");
        renderInstances();
      } catch (e) {
        toast("删除失败：" + e.message);
      }
    })
  );
}

/* ================= 编辑器 ================= */

function defaultConfig() {
  return {
    name: "你",
    startAge: 0,
    maxAge: 78,
    year0: 2000,
    background: "",
    mission: "",
    difficulty: "",
    reward: "",
    stats: { 金钱: 100, 健康: 80, 智力: 50, 魅力: 50, 幸运: 50, 心情: 60 },
    statMeta: {
      金钱: { min: 0, max: 10000 },
      健康: { min: 0, max: 100 },
      智力: { min: 0, max: 100 },
      魅力: { min: 0, max: 100 },
      幸运: { min: 0, max: 100 },
      心情: { min: 0, max: 100 },
    },
    freeActions: [
      { name: "读书", effects: { 智力: 6, 心情: -1 } },
      { name: "打工", effects: { 金钱: 30, 健康: -4, 心情: -2 } },
      { name: "锻炼", effects: { 健康: 5, 心情: 1 } },
      { name: "社交", effects: { 魅力: 4, 心情: 3, 金钱: -5 } },
      { name: "休息", effects: { 健康: 4, 心情: 4 } },
    ],
    events: [],
    endings: [],
  };
}

function editorMetaForm(copy) {
  const cfg = copy.config;
  return `
    <div class="field-row">
      <div class="field"><label>副本标题 *</label><input id="ed-title" value="${esc(copy.title)}" /></div>
      <div class="field"><label>作者</label><input id="ed-author" value="${esc(copy.author)}" /></div>
    </div>
    <div class="field"><label>简介（展示在副本库）</label><textarea id="ed-desc">${esc(copy.description || "")}</textarea></div>
    <div class="field-row">
      <div class="field"><label>封面颜色</label><input id="ed-color" type="color" value="${esc(copy.coverColor || "#a87b45")}" /></div>
      <div class="field"><label>主角名</label><input id="ed-name" value="${esc(cfg.name || "你")}" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>起始年龄</label><input id="ed-startAge" type="number" value="${esc(cfg.startAge ?? 0)}" /></div>
      <div class="field"><label>最大年龄</label><input id="ed-maxAge" type="number" value="${esc(cfg.maxAge ?? 78)}" /></div>
      <div class="field"><label>起始年份</label><input id="ed-year0" type="number" value="${esc(cfg.year0 ?? 2000)}" /></div>
    </div>
    <div class="field"><label>背景故事（进入副本时的开场旁白）</label><textarea id="ed-background">${esc(cfg.background || "")}</textarea></div>`;
}

function editorInstanceForm(cfg) {
  return `
    <div class="field"><label>任务目标（玩家需要完成的事，留空自动生成）</label><textarea id="ed-mission" rows="2" placeholder="例如：在这个世界活到 60 岁，并攒下 500 元">${esc(cfg.mission || "")}</textarea></div>
    <div class="field-row">
      <div class="field"><label>难度（1-5 星，留空自动评估）</label><input id="ed-diff" type="number" min="1" max="5" value="${esc(cfg.difficulty ?? "")}" /></div>
      <div class="field"><label>通关奖励积分（留空自动计算）</label><input id="ed-reward" type="number" min="1" value="${esc(cfg.reward ?? "")}" /></div>
    </div>`;
}

function editorStatsForm(cfg) {
  const rows = Object.entries(cfg.stats || {}).map(([name, start]) => {
    const meta = (cfg.statMeta || {})[name] || {};
    return `<div class="mini-row" data-stat>
      <input class="st-name" placeholder="属性名" value="${esc(name)}" />
      <input class="st-start" type="number" placeholder="初始值" value="${esc(start)}" />
      <input class="st-min" type="number" placeholder="最小" value="${esc(meta.min ?? 0)}" />
      <input class="st-max" type="number" placeholder="最大" value="${esc(meta.max ?? 100)}" />
      <button class="small danger" type="button" data-del-stat>删</button>
    </div>`;
  }).join("");
  return `<div id="stat-list">${rows}</div>
    <button type="button" class="small" id="add-stat">+ 添加属性</button>`;
}

function editorActionsForm(cfg) {
  const rows = (cfg.freeActions || []).map((a, i) => `
    <div class="item-card" data-action>
      <div class="item-head"><span class="item-title">行动 ${i + 1}</span>
        <button class="small danger" type="button" data-del-action>删</button></div>
      <div class="mini-row">
        <input class="ac-name" placeholder="行动名（如：打工）" value="${esc(a.name)}" />
      </div>
      <div class="field"><label>效果（每行一个，格式：属性:数值）</label>
        <textarea class="effects-input ac-effects" rows="3">${esc(effectsToText(a.effects))}</textarea></div>
    </div>`).join("");
  return `<div id="action-list">${rows}</div>
    <button type="button" class="small" id="add-action">+ 添加行动</button>`;
}

function editorEventsForm(cfg) {
  const rows = (cfg.events || []).map((ev, i) => `
    <div class="item-card" data-event>
      <div class="item-head"><span class="item-title">事件 ${i + 1}</span>
        <button class="small danger" type="button" data-del-event>删</button></div>
      <div class="field"><label>标题</label><input class="ev-title" value="${esc(ev.title || "")}" /></div>
      <div class="field"><label>事件文本</label><textarea class="ev-text" rows="2">${esc(ev.text || "")}</textarea></div>
      <div class="mini-row">
        <input class="ev-age" type="number" placeholder="触发年龄（可空）" value="${esc(ev.age ?? "")}" />
        <input class="ev-chance" type="number" step="0.05" min="0" max="1" placeholder="概率 0-1（默认1）" value="${esc(ev.chance ?? 1)}" />
      </div>
      <div class="mini-row">
        <input class="ev-cond" placeholder="触发条件（可空，如 金钱>=1000）" value="${esc(ev.condition || "")}" />
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap">
          <input class="ev-once" type="checkbox" ${ev.once ? "checked" : ""} />仅触发一次
        </label>
      </div>
      <div class="field"><label>选项（玩家可从中选择）</label>
        <div class="choice-editor">${editorChoices(ev.choices || [])}</div>
        <button class="small" type="button" data-add-choice>+ 添加选项</button>
      </div>
    </div>`).join("");
  return `<div id="event-list">${rows}</div>
    <button type="button" class="small" id="add-event">+ 添加事件</button>`;
}

function editorChoices(choices) {
  return choices.map((ch, i) => `
    <div class="item-card" data-choice>
      <div class="item-head"><span class="item-title">选项 ${i + 1}</span>
        <button class="small danger" type="button" data-del-choice>删</button></div>
      <div class="field"><label>选项文字</label><input class="ch-text" value="${esc(ch.text || "")}" /></div>
      <div class="field"><label>效果</label><textarea class="effects-input ch-effects" rows="2">${esc(effectsToText(ch.effects))}</textarea></div>
      <div class="field"><label>结果描述（写进试炼日志）</label><input class="ch-log" value="${esc(ch.log || "")}" /></div>
    </div>`).join("");
}

function editorEndingsForm(cfg) {
  const rows = (cfg.endings || []).map((en, i) => `
    <div class="item-card" data-ending>
      <div class="item-head"><span class="item-title">结局 ${i + 1}</span>
        <button class="small danger" type="button" data-del-ending>删</button></div>
      <div class="mini-row">
        <input class="en-name" placeholder="结局名" value="${esc(en.name || "")}" />
        <input class="en-cond" placeholder="达成条件（如 金钱>=5000）" value="${esc(en.condition || "")}" />
      </div>
      <div class="field"><label>结局描述</label><input class="en-text" value="${esc(en.text || "")}" /></div>
    </div>`).join("");
  return `<div id="ending-list">${rows}</div>
    <button type="button" class="small" id="add-ending">+ 添加结局</button>`;
}

async function renderEditor(id) {
  const app = $("#app");
  let copy;
  if (id) {
    try {
      copy = await api("/api/copies/" + id);
    } catch (e) {
      app.innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
      return;
    }
  } else {
    copy = { title: "", author: "", description: "", coverColor: "#a87b45", config: defaultConfig() };
  }

  app.innerHTML = `
    <div class="page-title">${id ? "编辑副本" : "设计副本"}</div>
    <div class="page-sub">设计一个世界：任务目标、属性、事件、选择、结局。保存后所有人都可以进入试炼。</div>

    <div class="form-card"><h3>副本信息</h3>${editorMetaForm(copy)}</div>
    <div class="form-card"><h3>副本设定（无限流）</h3>${editorInstanceForm(copy.config)}</div>
    <div class="form-card"><h3>生存属性（决定试炼的基础）</h3>${editorStatsForm(copy.config)}</div>
    <div class="form-card"><h3>日常行动（每个回合玩家可选一个）</h3>${editorActionsForm(copy.config)}</div>
    <div class="form-card"><h3>命运事件（触发剧情与选择）</h3>
      <div class="field"><div class="hint">触发年龄：到达该年龄时触发；留空则每年都可能触发。概率：0-1。条件：支持 金钱>=1000、健康<20 等，多个用 且=&& 或=||。</div></div>
      ${editorEventsForm(copy.config)}
    </div>
    <div class="form-card"><h3>通关结局（达成条件时解锁，奖励加成）</h3>${editorEndingsForm(copy.config)}</div>

    <div class="toolbar">
      <button class="primary" id="btn-save">保存并发布</button>
      <button id="btn-export">导出 JSON</button>
      <button id="btn-import">导入 JSON</button>
      <input type="file" id="import-file" accept=".json,application/json" style="display:none" />
      <button id="btn-preview">试玩</button>
    </div>`;

  $("#add-stat").addEventListener("click", () => {
    $("#stat-list").insertAdjacentHTML("beforeend", `
      <div class="mini-row" data-stat>
        <input class="st-name" placeholder="属性名" value="" />
        <input class="st-start" type="number" placeholder="初始值" value="50" />
        <input class="st-min" type="number" placeholder="最小" value="0" />
        <input class="st-max" type="number" placeholder="最大" value="100" />
        <button class="small danger" type="button" data-del-stat>删</button>
      </div>`);
  });
  $("#stat-list").addEventListener("click", (e) => {
    if (e.target.dataset.delStat !== undefined) e.target.closest("[data-stat]").remove();
  });

  $("#add-action").addEventListener("click", () => {
    $("#action-list").insertAdjacentHTML("beforeend", `
      <div class="item-card" data-action>
        <div class="item-head"><span class="item-title">新行动</span>
          <button class="small danger" type="button" data-del-action>删</button></div>
        <div class="mini-row"><input class="ac-name" placeholder="行动名（如：打工）" value="" /></div>
        <div class="field"><label>效果（每行一个，格式：属性:数值）</label>
          <textarea class="effects-input ac-effects" rows="3"></textarea></div>
      </div>`);
  });
  $("#action-list").addEventListener("click", (e) => {
    if (e.target.dataset.delAction !== undefined) e.target.closest("[data-action]").remove();
  });

  $("#add-event").addEventListener("click", () => {
    $("#event-list").insertAdjacentHTML("beforeend", `
      <div class="item-card" data-event>
        <div class="item-head"><span class="item-title">新事件</span>
          <button class="small danger" type="button" data-del-event>删</button></div>
        <div class="field"><label>标题</label><input class="ev-title" value="" /></div>
        <div class="field"><label>事件文本</label><textarea class="ev-text" rows="2"></textarea></div>
        <div class="mini-row">
          <input class="ev-age" type="number" placeholder="触发年龄（可空）" value="" />
          <input class="ev-chance" type="number" step="0.05" min="0" max="1" placeholder="概率 0-1" value="1" />
        </div>
        <div class="mini-row">
          <input class="ev-cond" placeholder="触发条件（可空）" value="" />
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap">
            <input class="ev-once" type="checkbox" checked />仅触发一次
          </label>
        </div>
        <div class="field"><label>选项</label>
          <div class="choice-editor"></div>
          <button class="small" type="button" data-add-choice>+ 添加选项</button>
        </div>
      </div>`);
  });
  $("#event-list").addEventListener("click", (e) => {
    if (e.target.dataset.delEvent !== undefined) return e.target.closest("[data-event]").remove();
    if (e.target.dataset.addChoice !== undefined) {
      e.target.previousElementSibling.insertAdjacentHTML("beforeend", `
        <div class="item-card" data-choice>
          <div class="item-head"><span class="item-title">新选项</span>
            <button class="small danger" type="button" data-del-choice>删</button></div>
          <div class="field"><label>选项文字</label><input class="ch-text" value="" /></div>
          <div class="field"><label>效果</label><textarea class="effects-input ch-effects" rows="2"></textarea></div>
          <div class="field"><label>结果描述</label><input class="ch-log" value="" /></div>
        </div>`);
    }
    if (e.target.dataset.delChoice !== undefined) e.target.closest("[data-choice]").remove();
  });

  $("#add-ending").addEventListener("click", () => {
    $("#ending-list").insertAdjacentHTML("beforeend", `
      <div class="item-card" data-ending>
        <div class="item-head"><span class="item-title">新结局</span>
          <button class="small danger" type="button" data-del-ending>删</button></div>
        <div class="mini-row">
          <input class="en-name" placeholder="结局名" value="" />
          <input class="en-cond" placeholder="达成条件（如 金钱>=5000）" value="" />
        </div>
        <div class="field"><label>结局描述</label><input class="en-text" value="" /></div>
      </div>`);
  });
  $("#ending-list").addEventListener("click", (e) => {
    if (e.target.dataset.delEnding !== undefined) e.target.closest("[data-ending]").remove();
  });

  function collect() {
    const stats = {}, statMeta = {};
    $$("#stat-list [data-stat]").forEach((row) => {
      const name = $(".st-name", row).value.trim();
      if (!name) return;
      stats[name] = Number($(".st-start", row).value) || 0;
      statMeta[name] = {
        min: Number($(".st-min", row).value) || 0,
        max: Number($(".st-max", row).value) || 100,
      };
    });
    const freeActions = $$("#action-list [data-action]").map((row) => ({
      name: $(".ac-name", row).value.trim(),
      effects: parseEffects($(".ac-effects", row).value),
    })).filter((a) => a.name);
    const events = $$("#event-list [data-event]").map((row) => ({
      id: "e" + Math.random().toString(36).slice(2, 8),
      title: $(".ev-title", row).value.trim(),
      text: $(".ev-text", row).value.trim(),
      age: $(".ev-age", row).value === "" ? null : Number($(".ev-age", row).value),
      chance: $(".ev-chance", row).value === "" ? 1 : Number($(".ev-chance", row).value),
      condition: $(".ev-cond", row).value.trim(),
      once: $(".ev-once", row).checked,
      choices: $$("[data-choice]", row).map((ch) => ({
        text: $(".ch-text", ch).value.trim(),
        effects: parseEffects($(".ch-effects", ch).value),
        log: $(".ch-log", ch).value.trim(),
      })).filter((ch) => ch.text),
    })).filter((ev) => ev.title || ev.text);
    const endings = $$("#ending-list [data-ending]").map((row) => ({
      id: "n" + Math.random().toString(36).slice(2, 8),
      name: $(".en-name", row).value.trim(),
      condition: $(".en-cond", row).value.trim(),
      text: $(".en-text", row).value.trim(),
    })).filter((en) => en.name);

    const cfg = {
      name: $("#ed-name").value.trim() || "你",
      startAge: Number($("#ed-startAge").value) || 0,
      maxAge: Number($("#ed-maxAge").value) || 78,
      year0: Number($("#ed-year0").value) || 2000,
      background: $("#ed-background").value.trim(),
      mission: $("#ed-mission").value.trim(),
      difficulty: $("#ed-diff").value === "" ? null : Number($("#ed-diff").value),
      reward: $("#ed-reward").value === "" ? null : Number($("#ed-reward").value),
      stats,
      statMeta,
      freeActions,
      events,
      endings,
    };
    if (cfg.difficulty === null) delete cfg.difficulty;
    if (cfg.reward === null) delete cfg.reward;
    return {
      title: $("#ed-title").value.trim(),
      author: $("#ed-author").value.trim() || "匿名",
      description: $("#ed-desc").value.trim(),
      coverColor: $("#ed-color").value,
      config: cfg,
    };
  }

  $("#btn-save").addEventListener("click", async () => {
    const data = collect();
    if (!data.title) return toast("请填写标题");
    if (!Object.keys(data.config.stats).length) return toast("请至少添加一个属性");
    try {
      if (id) {
        await api("/api/copies/" + id, "PUT", data);
        toast("已保存更新");
      } else {
        const saved = await api("/api/copies", "POST", data);
        toast("发布成功");
        location.hash = "#/editor/" + saved.id;
      }
    } catch (e) {
      toast("保存失败：" + e.message);
    }
  });

  $("#btn-export").addEventListener("click", () => {
    const data = collect();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (data.title || "无限流副本") + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#btn-import").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.title || !data.config) throw new Error("格式不对");
        $("#ed-title").value = data.title;
        $("#ed-author").value = data.author || "";
        $("#ed-desc").value = data.description || "";
        $("#ed-color").value = data.coverColor || "#a87b45";
        $("#ed-name").value = data.config.name || "你";
        $("#ed-startAge").value = data.config.startAge ?? 0;
        $("#ed-maxAge").value = data.config.maxAge ?? 78;
        $("#ed-year0").value = data.config.year0 ?? 2000;
        $("#ed-background").value = data.config.background || "";
        $("#ed-mission").value = data.config.mission || "";
        $("#ed-diff").value = data.config.difficulty ?? "";
        $("#ed-reward").value = data.config.reward ?? "";
        $("#stat-list").closest(".form-card").innerHTML = "<h3>生存属性（决定试炼的基础）</h3>" + editorStatsForm(data.config);
        $("#action-list").closest(".form-card").innerHTML = "<h3>日常行动（每个回合玩家可选一个）</h3>" + editorActionsForm(data.config);
        $("#event-list").closest(".form-card").innerHTML = "<h3>命运事件（触发剧情与选择）</h3><div class='field'><div class='hint'>触发年龄：到达该年龄时触发；留空则每年都可能触发。概率：0-1。条件：支持 金钱>=1000、健康<20 等，多个用 且=&& 或=||。</div></div>" + editorEventsForm(data.config);
        $("#ending-list").closest(".form-card").innerHTML = "<h3>通关结局（达成条件时解锁，奖励加成）</h3>" + editorEndingsForm(data.config);
        toast("导入成功，请检查后保存");
      } catch (err) {
        toast("导入失败：" + err.message);
      }
    };
    reader.readAsText(file);
  });

  $("#btn-preview").addEventListener("click", () => {
    const data = collect();
    if (!data.title) return toast("请先填写标题");
    try {
      localStorage.setItem("preview-copy", JSON.stringify(data));
      location.hash = "#/play/preview";
    } catch (e) {
      toast("试玩失败：" + e.message);
    }
  });
}

/* ================= 试炼 ================= */

async function loadPlayCopy(id) {
  if (id === "preview") {
    const raw = localStorage.getItem("preview-copy");
    if (!raw) throw new Error("没有试玩内容");
    return { id: "preview", ...JSON.parse(raw) };
  }
  return api("/api/copies/" + id);
}

async function renderPlay(id) {
  const p = loadPlayer();
  const app = $("#app");
  let copy;
  try {
    copy = await loadPlayCopy(id);
  } catch (e) {
    app.innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
    return;
  }

  // 入场加成：身份 + 强化 + 同行者 + 启程技能
  const bonuses = {};
  for (const [k, v] of Object.entries(identityBonus(p))) bonuses[k] = (bonuses[k] || 0) + v;
  for (const st of CORE_STATS) {
    const lv = upgradeLevel(p, st);
    if (lv > 0) bonuses[st] = (bonuses[st] || 0) + lv * 5;
  }
  for (const [k, v] of Object.entries(companionBonuses(p))) bonuses[k] = (bonuses[k] || 0) + v;
  if (p.skills.includes("startup")) {
    const names = Object.keys(copy.config.stats || {});
    if (names.length) {
      const pick = names[Math.floor(Math.random() * names.length)];
      bonuses[pick] = (bonuses[pick] || 0) + 10;
    }
  }

  const game = new LifeGame(copy, {
    bonuses,
    modifiers: { iron: p.skills.includes("iron"), lucky: p.skills.includes("lucky") },
  });
  const mission = copyMission(copy);
  let actionPhase = false;

  app.innerHTML = `
    <div class="play-header">
      <h1>${esc(copy.title)}</h1>
      <div class="sub">${starsHtml(copyDifficulty(copy))} 难度 ${copyDifficulty(copy)}/5 · 作者：${esc(copy.author || "匿名")}</div>
    </div>
    <div class="mission-card">
      <div class="mission-label">任务目标</div>
      <div class="mission-text">${esc(mission)}</div>
      <div class="mission-progress"><span>已存活</span><b id="age-show">${game.age}</b><span>/ ${game.maxAge} 岁</span></div>
    </div>
    <div class="play-layout">
      <div>
        <div class="panel">
          <div class="age-big">${game.age}<span style="font-size:14px;color:var(--muted)"> 岁</span></div>
          <div class="age-label" id="year-show">${game.year} 年</div>
          <div id="stats-panel"></div>
          <div class="actions-panel">
            <h4>这个回合做什么？</h4>
            <div class="action-buttons" id="action-buttons"></div>
          </div>
          <div class="item-buttons" id="item-buttons"></div>
          <div style="margin-top:14px">
            <button class="primary" id="btn-year" style="width:100%">度过一年 ▸</button>
          </div>
        </div>
      </div>
      <div class="panel">
        <h4 style="margin:0 0 10px">试炼日志</h4>
        <div class="log-box" id="log-box"></div>
      </div>
    </div>`;

  function renderStats() {
    $("#stats-panel").innerHTML = Object.entries(game.stats).map(([k, v]) => {
      const meta = game.statMeta[k] || {};
      const min = meta.min === undefined ? 0 : Number(meta.min);
      const max = meta.max === undefined ? 100 : Number(meta.max);
      const pct = max - min === 0 ? 50 : clamp(((v - min) / (max - min)) * 100, 0, 100);
      const color = pct > 66 ? "#6f8f5c" : pct > 33 ? "#c19a3f" : "#b0544a";
      return `<div class="stat-row">
        <div class="stat-name"><span>${esc(k)}</span><span>${v}</span></div>
        <div class="stat-bar"><div style="width:${pct}%;background:${color}"></div></div>
      </div>`;
    }).join("");
  }

  function renderActions() {
    const box = $("#action-buttons");
    if (!actionPhase || game.over) {
      box.innerHTML = `<span style="color:var(--muted);font-size:12px">先点「度过一年」推进时间</span>`;
      return;
    }
    box.innerHTML = game.freeActions.map((a, i) =>
      `<button data-action="${i}">${esc(a.name)}</button>`
    ).join("") || `<span style="color:var(--muted);font-size:12px">这个副本没有日常行动</span>`;
    $$("button[data-action]", box).forEach((b) =>
      b.addEventListener("click", () => {
        game.doFreeAction(game.freeActions[Number(b.dataset.action)]);
        actionPhase = false;
        renderStats();
        renderActions();
        renderLog();
        if (tryCharm()) return;
        if (game.over) showSummary();
      })
    );
  }

  function renderItems() {
    const box = $("#item-buttons");
    const pp = loadPlayer();
    const parts = [];
    if ((pp.items.medkit || 0) > 0 && !game.over) {
      parts.push(`<button class="item-btn" id="btn-medkit">医疗包 ×${pp.items.medkit}（+20 健康）</button>`);
    }
    if ((pp.items.charm || 0) > 0 && !game.over) {
      parts.push(`<span class="item-hold">护身符 ×${pp.items.charm}（自动）</span>`);
    }
    box.innerHTML = parts.join(" ");
    const mk = $("#btn-medkit");
    if (mk) {
      mk.addEventListener("click", () => {
        const pp2 = loadPlayer();
        if ((pp2.items.medkit || 0) <= 0 || game.over) return;
        pp2.items.medkit -= 1;
        savePlayer(pp2);
        if (game.stats["健康"] !== undefined) {
          const meta = game.statMeta["健康"] || {};
          const min = meta.min === undefined ? 0 : Number(meta.min);
          const max = meta.max === undefined ? 100 : Number(meta.max);
          game.stats["健康"] = clamp(game.stats["健康"] + 20, min, max);
          game.pushLog("你撕开医疗包，伤口开始愈合。", "event");
        }
        renderStats();
        renderLog();
        renderItems();
      });
    }
  }

  function renderLog() {
    const box = $("#log-box");
    box.innerHTML = game.log.map((l) =>
      `<div class="log-line ${l.kind}"><span class="when">${l.age}岁</span>${esc(l.text)}</div>`
    ).join("");
    box.scrollTop = box.scrollHeight;
  }

  function tryCharm() {
    if (!game.dead) return false;
    const pp = loadPlayer();
    if ((pp.items.charm || 0) <= 0) return false;
    pp.items.charm -= 1;
    savePlayer(pp);
    game.revive();
    renderStats();
    renderLog();
    renderItems();
    renderActions();
    toast("护身符碎裂，你从死亡边缘爬了回来");
    return true;
  }

  function showEvent(ev) {
    return new Promise((resolve) => {
      const hasInsight = loadPlayer().skills.includes("insight");
      const modal = openModal(`
        <h2>${esc(ev.title || "事件")}</h2>
        <div class="event-text">${esc(ev.text || "")}</div>
        <div class="choice-list">
          ${(ev.choices || []).map((ch, i) => {
            const eff = hasInsight && ch.effects && Object.keys(ch.effects).length
              ? `<span class="choice-eff">${Object.entries(ch.effects).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(" · ")}</span>`
              : "";
            return `<button class="choice-btn" data-choice="${i}"><span>${esc(ch.text || "继续")}</span>${eff}</button>`;
          }).join("")}
        </div>`);
      if (!(ev.choices || []).length) {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = "继续";
        btn.style.marginTop = "10px";
        btn.addEventListener("click", () => { closeModal(); resolve(-1); });
        $(".choice-list", modal).appendChild(btn);
      }
      $$("[data-choice]", modal).forEach((b) =>
        b.addEventListener("click", () => {
          const i = Number(b.dataset.choice);
          game.resolveEvent(ev, i);
          closeModal();
          resolve(i);
        })
      );
    });
  }

  function runRating(cleared) {
    const span = Math.max(1, game.maxAge - game.startAge);
    const progress = clamp((game.age - game.startAge) / span, 0, 1);
    if (cleared) {
      let r = progress >= 0.95 ? "S" : progress >= 0.8 ? "A" : progress >= 0.6 ? "B" : "C";
      if (game.achievedEndings.length >= 2 && r !== "S") r = "A";
      return r;
    }
    return progress >= 0.6 ? "C" : "D";
  }

  function settleRun(cleared, rating) {
    const pp = loadPlayer();
    const rec = pp.clears[id] || { title: copy.title, clears: 0, deaths: 0, lastAt: 0 };
    rec.title = copy.title;
    rec.lastAt = Date.now();
    if (cleared) rec.clears += 1; else rec.deaths += 1;
    pp.clears[id] = rec;

    const base = copyReward(copy);
    const span = Math.max(1, game.maxAge - game.startAge);
    const progress = clamp((game.age - game.startAge) / span, 0, 1);
    let score = 0, endingBonus = 0, luckyBonus = 0;
    const dropped = [];
    let newShard = null;
    let newCompanion = null;

    if (!cleared) {
      score = Math.round(base * 0.3 * progress);
      pp.points += score;
      pp.totalEarned += score;
    } else {
      let mult = 1;
      if (rec.clears > 1) mult = Math.max(0.3, 1 - 0.4 * (rec.clears - 1));
      let s = Math.round(base * (0.6 + 0.4 * progress) * mult);
      endingBonus = game.achievedEndings.length * 15;
      if (pp.skills.includes("lucky")) luckyBonus = Math.round((s + endingBonus) * 0.2);
      score = s + endingBonus + luckyBonus;
      pp.points += score;
      pp.totalEarned += score;

      const luck = pp.skills.includes("lucky");
      if (Math.random() < (luck ? 0.45 : 0.3)) { pp.items.medkit += 1; dropped.push("医疗包"); }
      if (Math.random() < (luck ? 0.18 : 0.1)) { pp.items.charm += 1; dropped.push("护身符"); }

      if (shardCount(pp) < LORE.length) {
        newShard = LORE[pp.shards.length];
        pp.shards.push(newShard);
      }
      if ((pp.companions || []).length < 3 && Math.random() < 0.35) {
        const pool = COMPANIONS.filter((c) => !pp.companions.includes(c.id));
        if (pool.length) {
          newCompanion = pool[Math.floor(Math.random() * pool.length)];
          pp.companions.push(newCompanion.id);
        }
      }
    }
    savePlayer(pp);
    return { pp, score, endingBonus, luckyBonus, base, progress, dropped, newShard, newCompanion, rating };
  }

  function showSummary() {
    const cleared = !game.dead;
    const rating = runRating(cleared);
    const pBefore = loadPlayer();
    const levelBefore = playerLevel(pBefore);
    const r = settleRun(cleared, rating);
    const levelAfter = playerLevel(r.pp);
    const levelUp = levelAfter > levelBefore;
    const ends = game.achievedEndings.map((ei) => {
      const en = game.endings.find((x) => x.id === ei);
      return en ? `<div class="ending-name">◉ ${esc(en.name)}</div>` : "";
    }).join("");
    const expIn = (r.pp.totalEarned || 0) % 120;

    const rewardLines = cleared
      ? `<div class="settle-line">基础奖励 <b>${r.base}</b></div>
         ${r.endingBonus ? `<div class="settle-line">结局加成 <b class="gold">+${r.endingBonus}</b>（${game.achievedEndings.length} 个结局）</div>` : ""}
         ${r.luckyBonus ? `<div class="settle-line">幸运星 <b class="gold">+${r.luckyBonus}</b></div>` : ""}
         <div class="settle-line total">获得积分 <b class="gold">+${r.score}</b></div>
         ${r.dropped.length ? `<div class="settle-line">掉落道具：${r.dropped.map((d) => esc(d)).join("、")}</div>` : ""}`
      : `<div class="settle-line">阵亡补偿 <b class="gold">+${r.score}</b> 积分</div>`;

    const modal = openModal(`
      <div class="rating-badge ${cleared ? "ok" : "bad"}">${rating}</div>
      <h2>${cleared ? "试炼完成" : "试炼失败"}</h2>
      <p class="settle-reason">${esc(game.endReason || (cleared ? "你活到了最后一天。" : ""))}</p>
      ${cleared && ends ? `<div class="settle-ends">${ends}</div>` : ""}
      ${cleared && r.newShard ? `<div class="shard-new">回响已收录：${esc(r.newShard)}</div>` : ""}
      ${cleared && r.newCompanion ? `<div class="companion-new">结识同行者「${esc(r.newCompanion.name)}」：${esc(r.newCompanion.line)}</div>` : ""}
      <div class="summary-stats">
        <div>终年：<b>${game.age} 岁</b></div>
        <div>评级：<b>${rating}</b> · 难度 ${copyDifficulty(copy)}/5</div>
        <div>最后状态：
          ${Object.entries(game.stats).map(([k, v]) => `${esc(k)} ${v}`).join("，")}
        </div>
      </div>
      <div class="settle-box">${rewardLines}</div>
      <div class="exp-box">
        <div class="exp-label">${levelUp ? `升级！${levelTitle(levelBefore)} → ${levelTitle(levelAfter)}` : `${levelTitle(levelAfter)} · Lv.${levelAfter}`} · 历练 ${r.pp.totalEarned}</div>
        <div class="exp-bar"><div style="width:${(expIn / 120) * 100}%"></div></div>
      </div>
      <canvas class="chart" id="chart"></canvas>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
        <button class="primary" id="btn-restart">再战一次</button>
        <button id="btn-lobby">返回主神空间</button>
        <button id="btn-catalog">返回副本库</button>
      </div>`);
    drawChart($("#chart", modal), game);
    $("#btn-restart", modal).addEventListener("click", () => { closeModal(); renderPlay(id); });
    $("#btn-lobby", modal).addEventListener("click", () => { closeModal(); location.hash = "#/"; });
    $("#btn-catalog", modal).addEventListener("click", () => { closeModal(); location.hash = "#/instances"; });
  }

  $("#btn-year").addEventListener("click", async () => {
    if (game.over) return showSummary();
    game.advanceYear();
    renderStats();
    renderLog();
    $("#age-show").textContent = game.age;
    $("#year-show").textContent = `${game.year} 年`;
    if (game.over) {
      renderActions();
      renderItems();
      showSummary();
      return;
    }
    const events = game.availableEvents();
    for (const ev of events) {
      await showEvent(ev);
      renderStats();
      renderLog();
      if (tryCharm()) continue;
      if (game.over) {
        renderActions();
        renderItems();
        showSummary();
        return;
      }
    }
    actionPhase = true;
    renderActions();
  });

  // 入场序幕（任务面板）
  const bonusLines = runBonusesText(p);
  const endingGuide = (copy.config.endings || []).length
    ? `<div class="ending-guide">${(copy.config.endings || []).map((en) =>
        `<div class="ending-guide-row"><b>${esc(en.name)}</b><span>${esc(en.condition || "无条件")}</span></div>`).join("")}
        <div class="ending-guide-row bad"><b>失败</b><span>生命（健康）归零 → 阵亡</span></div></div>`
    : `<div class="ending-guide"><div class="ending-guide-row bad"><b>失败</b><span>生命（健康）归零 → 阵亡</span></div></div>`;

  const intro = openModal(`
    <h2>${esc(copy.title)}</h2>
    <div class="intro-meta">
      ${starsHtml(copyDifficulty(copy))} 难度 ${copyDifficulty(copy)}/5 · 预估奖励 ${copyReward(copy)} 积分
    </div>
    <div class="intro-mission"><b>任务目标</b><p>${esc(mission)}</p></div>
    <div class="intro-guide"><b>结局攻略</b>${endingGuide}</div>
    ${bonusLines.length ? `<div class="intro-bonus"><b>入场加成</b>${bonusLines.map((l) => `<div>${esc(l)}</div>`).join("")}</div>` : ""}
    ${game.background ? `<div class="event-text">${esc(game.background)}</div>` : ""}
    <p style="color:var(--muted);font-size:13px">你现在 ${game.age} 岁，${game.year} 年。点击「开始试炼」进入这个世界。</p>
    <div style="display:flex;gap:8px">
      <button class="primary" id="btn-start" style="flex:1">开始试炼 ▸</button>
      <button id="btn-cancel">返回</button>
    </div>`);
  $("#btn-start", intro).addEventListener("click", closeModal);
  $("#btn-cancel", intro).addEventListener("click", () => {
    closeModal();
    location.hash = "#/instances";
  });

  renderStats();
  renderActions();
  renderItems();
  renderLog();
}

route();
