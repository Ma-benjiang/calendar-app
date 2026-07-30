# Pie - Notion 风格日历应用

[![Version](https://img.shields.io/github/v/release/Ma-benjiang/calendar-app?label=version)](https://github.com/Ma-benjiang/calendar-app/releases)
[![CI](https://github.com/Ma-benjiang/calendar-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Ma-benjiang/calendar-app/actions)

> 🥧 A Notion-style calendar and task app
> 一款 Notion 风格的日历与任务应用

## 下载

| 平台 | 下载 |
|------|------|
| 🍎 macOS (Apple Silicon) | [Pie-1.4.0-arm64.dmg](https://github.com/Ma-benjiang/calendar-app/releases/latest/download/Pie-1.4.0-arm64.dmg) |
| 🪟 Windows | [Pie.Setup.1.4.0.exe](https://github.com/Ma-benjiang/calendar-app/releases/latest/download/Pie.Setup.1.4.0.exe) |
| 🐧 Linux | [Pie-1.4.0.AppImage](https://github.com/Ma-benjiang/calendar-app/releases/latest/download/Pie-1.4.0.AppImage) |

## 技术栈

- **桌面渲染层**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Notion 风格设计系统
- **State Management**: Zustand
- **桌面运行时**: Electron (macOS/Windows/Linux)
- **AI 模型接入**: Vercel AI SDK（LLM）+ Images API（生图）
- **存储**: SQLite（业务数据）+ localStorage（界面偏好）

## 项目结构

```
calendar-app/
├── apps/
│   ├── renderer/     # Electron 渲染层 (Vite + React)
│   └── desktop/      # Electron 桌面应用
├── packages/
│   ├── ui/           # 共享 UI 组件 (Notion 风格)
│   ├── core/         # 核心逻辑（日历计算、事件管理）
│   └── storage/      # 存储抽象层
└── shared/
    ├── types/        # TypeScript 类型定义
    └── constants/    # 常量配置
```

## 核心功能

### v1.4.0 - Notion 风格改造 🎨

- [x] **Notion 风格界面** - 侧边栏 + 内容区布局，类似 Notion 的操作体验
- [x] **命令面板** - `Cmd/Ctrl + K` 快速执行命令
- [x] **自然语言输入** - 支持 "明天下午3点开会" 快速创建事件
- [x] **拖拽调整** - 拖拽事件调整时间和时长
- [x] **内容块系统** - 事件详情支持富文本块

### 基础功能

- [x] 月视图、周视图、日视图
- [x] 事件创建、编辑、删除
- [x] 每日台历与 AI 文案、生图模型配置
- [x] 离线支持
- [x] 深色/浅色主题

### AI 模型

在“每日台历”右上角打开 AI 模型设置：

- 文案与 Prompt：配置 DeepSeek 模型 ID 和 API Key，使用 AI SDK 一次生成每日文案和无文字背景图 Prompt。
- 生图模型：配置火山引擎 Seedream 或 OpenAI GPT Image 2。

DeepSeek 和 Seedream 只需设置 API Key 与模型 ID，API Endpoint 由应用内置；OpenAI 生图额外支持配置 API Endpoint。手动填写的密钥保存在当前设备且不加密；公共设备建议使用环境变量。

也可以通过环境变量提供默认配置，环境变量中的密钥不会写入应用存储：

```bash
VITE_DEEPSEEK_API_KEY=your-deepseek-api-key
VITE_DEEPSEEK_MODEL=deepseek-v4-flash
VITE_DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/chat/completions

VITE_SEEDREAM_API_KEY=your-api-key
VITE_SEEDREAM_MODEL=doubao-seedream-5-0-260128
VITE_SEEDREAM_API_ENDPOINT=/volces-api/api/v3/images/generations

VITE_OPENAI_API_KEY=your-openai-api-key
```

### 时光相册

每日台历仅允许为当天生成。当天再次生成会覆盖原记录并清理旧图片，不保留同一天的多个版本；历史日期只读，未来日期不可进入或生成。

桌面端会将生成图片保存到本地应用数据目录，相册离线时仍可查看。点击相册中生成过台历的日期，会回到主界面显示对应台历；未生成的日期不可点击。

### 中国节假日

应用会静默同步中国法定节假日和调休工作日，并缓存到桌面 SQLite；
首次加载年份或缓存超过 30 天时后台更新，断网时继续使用最近一次成功同步的数据。

数据来自 [NateScarlet/holiday-cn](https://github.com/NateScarlet/holiday-cn)，
该项目根据国务院公告自动更新，采用 MIT License。

## 开发

```bash
# 安装依赖
pnpm install

# 启动 Vite 渲染层和 Electron
pnpm dev

# 构建
pnpm build:renderer # 仅构建桌面渲染资源
pnpm build:desktop  # 桌面应用

# 测试
pnpm test
pnpm test:coverage
```

## 发布

新版本通过 GitHub Actions 自动构建和发布：

1. 更新版本号 (`package.json`)
2. 打 tag: `git tag v1.x.x`
3. 推送到远程: `git push origin v1.x.x`
4. CI 自动构建并创建 Release

## License

MIT
