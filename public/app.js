/* 人生副本 - 前端应用 */

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
  setTimeout(() => el.remove(), 2200);
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

/* ---------------- Router ---------------- */

function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "editor") {
    renderEditor(parts[1] || null);
  } else if (parts[0] === "play") {
    renderPlay(parts[1]);
  } else {
    renderBrowse();
  }
  $$(".nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === (parts[0] || "browse") || (parts[0] === "play" && a.dataset.nav === "browse"));
  });
}

window.addEventListener("hashchange", route);

/* ---------------- Browse ---------------- */

async function renderBrowse() {
  const app = $("#app");
  app.innerHTML = `<div class="page-title">副本库</div>
    <div class="page-sub">选择一个人生副本，第一人称体验他人的人生；也可以自己创作副本，让别人来体验。</div>
    <div id="grid" class="copy-grid"><div class="empty">加载中…</div></div>`;
  let list;
  try {
    list = await api("/api/copies");
  } catch (e) {
    $("#grid").innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
    return;
  }
  if (!list.length) {
    $("#grid").innerHTML = `<div class="empty">还没有副本，<a href="#/editor">去创作第一个吧</a></div>`;
    return;
  }
  $("#grid").innerHTML = list.map((c) => `
    <div class="copy-card">
      <div class="copy-cover" style="background:linear-gradient(135deg,${esc(c.coverColor || "#5b7fa6")},#333)">
        ${esc(c.title)}
      </div>
      <div class="copy-body">
        <div class="copy-desc">${esc(c.description || "（无简介）")}</div>
        <div class="copy-meta">作者：${esc(c.author)} · 属性：${(c.stats || []).join(" / ")}</div>
        <div class="copy-actions">
          <button class="primary" data-play="${esc(c.id)}">体验</button>
          <button data-edit="${esc(c.id)}">编辑</button>
          <button class="danger" data-del="${esc(c.id)}">删除</button>
        </div>
      </div>
    </div>`).join("");

  $$("[data-play]", app).forEach((b) => b.addEventListener("click", () => (location.hash = `#/play/${b.dataset.play}`)));
  $$("[data-edit]", app).forEach((b) => b.addEventListener("click", () => (location.hash = `#/editor/${b.dataset.edit}`)));
  $$("[data-del]", app).forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("确定删除这个人生副本吗？")) return;
      try {
        await api("/api/copies/" + b.dataset.del, "DELETE");
        toast("已删除");
        renderBrowse();
      } catch (e) {
        toast("删除失败：" + e.message);
      }
    })
  );
}

/* ---------------- Editor ---------------- */

function defaultConfig() {
  return {
    name: "你",
    startAge: 0,
    maxAge: 78,
    year0: 2000,
    background: "",
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
      <div class="field"><label>封面颜色</label><input id="ed-color" type="color" value="${esc(copy.coverColor || "#5b7fa6")}" /></div>
      <div class="field"><label>主角名</label><input id="ed-name" value="${esc(cfg.name || "你")}" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>起始年龄</label><input id="ed-startAge" type="number" value="${esc(cfg.startAge ?? 0)}" /></div>
      <div class="field"><label>最大年龄</label><input id="ed-maxAge" type="number" value="${esc(cfg.maxAge ?? 78)}" /></div>
      <div class="field"><label>起始年份</label><input id="ed-year0" type="number" value="${esc(cfg.year0 ?? 2000)}" /></div>
    </div>
    <div class="field"><label>背景故事（开局旁白）</label><textarea id="ed-background">${esc(cfg.background || "")}</textarea></div>`;
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
        <input class="ev-cond" placeholder="触发条件（可空，如 金钱>=1000 且 智力>=60）" value="${esc(ev.condition || "")}" />
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
      <div class="field"><label>结果描述（写进人生日志）</label><input class="ch-log" value="${esc(ch.log || "")}" /></div>
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
    copy = { title: "", author: "", description: "", coverColor: "#5b7fa6", config: defaultConfig() };
  }

  app.innerHTML = `
    <div class="page-title">${id ? "编辑副本" : "创作副本"}</div>
    <div class="page-sub">设计一段人生：属性、事件、选择、自由行动、结局。保存后所有人可以体验。</div>

    <div class="form-card"><h3>基本信息</h3>${editorMetaForm(copy)}</div>
    <div class="form-card"><h3>属性（决定人生的基础）</h3>${editorStatsForm(copy.config)}</div>
    <div class="form-card"><h3>自由行动（每个回合玩家可选一个）</h3>${editorActionsForm(copy.config)}</div>
    <div class="form-card"><h3>人生事件（触发剧情与选择）</h3>
      <div class="field"><div class="hint">触发年龄：到达该年龄时触发；留空则每年都可能触发。概率：0-1。条件：支持 金钱>=1000、健康<20、智力>=60 等，多个用 且=&& 或=||。</div></div>
      ${editorEventsForm(copy.config)}
    </div>
    <div class="form-card"><h3>结局（达成条件时解锁）</h3>${editorEndingsForm(copy.config)}</div>

    <div class="toolbar">
      <button class="primary" id="btn-save">保存并发布</button>
      <button id="btn-export">导出 JSON</button>
      <button id="btn-import">导入 JSON</button>
      <input type="file" id="import-file" accept=".json,application/json" style="display:none" />
      <button id="btn-preview">试玩</button>
    </div>`;

  // ---- dynamic add/remove ----
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

    return {
      title: $("#ed-title").value.trim(),
      author: $("#ed-author").value.trim() || "匿名",
      description: $("#ed-desc").value.trim(),
      coverColor: $("#ed-color").value,
      config: {
        name: $("#ed-name").value.trim() || "你",
        startAge: Number($("#ed-startAge").value) || 0,
        maxAge: Number($("#ed-maxAge").value) || 78,
        year0: Number($("#ed-year0").value) || 2000,
        background: $("#ed-background").value.trim(),
        stats,
        statMeta,
        freeActions,
        events,
        endings,
      },
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
    a.download = (data.title || "人生副本") + ".json";
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
        $("#ed-color").value = data.coverColor || "#5b7fa6";
        $("#ed-name").value = data.config.name || "你";
        $("#ed-startAge").value = data.config.startAge ?? 0;
        $("#ed-maxAge").value = data.config.maxAge ?? 78;
        $("#ed-year0").value = data.config.year0 ?? 2000;
        $("#ed-background").value = data.config.background || "";
        // 重新渲染动态部分
        const statsCard = $("#stat-list").closest(".form-card");
        const actionsCard = $("#action-list").closest(".form-card");
        const eventsCard = $("#event-list").closest(".form-card");
        const endingsCard = $("#ending-list").closest(".form-card");
        statsCard.querySelector("h3").insertAdjacentHTML("afterend", "");
        statsCard.innerHTML = "<h3>属性（决定人生的基础）</h3>" + editorStatsForm(data.config);
        actionsCard.innerHTML = "<h3>自由行动（每个回合玩家可选一个）</h3>" + editorActionsForm(data.config);
        eventsCard.innerHTML = "<h3>人生事件（触发剧情与选择）</h3><div class='field'><div class='hint'>触发年龄：到达该年龄时触发；留空则每年都可能触发。概率：0-1。条件：支持 金钱>=1000、健康<20、智力>=60 等，多个用 且=&& 或=||。</div></div>" + editorEventsForm(data.config);
        endingsCard.innerHTML = "<h3>结局（达成条件时解锁）</h3>" + editorEndingsForm(data.config);
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

/* ---------------- Play ---------------- */

async function loadPlayCopy(id) {
  if (id === "preview") {
    const raw = localStorage.getItem("preview-copy");
    if (!raw) throw new Error("没有试玩内容");
    return { id: "preview", ...JSON.parse(raw) };
  }
  return api("/api/copies/" + id);
}

async function renderPlay(id) {
  const app = $("#app");
  let copy;
  try {
    copy = await loadPlayCopy(id);
  } catch (e) {
    app.innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
    return;
  }

  const game = new LifeGame(copy);
  let actionPhase = false;

  app.innerHTML = `
    <div class="play-header">
      <h1>${esc(copy.title)}</h1>
      <div class="sub">作者：${esc(copy.author || "匿名")}</div>
    </div>
    <div class="play-layout">
      <div>
        <div class="panel">
          <div class="age-big" id="age-show">${game.age}<span style="font-size:14px;color:var(--muted)"> 岁</span></div>
          <div class="age-label" id="year-show">${game.year} 年</div>
          <div id="stats-panel"></div>
          <div class="actions-panel">
            <h4>这个回合做什么？</h4>
            <div class="action-buttons" id="action-buttons"></div>
          </div>
          <div style="margin-top:14px">
            <button class="primary" id="btn-year" style="width:100%">度过一年 ▸</button>
          </div>
        </div>
      </div>
      <div class="panel">
        <h4 style="margin:0 0 10px">人生日志</h4>
        <div class="log-box" id="log-box"></div>
      </div>
    </div>`;

  function renderStats() {
    $("#stats-panel").innerHTML = Object.entries(game.stats).map(([k, v]) => {
      const meta = game.statMeta[k] || {};
      const min = meta.min === undefined ? 0 : Number(meta.min);
      const max = meta.max === undefined ? 100 : Number(meta.max);
      const pct = max - min === 0 ? 50 : clamp(((v - min) / (max - min)) * 100, 0, 100);
      const color = pct > 66 ? "#5f8f5a" : pct > 33 ? "#c08a3e" : "#b0524a";
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
    ).join("") || `<span style="color:var(--muted);font-size:12px">这个副本没有自由行动</span>`;
    $$("button[data-action]", box).forEach((b) =>
      b.addEventListener("click", () => {
        game.doFreeAction(game.freeActions[Number(b.dataset.action)]);
        actionPhase = false;
        renderStats();
        renderActions();
        renderLog();
        if (game.over) showSummary();
      })
    );
  }

  function renderLog() {
    const box = $("#log-box");
    box.innerHTML = game.log.map((l) =>
      `<div class="log-line ${l.kind}"><span class="when">${l.age}岁</span>${esc(l.text)}</div>`
    ).join("");
    box.scrollTop = box.scrollHeight;
  }

  function showEvent(ev) {
    return new Promise((resolve) => {
      const modal = openModal(`
        <h2>${esc(ev.title || "事件")}</h2>
        <div class="event-text">${esc(ev.text || "")}</div>
        <div class="choice-list">
          ${(ev.choices || []).map((ch, i) =>
            `<button class="choice-btn" data-choice="${i}">${esc(ch.text || "继续")}</button>`
          ).join("")}
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

  function showSummary() {
    const ends = game.achievedEndings.map((ei) => {
      const en = game.endings.find((x) => x.id === ei);
      return en ? `<div class="ending-name">◉ ${esc(en.name)}</div>` : "";
    }).join("");
    const modal = openModal(`
      <h2>${esc(copy.title)} · 人生回顾</h2>
      <p>${esc(game.endReason || "你走完了这一生。")}</p>
      <div class="summary-stats">
        <div>终年：<b>${game.age} 岁</b></div>
        <div>最后状态：
          ${Object.entries(game.stats).map(([k, v]) => `${esc(k)} ${v}`).join("，")}
        </div>
      </div>
      ${ends ? `<div>达成结局：${ends}</div>` : ""}
      <canvas class="chart" id="chart"></canvas>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="primary" id="btn-restart">重新体验</button>
        <button id="btn-back">返回副本库</button>
      </div>`);
    drawChart($("#chart", modal), game);
    $("#btn-restart", modal).addEventListener("click", () => { closeModal(); renderPlay(id); });
    $("#btn-back", modal).addEventListener("click", () => { closeModal(); location.hash = "#/"; });
  }

  $("#btn-year").addEventListener("click", async () => {
    if (game.over) return showSummary();
    game.advanceYear();
    renderStats();
    renderLog();
    $("#age-show").innerHTML = `${game.age}<span style="font-size:14px;color:var(--muted)"> 岁</span>`;
    $("#year-show").textContent = `${game.year} 年`;
    if (game.over) {
      renderActions();
      showSummary();
      return;
    }
    const events = game.availableEvents();
    for (const ev of events) {
      await showEvent(ev);
      renderStats();
      renderLog();
      if (game.over) {
        renderActions();
        showSummary();
        return;
      }
    }
    actionPhase = true;
    renderActions();
  });

  if (game.background) {
    const modal = openModal(`
      <h2>${esc(copy.title)}</h2>
      <div class="event-text">${esc(game.background)}</div>
      <p style="color:var(--muted);font-size:13px">你现在 ${game.age} 岁，${game.year} 年。点击「度过一年」开始你的人生。</p>
      <button class="primary" id="btn-start" style="width:100%">开始人生 ▸</button>`);
    $("#btn-start", modal).addEventListener("click", closeModal);
  }

  renderStats();
  renderActions();
  renderLog();
}

route();
