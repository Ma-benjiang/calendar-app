# Changelog

所有项目的显著变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

## [1.1.0] - 2026-02-28

### 新增
- 任务与待办清单集成
  - 添加 Task 数据模型和 TaskManager 类
  - 实现任务列表 UI 组件 (TaskList)
  - 支持任务与日历事件关联
  - 添加完整单元测试
  - 实现拖拽和状态管理
- 任务优先级系统（高/中/低）
- 任务状态流转（待办/进行中/已完成/已取消）
- 任务截止日期和提醒功能

### 变更
- 优化日历事件管理，支持与任务关联
- 增强事件数据模型以支持任务引用

## [1.0.0] - 2025-02-27

### 新增
- 项目初始版本
- 日历核心功能
- 事件管理（创建、编辑、删除）
- 重复事件支持
- 时区处理
- 通知提醒功能
- 数据导出功能

[未发布]: https://github.com/username/calendar-app/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/username/calendar-app/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/username/calendar-app/releases/tag/v1.0.0
