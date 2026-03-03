/**
 * TaskStatsBoard - 任务统计看板
 * 显示任务完成统计和趋势
 */
import React, { useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '@calendar/core';
import './TaskStatsBoard.css';

interface TaskStatsBoardProps {
  tasks: Task[];
  days?: number; // 统计天数范围，默认 7 天
}

interface DailyStats {
  date: string;
  completed: number;
  created: number;
}

interface ProjectStats {
  name: string;
  total: number;
  completed: number;
}

export const TaskStatsBoard: React.FC<TaskStatsBoardProps> = ({
  tasks,
  days = 7,
}) => {
  // 总体统计
  const overview = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 高优先级待办
    const highPriorityPending = tasks.filter(
      (t) => t.status !== 'completed' && t.priority === 'high'
    ).length;

    // 已逾期
    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return { total, completed, pending, completionRate, highPriorityPending, overdue };
  }, [tasks]);

  // 每日统计（最近 N 天）
  const dailyStats = useMemo(() => {
    const stats: DailyStats[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

      const completed = tasks.filter((t) => {
        if (!t.completedAt) return false;
        const completedDate = new Date(t.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === date.getTime();
      }).length;

      const created = tasks.filter((t) => {
        const createdDate = new Date(t.createdAt);
        createdDate.setHours(0, 0, 0, 0);
        return createdDate.getTime() === date.getTime();
      }).length;

      stats.push({ date: dateStr, completed, created });
    }

    return stats;
  }, [tasks, days]);

  // 项目统计
  const projectStats = useMemo(() => {
    const projectMap = new Map<string, { total: number; completed: number }>();

    tasks.forEach((t) => {
      const project = t.project || '未分类';
      const current = projectMap.get(project) || { total: 0, completed: 0 };
      current.total++;
      if (t.status === 'completed') {
        current.completed++;
      }
      projectMap.set(project, current);
    });

    return Array.from(projectMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [tasks]);

  // 优先级分布
  const priorityStats = useMemo(() => {
    const stats: Record<TaskPriority, number> = {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };

    tasks
      .filter((t) => t.status !== 'completed')
      .forEach((t) => {
        stats[t.priority]++;
      });

    return stats;
  }, [tasks]);

  // 计算最大完成数用于柱状图比例
  const maxCompleted = Math.max(...dailyStats.map((d) => d.completed), 1);

  return (
    <div className="task-stats-board">
      {/* 概览卡片 */}
      <div className="stats-overview">
        <div className="stat-card total">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{overview.total}</div>
          <div className="stat-label">总任务</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{overview.completed}</div>
          <div className="stat-label">已完成</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{overview.pending}</div>
          <div className="stat-label">待办</div>
        </div>
        <div className="stat-card rate">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{overview.completionRate}%</div>
          <div className="stat-label">完成率</div>
        </div>
      </div>

      {/* 警示卡片 */}
      {(overview.highPriorityPending > 0 || overview.overdue > 0) && (
        <div className="stats-alerts">
          {overview.highPriorityPending > 0 && (
            <div className="alert-card warning">
              <span className="alert-icon">⚠️</span>
              <span className="alert-text">
                有 {overview.highPriorityPending} 个高优先级任务待处理
              </span>
            </div>
          )}
          {overview.overdue > 0 && (
            <div className="alert-card danger">
              <span className="alert-icon">🔥</span>
              <span className="alert-text">
                有 {overview.overdue} 个任务已逾期
              </span>
            </div>
          )}
        </div>
      )}

      {/* 完成趋势 */}
      <div className="stats-section">
        <h3 className="section-title">📈 完成趋势（最近{days}天）</h3>
        <div className="trend-chart">
          {dailyStats.map((day, index) => (
            <div key={index} className="trend-bar-wrapper">
              <div
                className="trend-bar"
                style={{
                  height: `${(day.completed / maxCompleted) * 100}%`,
                  minHeight: day.completed > 0 ? '4px' : '0',
                }}
                title={`${day.date}: 完成 ${day.completed} 个`}
              />
              <div className="trend-label">{day.date}</div>
              {day.completed > 0 && (
                <div className="trend-value">{day.completed}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="stats-row">
        {/* 项目分布 */}
        <div className="stats-section half">
          <h3 className="section-title">📁 项目分布</h3>
          {projectStats.length > 0 ? (
            <div className="project-list">
              {projectStats.map((project) => (
                <div key={project.name} className="project-item">
                  <div className="project-info">
                    <span className="project-name">{project.name}</span>
                    <span className="project-count">
                      {project.completed}/{project.total}
                    </span>
                  </div>
                  <div className="project-bar">
                    <div
                      className="project-progress"
                      style={{
                        width: `${project.total > 0 ? (project.completed / project.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">暂无项目数据</div>
          )}
        </div>

        {/* 优先级分布 */}
        <div className="stats-section half">
          <h3 className="section-title">🎯 优先级分布（待办）</h3>
          <div className="priority-chart">
            {Object.entries(priorityStats).map(([priority, count]) => {
              const colors: Record<TaskPriority, string> = {
                high: '#ef4444',
                medium: '#f59e0b',
                low: '#3b82f6',
                none: '#9ca3af',
              };
              const labels: Record<TaskPriority, string> = {
                high: '高优先级',
                medium: '中优先级',
                low: '低优先级',
                none: '无优先级',
              };
              const total = Object.values(priorityStats).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

              return (
                <div key={priority} className="priority-item">
                  <div
                    className="priority-dot"
                    style={{ backgroundColor: colors[priority as TaskPriority] }}
                  />
                  <span className="priority-label">
                    {labels[priority as TaskPriority]}
                  </span>
                  <span className="priority-value">{count}</span>
                  <span className="priority-percentage">{percentage}%</span>
                  <div className="priority-bar">
                    <div
                      className="priority-progress"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: colors[priority as TaskPriority],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskStatsBoard;
