# 人生副本

一个网页应用：创作“人生副本”，发布到副本库，让别人以第一人称自由体验他人的人生。

玩法类似简化版的《模拟人生》：每个人都有属性（金钱、健康、智力、魅力、幸运、心情…），每个回合可以推进一年时间，触发作者设计的人生事件并做出选择，也可以自由行动（读书、打工、锻炼、社交、休息…），最后解锁结局、回顾一生。

## 功能

- **副本库**：浏览所有已发布的人生副本，一键体验、编辑、删除
- **创作副本**：图形化编辑属性、自由行动、人生事件（触发年龄/概率/条件/选项/效果）、结局，支持导出/导入 JSON、保存后试玩
- **第一人称体验**：属性面板、人生日志、事件弹窗选择、自由行动、结局达成、一生数据曲线回顾
- **数据持久化**：所有副本保存在 `data/copies.json`，重启不丢

## 运行

需要 Node.js（18+）。

```bash
cd D:\视频\life-copies
node server.js
```

然后浏览器打开：http://localhost:3000

内置了两个示例副本：《小镇教师的一生》《都市追梦者》。

## 自定义

- 端口：`PORT=8080 node server.js`
- 数据文件：`data/copies.json`（可备份、可手工编辑）
- 局域网分享：同一 WiFi 下，别人访问 `http://你的局域网IP:3000`
- 公网发布：部署到云服务器即可（代码无第三方依赖）

## 永久免费部署

代码已适配 Docker（见 `Dockerfile`），任何支持 Node/Docker 的免费平台都能直接部署。

### 推荐：Zeabur（国内可访问、免费额度）

1. 用 GitHub 账号登录 [zeabur.com](https://zeabur.com)（免费，无需绑卡）
2. 安装 CLI 后在本目录执行：
   ```bash
   zeabur login          # 浏览器里登录一次
   zeabur deploy
   ```
3. 在 Zeabur 控制台把服务端口设为 `3000`，即可获得公开域名

### 备选：Render（全球访问）

1. 把项目推到 GitHub，在 [render.com](https://render.com) 新建 Web Service
2. 选 Docker（有 `Dockerfile`），端口 `3000`
3. 免费额度：闲置 15 分钟后休眠，有人访问会自动唤醒（首次打开稍慢）

### 数据持久化（重要）

免费平台的磁盘是临时的，重启/重新部署会丢数据。推荐配一个免费云数据库：

1. 注册 [upstash.com](https://upstash.com) 免费 Redis
2. 创建数据库后拿到 `REST URL` 和 `REST TOKEN`
3. 在托管平台给服务加两个环境变量：
   ```
   UPSTASH_REST_URL   = https://xxx.upstash.io
   UPSTASH_REST_TOKEN = 你的Token
   ```

配好后副本会存到云上，重启不丢。不配也能跑，只是部署平台重启后数据会回到初始状态。

### 环境变量

| 变量 | 作用 | 默认 |
| --- | --- | --- |
| `PORT` | 服务端口 | `3000` |
| `DATA_DIR` | 本地 JSON 存储目录（本地运行用） | `./data` |
| `UPSTASH_REST_URL` | Upstash Redis REST 地址（启用云存储） | 空 |
| `UPSTASH_REST_TOKEN` | Upstash Redis Token | 空 |

## 副本格式

一个副本 = `title / author / description / coverColor / config`。
`config` 包含：

- `name` 主角名，`startAge` 起始年龄，`maxAge` 最大年龄，`year0` 起始年份
- `background` 开局旁白
- `stats` 属性初始值，`statMeta` 属性范围
- `freeActions` 自由行动（名称 + 效果）
- `events` 事件（触发年龄、概率、条件、选项及效果）
- `endings` 结局（达成条件）

条件语法：`金钱>=1000`、`健康<20 && 智力>=60`、`魅力>=70 || 幸运>=80`。
