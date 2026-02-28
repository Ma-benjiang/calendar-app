# Bug Fix Report - DevA Review

## 修复日期
2026-02-28

## 修复问题

### 1. 优先级权重不一致
**问题描述:**
- `ai-scheduler.ts` 中 `PRIORITY_WEIGHTS` 定义为: high=100, medium=50, low=25, none=10
- `task.ts` 中 `PRIORITY_WEIGHTS` 定义为: high=3, medium=2, low=1, none=0

这导致两个模块在排序任务时使用不同的权重标准，可能造成优先级排序行为不一致。

**修复方案:**
统一 `ai-scheduler.ts` 的权重值与 `task.ts` 保持一致：
```typescript
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};
```

**修改文件:**
- `/root/.openclaw/workspace/calendar-app/packages/core/src/ai-scheduler.ts` 第87-92行

---

### 2. 截止时间重复计算
**问题描述:**
- `calculateSlotScore()` 函数已包含截止时间匹配评分 (0-30分)
- `calculateUrgencyBonus()` 函数又额外计算了截止时间紧迫度加分 (0-20分)
- 在 `findBestSlot()` 中，这两个分数被相加，导致截止时间被重复计算

**修复方案:**
1. 移除 `findBestSlot()` 中对 `calculateUrgencyBonus()` 的调用
2. 删除未使用的 `calculateUrgencyBonus()` 函数

截止时间评分现在统一由 `calculateSlotScore()` 处理：
- 提前3天以上完成：+30分
- 提前1-3天完成：+20分
- 提前24小时内完成：+10分
- 逾期：-50分

**修改文件:**
- `/root/.openclaw/workspace/calendar-app/packages/core/src/ai-scheduler.ts` 第443-446行 (移除调用)
- `/root/.openclaw/workspace/calendar-app/packages/core/src/ai-scheduler.ts` 第476-490行 (删除函数)

---

## 验证建议

修复后请重新运行以下测试：
```bash
cd /root/.openclaw/workspace/calendar-app
pnpm test packages/core/tests/ai-scheduler.test.ts
pnpm test packages/core/tests/task.test.ts
```

确保：
1. 任务优先级排序在调度器和任务管理器中行为一致
2. 截止时间评分计算正确，不再重复加分

---

## 状态
✅ 已修复，等待重新审查
