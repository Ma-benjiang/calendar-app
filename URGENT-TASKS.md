# 🚨 紧急修复任务分工

## 当前阻塞：CI 构建失败
**截止时间：** 今晚 24:00 前完成

---

## 任务分配

### 🔴 DevA - AI Scheduler 核心修复
**文件：** `packages/core/src/ai-scheduler.ts`
**问题：**
- `scheduleTasks()` 参数类型不匹配（测试传 0 个，实现要 2-3 个）
- `previewSchedule()` 返回值结构错误
- `getDefaultPreferences()` 缺少 `maxDailyTasks` 字段

**验收标准：**
```typescript
// 测试期望的调用方式
scheduler.scheduleTasks()  // 无参
scheduler.previewSchedule()  // 返回 { scheduled, metadata }
getDefaultPreferences().maxDailyTasks  // 返回 8
```

---

### 🟠 DevB - 测试文件修复
**文件：**
- `packages/core/tests/task.test.ts`
- `packages/core/tests/ai-scheduler.test.ts`

**问题：**
- `afterEach is not defined` → 缺少 `import { afterEach } from 'vitest'`
- `priority` 字段必填但测试没传
- `ScheduleResult` 等类型未导出

**验收标准：** 测试能正常跑，失败率 < 20%

---

### 🟡 DevC - 包依赖修复
**文件：**
- `packages/*/package.json`
- `apps/*/tsconfig.json`

**问题：**
- `@calendar/core` 等 workspace 包引用失败
- TypeScript 路径映射配置错误

**验收标准：** `pnpm build:web` 无 "Cannot find module" 错误

---

### 🟢 DevD - 类型清理
**文件：** `packages/core/src/index.ts`

**问题：**
- 重复导出：`RecurrenceFrequency`, `TaskType`, `Conflict`
- 未使用的变量导致 lint 警告

**验收标准：** `pnpm lint` 0 错误

---

## 协作流程

1. **DevA & DevB 先对齐 API 设计** → 避免改了实现又改测试
2. **DevC 在 #2 完成后启动** → 确保代码能编译再修依赖
3. **DevD 最后收尾** → 清理残留问题

## 检查点

- [ ] 21:30 - DevA/B API 对齐会议
- [ ] 22:00 - 第一轮提交，CI 跑起来
- [ ] 23:00 - 所有子任务完成
- [ ] 23:30 - 最终验证通过

---

**有问题立即在群里 @ 我**
