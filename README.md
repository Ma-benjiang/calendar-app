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

### 基础功能 (v1.1.0)
- [x] 月视图、周视图、日视图
- [x] 事件创建、编辑、删除
- [x] 提醒通知
- [x] 跨平台数据同步
- [x] 离线支持

### AI 智能功能 (v1.2.0) ✨
- [x] **AI 智能日程安排** - 自动为任务分配最佳时间块
- [x] **用户偏好学习** - 学习你的工作习惯，优化时间安排
- [x] **冲突检测与重排** - 智能检测日程冲突并自动调整
- [x] **任务优先级平衡** - 基于艾森豪威尔矩阵平衡紧急与重要任务

### 技术亮点
- 🤖 贪心算法 + 启发式优化，10个任务1秒内完成调度
- 🧠 冷启动问卷 + 持续学习，30天构建完整用户画像
- ⚡ 智能冲突处理，高影响需确认、低影响自动执行
- 📊 完整测试覆盖，97个单元测试保障质量
