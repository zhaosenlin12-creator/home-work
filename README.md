# 🌳 森灵 · 家庭学习系统

> 面向儿童家庭的本地全栈学习管理平台 · Next.js 15 + SQLite 单文件部署

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue?logo=sqlite)](https://www.sqlite.org)
[![License](https://img.shields.io/badge/license-MIT-green)]()

一个以**家长监管 + 孩子自主**为核心的家庭学习陪伴系统。通过任务计划、积分奖励、虚拟花园与宠物养成，把"完成任务"变成孩子愿意主动参与的游戏化体验。

---

## ✨ 核心特性

### 🎯 双端协同
- **家长端**：任务布置、积分奖励、学习计划、勋章授予、孩子进度看板
- **孩子端**：任务执行、积分赚取、勋章收集、番茄钟专注、虚拟养成（花园/宠物）、错题本

### 🎮 游戏化设计
- **我的小农场**：9 地块种菜、浇水、施肥、收获闭环；专业游戏化场景（太阳、彩虹、小木屋、栅栏、动态蝴蝶）
- **虚拟宠物**：100+ 稀有宠物图鉴；喂养升级、积分购买
- **勋章墙**：家长创建/分发，孩子勋章墙实时显示

### 🛠 工具能力
- **番茄钟**：25/5 分钟 + 休息模式；4 状态机（运行/暂停/继续/停止/重置）；时间到 Web Speech API 中文语音 + 蜂鸣音 + 系统通知三重提醒
- **AI 助教**：基于 DeepSeek 的对话式学习问答
- **AI 出题**：根据错题自动生成练习题
- **国家教材**：内置 TapXWorld/ChinaTextbook 全套人教版 PDF，多源代理（GitHub Raw + 国内镜像）

### 🛡 安全可靠
- 全栈 TypeScript（0 错误）
- 所有 API 边界处理：401/403/400/404 + 友好中文提示
- SQL 注入防护：白名单字段 + 参数化绑定
- npm audit 0 漏洞
- 单元测试覆盖状态机核心逻辑

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 22（推荐 22.22+）
- npm ≥ 10
- 约 200MB 磁盘（含宠物图库）

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器（http://localhost:3101）
npm run dev

# 首次启动会自动：
# 1. 创建 SQLite 数据库 data/senlin.db
# 2. 初始化表结构
# 3. 写入示例数据（家长账号 demo/123456，孩子账号 小森/123456、小灵/123456）
```

### 生产构建
```bash
npm run build
npm start  # 默认 3101 端口
```

### 环境变量
复制 `.env.example` 为 `.env` 并填写：

```env
# DeepSeek API（AI 助教/AI 出题，可选）
DEEPSEEK_API_KEY=sk-xxx

# 可选：覆盖数据库文件路径
SENLIN_DB_FILE=senlin.db
```

---

## 🏗 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 15.5 (App Router) + React 19 |
| 语言 | TypeScript 5.7（严格模式，零 any） |
| 数据库 | SQLite 3（node:sqlite 内置） |
| 样式 | Tailwind CSS 4 + CSS Modules（自定义品牌色） |
| 图标 | lucide-react（矢量图标，禁用 emoji 作 UI） |
| 字体 | 系统字体（无外部字体依赖） |
| AI | DeepSeek API（对话 + 出题） |
| 部署 | 单进程 Node.js，可 Docker /  / 系统服务 |

---

## 📁 项目结构

```
src/
├── app/                           # Next.js App Router
│   ├── api/                       # 后端 API 路由（45 个端点）
│   │   ├── auth/                  # 登录/登出/会话
│   │   ├── children/              # 孩子管理
│   │   ├── tasks/                 # 任务 CRUD + 审批
│   │   ├── badges/                # 勋章 + 分发
│   │   ├── study-plans/           # 学习计划 + 审核
│   │   ├── garden/                # 花园（种植/浇水/施肥/收获）
│   │   ├── pet/                   # 宠物 + 商店
│   │   ├── pomodoro/              # 番茄钟
│   │   ├── rewards/               # 奖励
│   │   ├── ai/                    # AI 助教 + 出题
│   │   ├── textbooks/             # 教材代理
│   │   └── ...                    # 其他模块
│   ├── kid/                       # 孩子端页面（10+ 页）
│   ├── parent/                    # 家长端页面（6 页）
│   ├── login/                     # 登录页
│   ├── globals.css                # 全局样式 + 农场场景
│   └── layout.tsx                 # 根布局
├── components/                    # 共享组件
│   ├── Avatar.tsx                 # 头像（图片 → emoji → 首字 三级回退）
│   └── BadgeIcon.tsx              # 勋章图标（lucide 名 + emoji 兼容）
├── lib/                           # 共享库
│   ├── db.ts                      # SQLite 单例 + 自动建表 + 迁移
│   ├── auth.ts                    # 会话 + 权限校验（家长/孩子）
│   ├── validate.ts                # 参数校验
│   ├── seed.ts                    # 首次启动自动 seed
│   ├── pet-image.ts               # 宠物图库映射
│   ├── garden-svg.ts              # 花园矢量插画
│   ├── garden-assets.tsx          # 花园 React 组件
│   ├── garden-shop.ts             # 花园商店道具
│   └── points-context.tsx         # 积分 Context
└── middleware.ts                  # 全局中间件
public/
└── pets/                          # 1000+ 宠物图（cwk/rabbits/cats）
data/
├── senlin.db                      # SQLite 数据库（gitignore）
└── textbook_cache/                # 教材 PDF 缓存（gitignore）
```

---

## 👥 用户系统

### 家长
- 账号 + 密码登录
- 创建多个孩子账号（每个孩子有独立用户名/密码/头像/年级）
- 给孩子布置任务、布置学习计划、创建奖励、授予勋章
- 审核孩子完成的任务（防刷分）

### 孩子
- 用户名 + 密码登录（无家长账号冲突）
- 看任务墙、完成得积分（需审核的任务家长确认）
- 花园种菜、宠物养成、番茄钟专注、AI 助教
- 勋章墙、错题本、奖励兑换

---

## 📊 数据模型（核心表）

| 表 | 说明 |
|---|---|
| users | 家长账号 |
| children | 孩子账号（关联家长） |
| tasks | 任务（todo / pending / done，含 needs_review 审核标记） |
| study_plans | 学习计划（周计划 + 任务关联） |
| study_plan_logs | 计划打卡记录 |
| garden_plants | 花园植物（9 地块 × 6 作物 × 5 阶段） |
| garden_inventory | 道具库存（化肥等） |
| pets | 宠物（含 is_active 激活态、level/exp/hunger/happiness） |
| pomodoro_sessions | 番茄钟记录 |
| diaries | 孩子日记 |
| rewards | 家长创建的可兑换奖励 |
| reward_claims | 兑换记录 |
| badges | 家长创建的勋章（自定义图标/描述） |
| child_badges | 孩子获得的勋章 |
| wrong_questions | 错题本 |
| exercises + exercise_items | AI 出题练习 |
| textbooks | 教材 PDF 元数据（缓存路径） |

完整建表语句见 `src/lib/db.ts` 的 `initSchema`。

---

## 🔌 API 概览（共 45 个端点）

| 模块 | 主要端点 |
|---|---|
| 认证 | POST /api/auth, POST /api/auth/logout, GET /api/auth/me |
| 孩子 | GET/POST /api/children, PATCH/DELETE /api/children/[id] |
| 任务 | GET/POST /api/tasks, POST /api/tasks/[id] (complete/approve/reject) |
| 学习计划 | GET/POST /api/study-plans, DELETE/PATCH /api/study-plans/[id], POST /api/study-plans/review |
| 勋章 | GET/POST/DELETE /api/badges, POST/DELETE /api/badges/grant |
| 花园 | GET/POST /api/garden, POST /api/garden/water/fertilize/harvest/buy, DELETE /api/garden/plant/[id] |
| 宠物 | GET/POST /api/pet, POST /api/pet/adopt/feed/switch, GET/POST /api/pet/shop/buy |
| 番茄钟 | GET/POST /api/pomodoro |
| 奖励 | GET/POST/DELETE /api/rewards, POST /api/rewards/claim, GET /api/rewards/claims |
| AI | POST /api/ai/chat, POST /api/ai/generate-tasks |
| 教材 | GET /api/textbooks, GET /api/textbooks/proxy |
| 错题/练习 | GET/POST /api/wrong-questions, GET /api/exercises, POST /api/exercises/[id]/submit |
| 仪表盘 | GET /api/kid/summary, GET /api/parent/overview |

---

## 🧪 验证结果

| 项 | 结果 |
|---|---|
| TypeScript 编译 | ✅ 0 错误 |
| 生产构建 | ✅ 59 静态页 + 全部路由编译 |
| npm audit | ✅ 0 漏洞 |
| API 边界处理 | ✅ 401/400/403/404 + 友好中文提示 |
| 核心闭环 | ✅ 任务 → 审核 → 积分 / 种植 → 浇水 → 施肥 → 收获 / 勋章创建 → 分发 → 学生可见 |
| 防刷 | ✅ 重复完成任务不重复加分 |
| 单元测试 | ✅ 番茄钟状态机 11/11 通过 |

---

## 🛠 部署指南

### 家用（局域网，推荐）—— 双击即用

Windows 用户直接双击 **`start.bat`**，脚本会自动完成：装依赖（首次）→ 构建（首次）→ 预下载三年级教材（首次）→ 启动服务，并打印手机访问地址。

```text
* 本机访问:   http://localhost:3101
* 手机访问:   http://192.168.x.x:3101   （手机连同一 Wi-Fi）
```

> 首次会提示 Windows 防火墙放行 Node.js，选择「允许」即可让手机访问。
> 关闭命令行窗口即停止服务。

### 手动部署（单进程）
```bash
npm install --production
npm run build
PORT=3101 npm start
```

### Docker（参考）
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY .next ./.next
COPY public ./public
COPY data ./data  # 持久化目录
EXPOSE 3101
CMD ["npm", "start"]
```

数据持久化：挂载 `data/` 到宿主机（包含 senlin.db 和 textbook_cache）。

### 教材加载说明
- 教材 PDF 不随仓库分发（版权原因），由 `/api/textbooks/proxy` 按需下载缓存
- 下载源：**jsDelivr CDN（国内快，≤50MB）→ GitHub Raw（兜底）**，自动多源回退
- 首次部署建议预下载常用教材（三年级语数英）：
  ```bash
  node scripts/predownload-textbooks.mjs        # 核心 6 本
  node scripts/predownload-textbooks.mjs --all  # 全部教材（量大，慎重）
  ```
- 首次在线加载单本教材约 3-10 秒，之后命中本地缓存即时打开

### 首次访问
- 打开 `http://your-host:3101/login`
- 默认家长账号：**demo / 123456**
- 默认孩子账号：**小森 / 123456**（小灵 / 123456）

> **生产环境务必修改默认密码**（家长端 → 孩子管理 → 编辑）。

---

## 🤝 贡献

欢迎提交 Issue 和 PR。开发前请阅读 `src/lib/auth.ts` 理解权限模型（`requireAnyUser` / `requireParent` / `requireChild`）。

---

## 📄 License

MIT