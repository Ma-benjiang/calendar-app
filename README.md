# 跨平台日历应用

## 技术栈
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **跨平台**:
  - Web: PWA
  - Desktop: Electron
  - Mobile: Capacitor
- **存储**: localStorage (Web) / SQLite (Desktop)

## 项目结构
```
calendar-app/
├── apps/
│   ├── web/          # PWA Web 应用
│   ├── desktop/      # Electron 桌面应用
│   └── mobile/       # Capacitor 移动端
├── packages/
│   ├── ui/           # 共享 UI 组件
│   ├── core/         # 核心逻辑（日历计算、事件管理）
│   └── storage/      # 存储抽象层
└── shared/
    ├── types/        # TypeScript 类型定义
    └── constants/    # 常量配置
```

## 核心功能
- [x] 月视图、周视图、日视图
- [x] 事件创建、编辑、删除
- [x] 提醒通知
- [x] 跨平台数据同步
- [x] 离线支持
