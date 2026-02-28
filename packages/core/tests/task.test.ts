import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TaskManager, 
  Task, 
  TaskStatus, 
  TaskPriority,
  CreateTaskInput,
  TaskFilter,
  getPriorityLabel,
  getPriorityColor,
  getStatusLabel 
} from '../src/task';

describe('TaskManager', () => {
  let manager: TaskManager;

  beforeEach(() => {
    manager = new TaskManager();
  });

  // ========== CRUD 操作测试 ==========

  describe('createTask', () => {
    it('should create task with default values', () => {
      const input: CreateTaskInput = {
        title: 'Test Task',
      };
      
      const task = manager.createTask(input);
      
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('todo');
      expect(task.tags).toEqual([]);
      expect(task.priority).toBeUndefined();
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should create task with all properties', () => {
      const dueDate = new Date('2026-03-01');
      const input: CreateTaskInput = {
        title: 'Full Task',
        description: 'Description',
        dueDate,
        estimatedMinutes: 60,
        priority: 'high',
        project: 'Project A',
        tags: ['urgent', 'work'],
        color: '#ff0000',
      };
      
      const task = manager.createTask(input);
      
      expect(task.title).toBe('Full Task');
      expect(task.description).toBe('Description');
      expect(task.dueDate).toEqual(dueDate);
      expect(task.estimatedMinutes).toBe(60);
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('high');
      expect(task.project).toBe('Project A');
      expect(task.tags).toEqual(['urgent', 'work']);
      expect(task.color).toBe('#ff0000');
    });

    it('should generate unique ids for each task', () => {
      const task1 = manager.createTask({ title: 'Task 1' });
      const task2 = manager.createTask({ title: 'Task 2' });
      
      expect(task1.id).not.toBe(task2.id);
    });

    it('should notify listeners when task is created', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      
      manager.createTask({ title: 'New Task' });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateTask', () => {
    it('should update task properties', () => {
      const task = manager.createTask({ title: 'Original Title' });
      
      const updated = manager.updateTask(task.id, { title: 'Updated Title' });
      
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.id).toBe(task.id);
    });

    it('should update updatedAt timestamp', () => {
      const task = manager.createTask({ title: 'Task' });
      const originalUpdatedAt = task.updatedAt;
      
      // 稍微等待确保时间变化
      vi.advanceTimersByTime(10);
      
      const updated = manager.updateTask(task.id, { title: 'Updated' });
      
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should return null for non-existent task', () => {
      const result = manager.updateTask('non-existent', { title: 'New Title' });
      expect(result).toBeNull();
    });

    it('should not allow modifying id or createdAt', () => {
      const task = manager.createTask({ title: 'Task' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;
      
      const updated = manager.updateTask(task.id, { 
        id: 'new-id' as any,
        createdAt: new Date('2020-01-01') 
      });
      
      expect(updated?.id).toBe(originalId);
      expect(updated?.createdAt).toEqual(originalCreatedAt);
    });
  });

  describe('deleteTask', () => {
    it('should delete existing task', () => {
      const task = manager.createTask({ title: 'To Delete' });
      
      expect(manager.getAllTasks().length).toBe(1);
      
      const deleted = manager.deleteTask(task.id);
      
      expect(deleted).toBe(true);
      expect(manager.getAllTasks().length).toBe(0);
    });

    it('should return false for non-existent task', () => {
      const result = manager.deleteTask('non-existent');
      expect(result).toBe(false);
    });

    it('should notify listeners when task is deleted', () => {
      const task = manager.createTask({ title: 'To Delete' });
      const listener = vi.fn();
      manager.subscribe(listener);
      
      manager.deleteTask(task.id);
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTaskById', () => {
    it('should return task by id', () => {
      const task = manager.createTask({ title: 'Find Me' });
      
      const found = manager.getTaskById(task.id);
      
      expect(found).toEqual(task);
    });

    it('should return undefined for non-existent id', () => {
      const found = manager.getTaskById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  // ========== 批量操作测试 ==========

  describe('batch operations', () => {
    it('should create multiple tasks', () => {
      const inputs: CreateTaskInput[] = [
        { title: 'Task 1' },
        { title: 'Task 2' },
        { title: 'Task 3' },
      ];
      
      const tasks = manager.createTasks(inputs);
      
      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
      expect(tasks[2].title).toBe('Task 3');
    });

    it('should delete multiple tasks', () => {
      const task1 = manager.createTask({ title: 'Task 1' });
      const task2 = manager.createTask({ title: 'Task 2' });
      const task3 = manager.createTask({ title: 'Task 3' });
      
      const deletedCount = manager.deleteTasks([task1.id, task2.id]);
      
      expect(deletedCount).toBe(2);
      expect(manager.getAllTasks()).toHaveLength(1);
      expect(manager.getTaskById(task3.id)).toBeDefined();
    });

    it('should batch update status', () => {
      const task1 = manager.createTask({ title: 'Task 1' });
      const task2 = manager.createTask({ title: 'Task 2' });
      
      const updated = manager.batchUpdateStatus([task1.id, task2.id], 'completed');
      
      expect(updated).toHaveLength(2);
      expect(updated[0].status).toBe('completed');
      expect(updated[1].status).toBe('completed');
    });
  });

  // ========== 筛选与排序测试 ==========

  describe('filterTasks', () => {
    beforeEach(() => {
      manager.createTask({ title: 'High Priority Task', priority: 'high', status: 'todo' });
      manager.createTask({ title: 'Medium Priority Task', priority: 'medium', status: 'in-progress' });
      manager.createTask({ title: 'Completed Task', priority: 'low', status: 'completed' });
      manager.createTask({ title: 'Tagged Task', priority: 'none', tags: ['work'], project: 'Project A' });
    });

    it('should filter by single status', () => {
      const filter: TaskFilter = { status: 'todo' };
      const filtered = manager.filterTasks(filter);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('High Priority Task');
    });

    it('should filter by multiple statuses', () => {
      const filter: TaskFilter = { status: ['todo', 'completed'] };
      const filtered = manager.filterTasks(filter);
      
      expect(filtered).toHaveLength(2);
    });

    it('should filter by priority', () => {
      const filter: TaskFilter = { priority: 'high' };
      const filtered = manager.filterTasks(filter);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].priority).toBe('high');
    });

    it('should filter by project', () => {
      const filter: TaskFilter = { project: 'Project A' };
      const filtered = manager.filterTasks(filter);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].project).toBe('Project A');
    });

    it('should filter by tags', () => {
      const filter: TaskFilter = { tags: ['work'] };
      const filtered = manager.filterTasks(filter);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].tags).toContain('work');
    });

    it('should filter by search query', () => {
      const filter: TaskFilter = { searchQuery: 'priority' };
      const filtered = manager.filterTasks(filter);
      
      expect(filtered.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('sortTasks', () => {
    it('should sort by priority descending', () => {
      manager.createTask({ title: 'Low', priority: 'low' });
      manager.createTask({ title: 'High', priority: 'high' });
      manager.createTask({ title: 'Medium', priority: 'medium' });
      
      const sorted = manager.sortTasks(manager.getAllTasks(), 'priority-desc');
      
      expect(sorted[0].priority).toBe('high');
      expect(sorted[1].priority).toBe('medium');
      expect(sorted[2].priority).toBe('low');
    });

    it('should sort by due date ascending', () => {
      manager.createTask({ title: 'Tomorrow', dueDate: new Date('2026-03-02') });
      manager.createTask({ title: 'Today', dueDate: new Date('2026-03-01') });
      manager.createTask({ title: 'No Date' });
      
      const sorted = manager.sortTasks(manager.getAllTasks(), 'dueDate-asc');
      
      expect(sorted[0].title).toBe('Today');
      expect(sorted[1].title).toBe('Tomorrow');
      expect(sorted[2].title).toBe('No Date');
    });

    it('should sort by createdAt descending', () => {
      manager.createTask({ title: 'First' });
      vi.advanceTimersByTime(100);
      manager.createTask({ title: 'Second' });
      
      const sorted = manager.sortTasks(manager.getAllTasks(), 'createdAt-desc');
      
      expect(sorted[0].title).toBe('Second');
      expect(sorted[1].title).toBe('First');
    });
  });

  describe('queryTasks', () => {
    it('should filter and sort combined', () => {
      manager.createTask({ title: 'High Later', priority: 'high', dueDate: new Date('2026-03-02') });
      manager.createTask({ title: 'High Today', priority: 'high', dueDate: new Date('2026-03-01') });
      manager.createTask({ title: 'Low Today', priority: 'low', dueDate: new Date('2026-03-01') });
      
      const result = manager.queryTasks(
        { priority: 'high' },
        'dueDate-asc'
      );
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('High Today');
      expect(result[1].title).toBe('High Later');
    });
  });

  // ========== 状态操作测试 ==========

  describe('status operations', () => {
    it('should complete task', () => {
      const task = manager.createTask({ title: 'To Complete' });
      
      const completed = manager.completeTask(task.id);
      
      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeInstanceOf(Date);
    });

    it('should start task', () => {
      const task = manager.createTask({ title: 'To Start' });
      
      const started = manager.startTask(task.id);
      
      expect(started?.status).toBe('in-progress');
    });

    it('should cancel task', () => {
      const task = manager.createTask({ title: 'To Cancel' });
      
      const cancelled = manager.cancelTask(task.id);
      
      expect(cancelled?.status).toBe('cancelled');
    });

    it('should reopen completed task', () => {
      const task = manager.createTask({ title: 'To Reopen' });
      manager.completeTask(task.id);
      
      const reopened = manager.reopenTask(task.id);
      
      expect(reopened?.status).toBe('todo');
      expect(reopened?.completedAt).toBeUndefined();
    });

    it('should toggle completion status', () => {
      const task = manager.createTask({ title: 'Toggle Test' });
      
      // 标记完成
      let result = manager.toggleTaskCompletion(task.id);
      expect(result?.status).toBe('completed');
      
      // 重新打开
      result = manager.toggleTaskCompletion(task.id);
      expect(result?.status).toBe('todo');
    });

    it('should return null when operating on non-existent task', () => {
      expect(manager.completeTask('non-existent')).toBeNull();
      expect(manager.startTask('non-existent')).toBeNull();
      expect(manager.cancelTask('non-existent')).toBeNull();
      expect(manager.reopenTask('non-existent')).toBeNull();
      expect(manager.toggleTaskCompletion('non-existent')).toBeNull();
    });
  });

  // ========== 日历关联测试 ==========

  describe('calendar integration', () => {
    it('should schedule task with explicit end time', () => {
      const task = manager.createTask({ title: 'Scheduled Task' });
      const start = new Date('2026-03-01T09:00:00');
      const end = new Date('2026-03-01T10:00:00');
      
      const scheduled = manager.scheduleTask(task.id, start, end);
      
      expect(scheduled?.scheduledStart).toEqual(start);
      expect(scheduled?.scheduledEnd).toEqual(end);
    });

    it('should schedule task using estimated duration', () => {
      const task = manager.createTask({ title: 'Duration Task', estimatedMinutes: 90 });
      const start = new Date('2026-03-01T09:00:00');
      
      const scheduled = manager.scheduleTask(task.id, start);
      
      expect(scheduled?.scheduledStart).toEqual(start);
      expect(scheduled?.scheduledEnd).toEqual(new Date('2026-03-01T10:30:00'));
    });

    it('should use default 30 minutes when no estimated duration', () => {
      const task = manager.createTask({ title: 'Default Duration' });
      const start = new Date('2026-03-01T09:00:00');
      
      const scheduled = manager.scheduleTask(task.id, start);
      
      expect(scheduled?.scheduledEnd).toEqual(new Date('2026-03-01T09:30:00'));
    });

    it('should unschedule task', () => {
      const task = manager.createTask({ title: 'Unschedule Task' });
      manager.scheduleTask(task.id, new Date('2026-03-01T09:00:00'));
      
      const unscheduled = manager.unscheduleTask(task.id);
      
      expect(unscheduled?.scheduledStart).toBeUndefined();
      expect(unscheduled?.scheduledEnd).toBeUndefined();
    });

    it('should return unscheduled tasks', () => {
      manager.createTask({ title: 'Unscheduled 1' });
      manager.createTask({ title: 'Unscheduled 2' });
      const scheduled = manager.createTask({ title: 'Scheduled' });
      manager.scheduleTask(scheduled.id, new Date('2026-03-01T09:00:00'));
      manager.createTask({ title: 'Completed', status: 'completed' });
      
      const unscheduled = manager.getUnscheduledTasks();
      
      expect(unscheduled).toHaveLength(2);
    });

    it('should get tasks for specific date', () => {
      const task1 = manager.createTask({ 
        title: 'Due Today', 
        dueDate: new Date('2026-03-01') 
      });
      const task2 = manager.createTask({ 
        title: 'Scheduled Today' 
      });
      manager.scheduleTask(task2.id, new Date('2026-03-01T10:00:00'));
      manager.createTask({ 
        title: 'Different Date', 
        dueDate: new Date('2026-03-02') 
      });
      
      const tasksForDate = manager.getTasksForDate(new Date('2026-03-01'));
      
      expect(tasksForDate).toHaveLength(2);
    });
  });

  // ========== 子任务测试 ==========

  describe('subtasks', () => {
    it('should create subtask', () => {
      const parent = manager.createTask({ title: 'Parent Task' });
      
      const subtask = manager.createSubTask(parent.id, { title: 'Subtask' });
      
      expect(subtask?.parentTaskId).toBe(parent.id);
    });

    it('should return null when parent does not exist', () => {
      const subtask = manager.createSubTask('non-existent', { title: 'Orphan' });
      expect(subtask).toBeNull();
    });

    it('should get subtasks', () => {
      const parent = manager.createTask({ title: 'Parent' });
      manager.createSubTask(parent.id, { title: 'Child 1' });
      manager.createSubTask(parent.id, { title: 'Child 2' });
      manager.createTask({ title: 'Unrelated' });
      
      const subtasks = manager.getSubTasks(parent.id);
      
      expect(subtasks).toHaveLength(2);
    });
  });

  // ========== 标签与项目测试 ==========

  describe('tags and projects', () => {
    it('should get all unique tags', () => {
      manager.createTask({ title: 'Task 1', tags: ['work', 'urgent'] });
      manager.createTask({ title: 'Task 2', tags: ['work', 'personal'] });
      manager.createTask({ title: 'Task 3', tags: ['urgent'] });
      
      const tags = manager.getAllTags();
      
      expect(tags).toContain('work');
      expect(tags).toContain('urgent');
      expect(tags).toContain('personal');
      expect(tags).toHaveLength(3);
    });

    it('should get all unique projects', () => {
      manager.createTask({ title: 'Task 1', project: 'Project A' });
      manager.createTask({ title: 'Task 2', project: 'Project B' });
      manager.createTask({ title: 'Task 3', project: 'Project A' });
      manager.createTask({ title: 'Task 4' });
      
      const projects = manager.getAllProjects();
      
      expect(projects).toContain('Project A');
      expect(projects).toContain('Project B');
      expect(projects).toHaveLength(2);
    });
  });

  // ========== 存储测试 ==========

  describe('storage operations', () => {
    it('should load from storage', () => {
      const mockData: Task[] = [
        {
          id: 'test-id-1',
          title: 'Loaded Task',
          status: 'todo',
          priority: 'high',
          tags: ['work'],
          dueDate: new Date('2026-03-01'),
          scheduledStart: new Date('2026-03-01T09:00:00'),
          scheduledEnd: new Date('2026-03-01T10:00:00'),
          completedAt: undefined,
          createdAt: new Date('2026-02-01'),
          updatedAt: new Date('2026-02-02'),
        }
      ];
      
      manager.loadFromStorage(mockData);
      
      const loaded = manager.getTaskById('test-id-1');
      expect(loaded).toBeDefined();
      expect(loaded?.title).toBe('Loaded Task');
      expect(loaded?.dueDate).toBeInstanceOf(Date);
    });

    it('should export to storage', () => {
      manager.createTask({ title: 'Task 1' });
      manager.createTask({ title: 'Task 2' });
      
      const exported = manager.exportToStorage();
      
      expect(exported).toHaveLength(2);
    });
  });

  // ========== 订阅测试 ==========

  describe('subscribe', () => {
    it('should notify on create', () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      
      manager.createTask({ title: 'New Task' });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify on update', () => {
      const task = manager.createTask({ title: 'Task' });
      const listener = vi.fn();
      manager.subscribe(listener);
      
      manager.updateTask(task.id, { title: 'Updated' });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);
      
      unsubscribe();
      manager.createTask({ title: 'Task' });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

// ========== 工具函数测试 ==========

describe('Task Utility Functions', () => {
  describe('getPriorityLabel', () => {
    it('should return correct labels', () => {
      expect(getPriorityLabel('high')).toBe('高优先级');
      expect(getPriorityLabel('medium')).toBe('中优先级');
      expect(getPriorityLabel('low')).toBe('低优先级');
      expect(getPriorityLabel('none')).toBe('无优先级');
    });
  });

  describe('getPriorityColor', () => {
    it('should return correct colors', () => {
      expect(getPriorityColor('high')).toBe('#ef4444');
      expect(getPriorityColor('medium')).toBe('#f59e0b');
      expect(getPriorityColor('low')).toBe('#3b82f6');
      expect(getPriorityColor('none')).toBe('#9ca3af');
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getStatusLabel('todo')).toBe('待办');
      expect(getStatusLabel('in-progress')).toBe('进行中');
      expect(getStatusLabel('completed')).toBe('已完成');
      expect(getStatusLabel('cancelled')).toBe('已取消');
    });
  });
});
