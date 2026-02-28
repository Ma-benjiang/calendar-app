# Changelog

所有项目的显著变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.2.5] - 2026-02-28

### 修复
- 添加 `pnpm-workspace.yaml` 文件
  - pnpm 不支持 package.json 中的 `workspaces` 字段
  - 创建 pnpm-workspace.yaml 定义工作空间
  - 修复 CI 中 `pnpm install` 失败问题

## [1.2.4] - 2026-02-28

### 修复
- 添加 eslint 配置到子项目
  - apps/web: eslint + react hooks
  - packages/core: eslint + typescript
- 恢复 CI lint 阶段（代码质量保障）
- 创建 packages/core/package.json

## [1.2.3] - 2026-02-28

### 修复
- 移除 CI lint 阶段（子项目缺少 eslint 配置）
- 直接运行 test → build → release

## [1.2.2] - 2026-02-28

### 修复
- 修复 CI/CD desktop 构建依赖问题
  - Desktop 构建依赖 web/dist，添加 build-web 依赖
  - 在 apps/desktop 目录安装依赖

## [1.2.1] - 2026-02-28

### 修复
- 修复 CI/CD 构建脚本缺失问题
  - 添加 `build:web` 脚本
  - 添加 `build:desktop` 脚本
- 修复包管理器不匹配问题
  - CI 从 npm 切换到 pnpm
  - 添加 pnpm/action-setup@v4

### 变更
- 清理 GitHub 仓库，移除内部文档
  - 移除 PRD、TECH-SPEC、RESEARCH 等内部文档
  - 更新 .gitignore 防止误提交
- 简化 GitHub Actions 配置

## [1.2.0] - 2026-02-28

### 新增 (AI 智能日程安排)
- AI 智能调度系统
  - 添加 AIScheduler 核心类
  - 实现贪心调度算法
  - 支持任务优先级排序
  - 自动冲突检测与解决
  - 调度预览功能
- 用户偏好学习系统
  - 添加 UserPreferenceStore 类
  - 冷启动引导（5问题问卷）
  - 从用户行为学习高效时段
  - 每周效率报告生成
- 冲突解决模块
  - 添加 ConflictResolver 类
  - 检测时间重叠、缓冲不足、截止风险、单日过载
  - 自动重新调度冲突任务
  - 生成解决建议
- AI 调度测试套件
  - AIScheduler 单元测试
  - UserPreference 测试
  - ConflictResolver 测试

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

[1.2.0]: https://github.com/username/calendar-app/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/username/calendar-app/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/username/calendar-app/releases/tag/v1.0.0
