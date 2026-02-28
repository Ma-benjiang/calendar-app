# AI Scheduler 测试计划

**文档版本**: v1.0  
**创建日期**: 2026-02-28  
**QA Engineer**: Sprint 2 Phase 2  
**状态**: 待评审

---

## 1. 测试目标

验证 AI 智能日程安排核心功能的正确性、性能和可靠性，确保满足 PRD-AI.md 中定义的所有需求。

---

## 2. 测试范围

### 2.1 核心模块测试

| 模块 | 描述 | 测试重点 |
|------|------|----------|
| `AIScheduler` | AI 调度器主类 | 初始化、配置、调度入口 |
| `SchedulingEngine` | 调度算法引擎 | 时间块分配、任务排序 |
| `ConflictDetector` | 冲突检测器 | 重叠检测、缓冲检查 |
| `PreferenceLearner` | 偏好学习模块 | 高效时段学习、反馈处理 |
| `TimeSlotFinder` | 空闲时段查找 | 可用时间块计算 |

### 2.2 功能测试覆盖

- ✅ 智能时间块分配算法
- ✅ 任务优先级与截止时间平衡
- ✅ 冲突自动检测与重新安排
- ✅ 用户偏好学习（高效时段）
- ✅ 任务类型匹配（专注型/事务型/创意型/会议型）
- ✅ 艾森豪威尔矩阵集成
- ✅ 冷启动处理

### 2.3 非功能测试

- ⚡ 性能测试：10个任务 ≤ 1秒
- ⚡ 性能测试：100个任务 ≤ 3秒
- 🔒 边界条件：空日历、满日历、跨天时间
- 🔒 异常处理：无效输入、循环依赖

---

## 3. 测试策略

### 3.1 测试金字塔

```
       /\
      /  \     E2E 测试 (1-2个场景)
     /----\
    /      \   集成测试 (调度+日历+任务)
   /--------\ 
  /          \ 单元测试 (核心算法)
 /------------\
```

### 3.2 测试类型分布

| 类型 | 数量 | 占比 | 目标 |
|------|------|------|------|
| 单元测试 | 25+ | 80% | 核心算法正确性 |
| 集成测试 | 5 | 15% | 模块协作 |
| E2E 场景 | 2 | 5% | 完整用户流程 |

### 3.3 测试数据策略

**真实场景数据集：**
- `fixtures/normal-workday.json` - 标准工作日（8小时，3-5个会议）
- `fixtures/busy-day.json` - 繁忙日（会议密集，间隙少）
- `fixtures/empty-day.json` - 空闲日（无固定事件）
- `fixtures/cross-day.json` - 跨天任务场景

**任务组合：**
- 不同优先级组合（高/中/低）
- 不同时长组合（15min / 30min / 1h / 2h / 4h）
- 不同截止时间（今天/明天/本周/无截止）

---

## 4. 测试用例清单

### 4.1 AIScheduler 类单元测试 (8个)

| # | 用例名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 1 | should initialize with default config | 默认配置初始化 | P0 |
| 2 | should initialize with custom config | 自定义配置初始化 | P0 |
| 3 | should schedule single task | 单任务调度 | P0 |
| 4 | should schedule multiple tasks | 多任务批量调度 | P0 |
| 5 | should return confidence score | 返回置信度分数 | P1 |
| 6 | should provide scheduling reasons | 提供推荐理由 | P1 |
| 7 | should handle empty task list | 处理空任务列表 | P1 |
| 8 | should respect scheduler constraints | 遵守调度约束 | P1 |

### 4.2 调度算法正确性测试 (8个)

| # | 用例名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 9 | should schedule high priority tasks first | 高优先级优先 | P0 |
| 10 | should respect deadline constraints | 遵守截止时间 | P0 |
| 11 | should balance priority and deadline | 平衡优先级和截止 | P0 |
| 12 | should match task type to time slot | 任务类型匹配时段 | P1 |
| 13 | should schedule deep work in long blocks | 专注任务安排长时段 | P1 |
| 14 | should schedule admin tasks in gaps | 事务任务安排在间隙 | P1 |
| 15 | should handle Eisenhower matrix | 艾森豪威尔矩阵 | P1 |
| 16 | should sort by composite score | 综合分数排序 | P1 |

### 4.3 冲突检测测试 (6个)

| # | 用例名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 17 | should detect time overlap conflicts | 检测时间重叠 | P0 |
| 18 | should detect buffer time violations | 检测缓冲不足 | P0 |
| 19 | should detect deadline risks | 检测截止风险 | P1 |
| 20 | should auto-reschedule low priority | 自动重排低优先级 | P1 |
| 21 | should preserve fixed events | 保留固定事件 | P1 |
| 22 | should generate alternative slots | 生成替代时间槽 | P1 |

### 4.4 用户偏好学习测试 (6个)

| # | 用例名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 23 | should learn productive hours from feedback | 从反馈学习高效时段 | P0 |
| 24 | should initialize with cold start defaults | 冷启动默认值 | P0 |
| 25 | should update preferences weekly | 每周更新偏好 | P1 |
| 26 | should track task completion patterns | 跟踪完成模式 | P1 |
| 27 | should respect user manual overrides | 尊重手动覆盖 | P1 |
| 28 | should reset learning data on request | 重置学习数据 | P1 |

### 4.5 性能测试 (4个)

| # | 用例名称 | 描述 | 目标 |
|---|---------|------|------|
| 29 | should complete 10 tasks within 1s | 10任务1秒内 | ≤ 1000ms |
| 30 | should complete 50 tasks within 2s | 50任务2秒内 | ≤ 2000ms |
| 31 | should complete 100 tasks within 3s | 100任务3秒内 | ≤ 3000ms |
| 32 | should handle continuous scheduling | 连续调度不泄漏 | 稳定 |

---

## 5. 测试环境

### 5.1 技术栈

- **测试框架**: Vitest
- **断言库**: Vitest 内置
- **Mock 工具**: Vitest vi.fn()
- **性能测试**: console.time / performance.now

### 5.2 目录结构

```
packages/core/
├── src/
│   └── ai-scheduler.ts       # 待实现
├── tests/
│   ├── ai-scheduler.test.ts  # 本测试计划
│   └── fixtures/
│       ├── normal-workday.json
│       ├── busy-day.json
│       └── empty-day.json
```

---

## 6. 验收标准

### 6.1 覆盖率要求

| 指标 | 目标 | 最低 |
|------|------|------|
| 语句覆盖 | 90% | 80% |
| 分支覆盖 | 85% | 75% |
| 函数覆盖 | 95% | 85% |
| 行覆盖 | 90% | 80% |

### 6.2 性能基准

| 场景 | 目标 | 最大 |
|------|------|------|
| 10个任务调度 | ≤ 500ms | 1000ms |
| 50个任务调度 | ≤ 1500ms | 2000ms |
| 冲突检测 | ≤ 100ms | 200ms |
| 偏好学习更新 | ≤ 50ms | 100ms |

### 6.3 质量门禁

- [ ] 所有 P0 测试通过
- [ ] 代码覆盖率 ≥ 80%
- [ ] 性能测试全部达标
- [ ] 无内存泄漏（连续运行100次）

---

## 7. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 算法复杂度高 | 中 | 高 | 早期性能测试，必要时优化 |
| 偏好学习不准确 | 中 | 中 | 增加反馈机制，冷启动优化 |
| 冲突检测遗漏 | 低 | 高 | 边界条件全覆盖测试 |

---

## 8. 附录

### 8.1 相关文档

- PRD-AI.md - 产品需求
- TECH-SPEC-AI.md - 技术架构（待完成）
- Sprint1-Implementation.md - Sprint 1 实现参考

### 8.2 修订记录

| 日期 | 版本 | 作者 | 变更 |
|------|------|------|------|
| 2026-02-28 | v1.0 | QA Engineer | 初始版本 |

---

*本测试计划作为 Phase 2 交付物，为 Phase 3 并行开发提供测试先行基础。*
