# Pie - Notion 风格日历应用

[![Version](https://img.shields.io/github/v/release/Ma-benjiang/calendar-app?label=version)](https://github.com/Ma-benjiang/calendar-app/releases)
[![CI](https://github.com/Ma-benjiang/calendar-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Ma-benjiang/calendar-app/actions)

> 🥧 A Notion-style smart calendar app with natural language input and AI scheduling
> 一款 Notion 风格的智能日历应用，支持自然语言输入和 AI 智能调度

## 下载

| 平台 | 下载 |
|------|------|
| 🍎 macOS (Apple Silicon) | [Pie-1.4.0-arm64.dmg](https://github.com/Ma-benjiang/calendar-app/releases/latest/download/Pie-1.4.0-arm64.dmg) |
| 🪟 Windows | [Pie.Setup.1.4.0.exe](https://github.com/Ma-benjiang/calendar-app/releases/latest/download/Pie.Setup.1.4.0.exe) |
| 🐧 Linux | [Pie-1.4.0.AppImage](https://github.com/Ma-benjiang/calendar-app/releases/latest/download/Pie-1.4.0.AppImage) |

## 技术栈

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Notion 风格设计系统
- **State Management**: Zustand
- **跨平台**:
  - Web: Vite + PWA
  - Desktop: Electron (macOS/Windows/Linux)
- **存储**: localStorage (Web) / SQLite (Desktop)

## 项目结构

```
calendar-app/
├── apps/
│   ├── web/          # Web 应用 (Vite + React)
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

### AI 智能功能 (v1.2.0) ✨

- [x] **AI 智能日程安排** - 自动为任务分配最佳时间块
- [x] **用户偏好学习** - 学习你的工作习惯，优化时间安排
- [x] **冲突检测与重排** - 智能检测日程冲突并自动调整
- [x] **任务优先级平衡** - 基于艾森豪威尔矩阵平衡紧急与重要任务

### 基础功能

- [x] 月视图、周视图、日视图
- [x] 事件创建、编辑、删除
- [x] 提醒通知
- [x] 离线支持
- [x] 深色/浅色主题

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build:web      # Web 应用
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
