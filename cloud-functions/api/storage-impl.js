/* 人生副本 - 存储适配层
 * 默认存本地 JSON 文件；若配置了 UPSTASH_REST_URL / UPSTASH_REST_TOKEN，
 * 则改用 Upstash Redis（免费云存储），适合无持久磁盘的免费托管平台。
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "copies.json");
const KEY = "life-copies";

function seedCopies() {
  return [
    {
      id: "seed-teacher",
      title: "小镇教师的一生",
      author: "系统内置",
      description: "出生在小镇，父母都是普通工人。你要决定自己的一生：安心教书，还是闯出去看看世界？",
      coverColor: "#7c9a6d",
      createdAt: Date.now(),
      config: {
        name: "你",
        startAge: 0,
        maxAge: 78,
        year0: 1986,
        background: "1986 年，你出生在一个南方小镇。父亲是工厂钳工，母亲在镇上小学教书。家里不算富裕，但日子安稳。",
        stats: { 金钱: 200, 健康: 85, 智力: 55, 魅力: 50, 幸运: 50, 心情: 60 },
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
          { name: "投资", effects: { 金钱: 12, 幸运: -1 } },
        ],
        events: [
          {
            id: "e-elem",
            title: "小学开学",
            text: "到了上学的年纪。母亲牵着你走进校门，回头看你的时候眼眶有点红。",
            age: 7,
            chance: 1,
            condition: "",
            once: true,
            choices: [
              { text: "好好学习", effects: { 智力: 10, 心情: 1 }, log: "你成了班里的尖子生。" },
              { text: "跟同学玩个痛快", effects: { 魅力: 6, 智力: -3, 心情: 5 }, log: "你人缘很好，但成绩一般。" },
            ],
          },
          {
            id: "e-gaokao",
            title: "高考",
            text: "十八岁，人生第一道大关。志愿表摆在桌上，父母都望着你。",
            age: 18,
            chance: 1,
            condition: "",
            once: true,
            choices: [
              { text: "报师范院校", effects: { 智力: 8, 魅力: 3, 金钱: -20 }, log: "你如愿考上了师范大学。" },
              { text: "报外省大学，离开小镇", effects: { 智力: 10, 心情: 8, 金钱: -40 }, log: "你第一次坐上出省的火车。" },
              { text: "放弃高考，去打工", effects: { 金钱: 60, 智力: -10, 心情: 2 }, log: "你早早走进了社会。" },
            ],
          },
          {
            id: "e-work",
            title: "第一份工作",
            text: "毕业了。招聘会人山人海，你攥着简历，心里没底。",
            age: 22,
            chance: 1,
            condition: "",
            once: true,
            choices: [
              { text: "回镇上当老师", effects: { 金钱: 30, 智力: 4, 魅力: 3, 心情: 4 }, log: "你站在讲台上，看着台下几十双眼睛。" },
              { text: "留在城里闯荡", effects: { 金钱: 50, 健康: -4, 心情: 2 }, log: "出租屋很小，梦想很大。" },
              { text: "创业开小卖部", effects: { 金钱: 100, 幸运: -8, 心情: 5 }, log: "你盘下了一间临街的小店。" },
            ],
          },
          {
            id: "e-marriage",
            title: "婚姻",
            text: "家里开始催婚。相亲对象坐在对面，气氛有点尴尬。",
            age: 27,
            chance: 0.7,
            condition: "",
            once: true,
            choices: [
              { text: "认真相处，步入婚姻", effects: { 魅力: 4, 金钱: -30, 心情: 10 }, log: "婚礼办得简朴，但很热闹。" },
              { text: "以事业为重，暂不结婚", effects: { 金钱: 30, 心情: -3 }, log: "你选择先立业。" },
            ],
          },
          {
            id: "e-crisis",
            title: "中年危机",
            text: "四十岁。单位传出要裁员的消息，房贷还有十五年。晚上你失眠了。",
            age: 42,
            chance: 1,
            condition: "金钱<2000",
            once: true,
            choices: [
              { text: "咬牙坚持，接私活补贴", effects: { 金钱: 120, 健康: -10, 心情: -5 }, log: "你开始在下班后接私活。" },
              { text: "跳槽去新公司", effects: { 金钱: 150, 智力: 6, 幸运: -5, 心情: 0 }, log: "新公司给的钱多，但离家更远。" },
              { text: "卖掉房子回老家", effects: { 金钱: 500, 心情: 8, 智力: -3 }, log: "你卖掉了城里的房子，回了小镇。" },
            ],
          },
          {
            id: "e-retire",
            title: "退休",
            text: "六十五岁，你办完了退休手续。回家的路上，阳光很好。",
            age: 65,
            chance: 1,
            condition: "",
            once: true,
            choices: [
              { text: "含饴弄孙，安享晚年", effects: { 心情: 12, 健康: 2 }, log: "孙辈绕膝，你觉得这辈子值了。" },
              { text: "去环游世界", effects: { 金钱: -300, 心情: 15, 健康: -3 }, log: "你拖着行李箱，把年轻时没去的地方都走了一遍。" },
              { text: "返聘回学校教书", effects: { 智力: 5, 心情: 5, 金钱: 30 }, log: "讲台是你最熟悉的地方。" },
            ],
          },
        ],
        endings: [
          { id: "end-rich", name: "小有积蓄", condition: "金钱>=1000", text: "你攒下了一笔能让自己安心的钱。" },
          { id: "end-widely", name: "桃李满天下", condition: "魅力>=75", text: "很多学生记得你，逢年过节都来看你。" },
          { id: "end-happy", name: "知足常乐", condition: "心情>=85", text: "你这一生，没什么大富大贵，但心里一直很踏实。" },
        ],
      },
    },
    {
      id: "seed-city",
      title: "都市追梦者",
      author: "系统内置",
      description: "农村出身，大学毕业留在大城市。996、房租、梦想，你要怎么选？",
      coverColor: "#4a6fa5",
      createdAt: Date.now(),
      config: {
        name: "你",
        startAge: 22,
        maxAge: 60,
        year0: 2018,
        background: "你从县城考到省城，毕业后进了互联网公司。工资不错，但房租吃掉一半。",
        stats: { 金钱: 500, 健康: 80, 智力: 70, 魅力: 55, 幸运: 50, 心情: 60 },
        statMeta: {
          金钱: { min: 0, max: 100000 },
          健康: { min: 0, max: 100 },
          智力: { min: 0, max: 100 },
          魅力: { min: 0, max: 100 },
          幸运: { min: 0, max: 100 },
          心情: { min: 0, max: 100 },
        },
        freeActions: [
          { name: "加班", effects: { 金钱: 80, 健康: -8, 心情: -6 } },
          { name: "学习新技能", effects: { 智力: 8, 心情: -2, 金钱: -10 } },
          { name: "健身", effects: { 健康: 6, 心情: 2, 金钱: -8 } },
          { name: "社交", effects: { 魅力: 5, 心情: 4, 金钱: -20 } },
          { name: "休息", effects: { 健康: 5, 心情: 6 } },
        ],
        events: [
          {
            id: "c-offer",
            title: "跳槽机会",
            text: "猎头打电话来，一家创业公司想挖你，薪资翻倍，但随时可能倒闭。",
            age: 25,
            chance: 0.8,
            condition: "智力>=70",
            once: true,
            choices: [
              { text: "跳槽博一把", effects: { 金钱: 200, 幸运: -10, 心情: 8 }, log: "你赌上了。" },
              { text: "留在原公司稳一稳", effects: { 金钱: 60, 心情: 2 }, log: "你选择了稳定。" },
            ],
          },
          {
            id: "c-ill",
            title: "身体报警",
            text: "体检报告出来了，几项指标飘红。医生说：再熬下去要出问题。",
            age: 30,
            chance: 0.7,
            condition: "健康<55",
            once: true,
            choices: [
              { text: "放下工作，休养一年", effects: { 健康: 25, 金钱: -150, 心情: 6 }, log: "你给自己放了个长假。" },
              { text: "吃药硬扛，继续拼", effects: { 健康: -12, 金钱: 100, 心情: -4 }, log: "你不想停下。" },
            ],
          },
          {
            id: "c-home",
            title: "回家还是留下",
            text: "父母年纪大了，打电话来问你要不要回老家。城市的户口、房贷、上升的职位……",
            age: 35,
            chance: 1,
            condition: "",
            once: true,
            choices: [
              { text: "回老家陪父母", effects: { 金钱: -100, 心情: 12, 魅力: 3 }, log: "你退掉了城里的房子。" },
              { text: "留在城市继续打拼", effects: { 金钱: 200, 心情: -5, 健康: -3 }, log: "你挂掉电话，继续改方案。" },
            ],
          },
        ],
        endings: [
          { id: "c-rich", name: "财务自由", condition: "金钱>=5000", text: "你终于可以不用为了钱工作了。" },
          { id: "c-healthy", name: "健康长寿", condition: "健康>=80", text: "身体是本钱，你守住了。" },
          { id: "c-happy", name: "人间值得", condition: "心情>=90", text: "回头看，每一步都值得。" },
        ],
      },
    },
  ];
}

/* ---------- 本地 JSON 文件存储 ---------- */

function loadFromFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      const seed = seedCopies();
      fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), "utf8");
      return seed;
    }
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("loadFromFile error:", e.message);
    return [];
  }
}

function saveToFile(copies) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(copies, null, 2), "utf8");
  } catch (e) {
    console.error("saveToFile error:", e.message);
  }
}

/* ---------- Upstash Redis（免费云存储） ---------- */

const UPSTASH_URL = process.env.UPSTASH_REST_URL || "";
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN || "";

async function upstashGet() {
  const res = await fetch(`${UPSTASH_URL}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) throw new Error("upstash get " + res.status);
  const data = await res.json();
  const raw = data && data.result;
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : null;
}

async function upstashSet(copies) {
  const value = encodeURIComponent(JSON.stringify(copies));
  const res = await fetch(`${UPSTASH_URL}/set/${KEY}/${value}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!res.ok) throw new Error("upstash set " + res.status);
}

/* ---------- 统一接口 ---------- */

const useUpstash = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

async function loadCopies() {
  if (useUpstash) {
    try {
      const remote = await upstashGet();
      if (remote && remote.length) return remote;
      const seed = seedCopies();
      await upstashSet(seed);
      return seed;
    } catch (e) {
      console.error("upstash load failed, fallback to file:", e.message);
      return loadFromFile();
    }
  }
  return loadFromFile();
}

async function saveCopies(copies) {
  if (useUpstash) {
    try {
      await upstashSet(copies);
      return;
    } catch (e) {
      console.error("upstash save failed, fallback to file:", e.message);
    }
  }
  saveToFile(copies);
}

module.exports = { loadCopies, saveCopies, useUpstash, KEY };
