# 智慧110接处警模拟平台

> 教学演示系统，**不受理真实警情**。

## 已实现
- 主界面：**我要报警** / **警员登录** 两个入口
- 登录页：**警员入口** / **后台入口** 两个 Tab
- 报警人端：🎤 录音上报 → 浏览器采集 → 后端 ASR 转写 → 大模型抽取案发地/冲突类型/是否需 120 等 → 表单回填 → 人确认后提交
- 警员工作台：案件列表、一键派警、状态推进（已受理→已派警→赶赴中→现场处置→已结案）
- 报警人端进度条实时轮询

## 快速启动

### 1. 后端
```bash
cd server
npm install
copy .env.example .env   # Windows 用 copy，Mac/Linux 用 cp
npm run dev
# 跑在 http://localhost:3001
```
默认 `USE_MOCK=true`，**不需要任何 API Key 就能跑通全流程**（mock 模式会返回一段预设的报警转写和抽取结果，方便先演示 UI）。

### 2. 前端
```bash
cd web
npm install
npm run dev
# 打开 http://localhost:5173
```

## 接入真实 AI
编辑 `server/.env`：
- `USE_MOCK=false`
- `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`：豆包/DeepSeek/通义的 OpenAI 兼容配置（豆包示例：`https://ark.cn-beijing.volces.com/api/v3`）
- `VOLC_ASR_APP_ID` / `VOLC_ASR_ACCESS_TOKEN`：火山引擎语音识别（`services/asr.js` 里已留好接入点）

## 目录结构
```
smart-110-sim/
├── server/                 # Express 后端
│   ├── index.js            # 入口
│   ├── routes/case.js      # 案件接口（上传音频/列表/状态更新）
│   └── services/
│       ├── asr.js          # 语音识别（火山 / mock）
│       └── llm.js          # 大模型信息抽取
└── web/                    # Vue 3 + Vite + Element Plus
    └── src/
        ├── views/
        │   ├── Home.vue    # 主界面两个大卡片
        │   ├── Login.vue   # 警员/后台两个登录入口
        │   ├── Report.vue  # 报警人端 + 进度条
        │   └── Officer.vue # 警员工作台
        └── components/
            └── AudioReport.vue   # 🎤 录音 + ASR + AI 回填 核心组件
```

## 下一步可加
- Socket.IO 实时推送（替代轮询）
- 高德地图：警员位置 marker、案发地选点
- 案件结案后大模型自动生成卷宗初稿
- 大屏指挥视图
