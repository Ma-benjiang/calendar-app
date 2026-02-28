# 日历应用 - 开发指南

## 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd calendar-app

# 安装依赖
npm install

# 启动 Web 开发服务器
npm run dev:web

# 启动桌面端（需先构建 Web）
npm run dev:desktop
```

## 项目结构

```
calendar-app/
├── apps/
│   ├── web/          # PWA Web 应用 (Vite)
│   ├── desktop/      # Electron 桌面应用
│   └── mobile/       # Capacitor 移动端 (TODO)
├── packages/
│   ├── core/         # 核心逻辑 (日历计算、事件管理)
│   ├── ui/           # React UI 组件
│   └── storage/      # 存储抽象层
└── shared/
    └── types/        # TypeScript 类型定义
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev:web` | 启动 Web 开发服务器 |
| `npm run build:web` | 构建 Web 应用 |
| `npm run dev:desktop` | 启动 Electron 开发 |
| `npm run build:desktop` | 构建桌面应用 |
| `npm test` | 运行单元测试 |
| `npm run lint` | 代码检查 |
| `npm run format` | 代码格式化 |

## 架构说明

### 核心模块 (@calendar/core)

- **CalendarCore**: 日历计算工具类
- **EventManager**: 事件 CRUD 和订阅管理
- **utils**: 通用工具函数

### UI 模块 (@calendar/ui)

- **MonthView**: 月视图组件
- **WeekView**: 周视图组件
- **DayView**: 日视图组件
- **EventForm**: 事件编辑表单
- **useCalendar**: React Hook 封装

### 存储模块 (@calendar/storage)

- **StorageAdapter**: 存储接口
- **LocalStorageAdapter**: Web 端适配器
- **ElectronSQLiteAdapter**: 桌面端适配器

## 添加新功能

1. 在 `packages/core/src` 添加核心逻辑
2. 在 `packages/ui/src` 添加 UI 组件
3. 在 `packages/core/tests` 添加测试
4. 更新文档

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing`)
5. 创建 Pull Request
