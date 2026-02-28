# Sprint 1 实现说明 - 任务与待办清单集成

## 📁 创建的文件

### 1. packages/core/src/task.ts (577行)
任务核心逻辑模块，包含：

**类型定义:**
- `Task` - 任务实体接口
- `TaskStatus` - 任务状态类型 (todo/in-progress/completed/cancelled)
- `TaskPriority` - 优先级类型 (high/medium/low/none)
- `TaskRecurrenceRule` - 任务循环规则
- `CreateTaskInput` / `UpdateTaskInput` - 创建/更新输入类型
- `TaskFilter` - 筛选条件接口
- `TaskSortOption` - 排序选项

**TaskManager 类:**
- **CRUD 操作**: createTask, updateTask, deleteTask, getTaskById, getAllTasks
- **批量操作**: createTasks, deleteTasks, batchUpdateStatus
- **筛选排序**: filterTasks, sortTasks, queryTasks, getTasksForDate
- **状态操作**: startTask, completeTask, cancelTask, reopenTask, toggleTaskCompletion
- **日历关联**: scheduleTask, unscheduleTask, getUnscheduledTasks
- **子任务**: createSubTask, getSubTasks
- **标签项目**: getAllTags, getAllProjects
- **订阅变更**: subscribe/notifyListeners
- **存储**: loadFromStorage, exportToStorage

**工具函数:**
- getPriorityLabel, getPriorityColor, getStatusLabel

### 2. packages/core/tests/task.test.ts (614行)
单元测试文件，包含：

- **CRUD 操作测试**: createTask, updateTask, deleteTask
- **批量操作测试**: createTasks, deleteTasks, batchUpdateStatus
- **筛选排序测试**: filterTasks, sortTasks, queryTasks
- **状态操作测试**: completeTask, startTask, cancelTask, reopenTask, toggleTaskCompletion
- **日历关联测试**: scheduleTask, unscheduleTask, getTasksForDate, getUnscheduledTasks
- **子任务测试**: createSubTask, getSubTasks
- **标签项目测试**: getAllTags, getAllProjects
- **存储操作测试**: loadFromStorage, exportToStorage
- **订阅测试**: subscribe
- **工具函数测试**: getPriorityLabel, getPriorityColor, getStatusLabel

### 3. packages/ui/src/TaskList.tsx (593行)
任务列表视图组件，包含：

**组件:**
- `TaskList` - 主任务列表组件
- `TaskItem` - 单个任务项组件
- `QuickAdd` - 快速添加任务输入框

**功能特性:**
- 快速添加任务（支持优先级选择）
- 任务完成状态切换
- 任务筛选（状态、搜索）
- 任务排序（日期、优先级、创建时间）
- 分组视图（按状态分组）
- 任务拖拽支持
- 任务编辑（双击标题）
- 标签和项目显示
- 截止日期格式化（今天/明天/相对日期）
- 空状态展示

**Props 接口:**
```typescript
interface TaskListProps {
  tasks: Task[];
  onCreateTask?: (input: CreateTaskInput) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
  onToggleComplete?: (id: string) => void;
  onScheduleTask?: (id: string, start: Date, end?: Date) => void;
  onTaskClick?: (task: Task) => void;
  onTaskDragStart?: (task: Task) => void;
  filter?: TaskFilter;
  sortBy?: TaskSortOption;
  viewMode?: 'list' | 'grouped';
  showAddInput?: boolean;
  className?: string;
}
```

### 4. 修改 packages/core/src/events.ts
添加了任务与事件的转换方法：

**新增方法:**
- `convertTaskToEvent(task, options)` - 将任务转换为日历事件
- `convertEventToTaskInput(event, options)` - 将事件转换为任务输入数据
- `findConflictingEvents(task, excludeEventId)` - 查找与任务时间冲突的事件
- `findAvailableTimeSlots(durationMinutes, startFrom, maxResults)` - 查找可用时间段

**辅助方法:**
- `buildEventDescription(task)` - 构建事件描述
- `getPriorityColor(priority)` - 获取优先级颜色
- `extractTagsFromText(text)` - 从文本中提取标签

### 5. 修改 packages/core/src/calendar.ts
添加了对 task.ts 的重新导出：
```typescript
export * from './task';
```
这样 UI 组件可以通过 `import { Task, TaskManager } from '@calendar/core'` 访问任务类型。

## ✅ 实现的功能对照

| PRD 需求 | 实现状态 | 相关文件 |
|---------|---------|---------|
| Task 数据模型 | ✅ | task.ts - Task 接口 |
| TaskManager 类 | ✅ | task.ts - TaskManager |
| 任务CRUD | ✅ | TaskManager + 测试 |
| 任务筛选排序 | ✅ | filterTasks, sortTasks, queryTasks |
| 任务状态操作 | ✅ | complete/start/cancel/reopen/toggle |
| 任务-日历关联 | ✅ | scheduleTask, unscheduleTask |
| 子任务支持 | ✅ | createSubTask, getSubTasks |
| 任务转事件 | ✅ | events.ts - convertTaskToEvent |
| 事件转任务 | ✅ | events.ts - convertEventToTaskInput |
| 冲突检测 | ✅ | events.ts - findConflictingEvents |
| 空闲时段查找 | ✅ | events.ts - findAvailableTimeSlots |
| 任务列表UI | ✅ | TaskList.tsx |
| 快速添加 | ✅ | QuickAdd 组件 |
| 任务筛选UI | ✅ | 状态标签、搜索框 |
| 分组视图 | ✅ | viewMode='grouped' |
| 拖拽支持 | ✅ | draggable + onDragStart |
| 单元测试 | ✅ | task.test.ts - 614行测试代码 |

## 🔧 技术要点

1. **类型安全**: 使用 TypeScript 严格类型，所有接口和类型都有完整定义
2. **代码风格**: 参考现有 EventManager 的实现风格，保持一致性
3. **可测试性**: TaskManager 不依赖外部存储，易于单元测试
4. **事件订阅**: 使用观察者模式，支持订阅任务变更
5. **日期处理**: 正确处理 Date 对象的序列化和反序列化

## 📋 下一步建议 (Sprint 2)

1. 添加 StorageManager 扩展以支持任务持久化
2. 创建 useTasks Hook 用于 React 集成
3. 实现任务循环规则 (TaskRecurrenceRule) 的实例生成
4. 添加智能安排算法 (smartSchedule.ts)
5. 实现任务统计看板组件
6. 添加拖拽排序功能

## 🚀 运行测试

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 或单独运行任务测试
npx vitest run packages/core/tests/task.test.ts
```
