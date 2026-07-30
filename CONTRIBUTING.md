# 日历应用 - 开发指南

## 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd calendar-app

# 安装依赖
pnpm install

# 同时启动 Vite 渲染层和 Electron
pnpm dev
```

## 项目结构

```
calendar-app/
├── apps/
│   ├── renderer/     # Electron 渲染层 (Vite + React)
│   └── desktop/      # Electron 桌面应用
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
| `pnpm dev` | 启动渲染层和 Electron |
| `pnpm build:renderer` | 构建桌面渲染资源 |
| `pnpm build:desktop` | 构建桌面安装包 |
| `pnpm test` | 运行单元测试 |
| `pnpm lint` | 代码检查 |
| `pnpm version:set 1.5.0` | 同步所有工作区版本 |
| `pnpm version:check` | 校验工作区及 Release Tag 版本 |

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
- **LocalStorageAdapter**: 浏览器开发环境回退适配器
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

Pull Request 通过 CI 并合并到 `master` 后，维护者才可在该合并提交上创建 `v*` 发布标签。功能分支不应直接创建发布标签。
