# Agent State Persistence System
# 代理状态持久化系统

## 核心设计

结合方案一（角色模板）+ 方案二（状态持久化）

### 1. 角色模板 (templates/)

每个角色有标准的行为定义：
- ProductOwner.md
- TechLead.md
- Developer.md
- QAEngineer.md
- CodeReviewer.md
- BugFixer.md
- DevOps.md
- SprintMaster.md

### 2. 状态持久化 (agents/)

每次代理结束自动保存：
```json
{
  "agentId": "{role}-{timestamp}",
  "role": "ProductOwner",
  "sprintId": "sprint-2",
  "status": "completed",
  "completedTasks": ["PRD-AI.md", "TECH-SPEC-AI.md"],
  "pendingIssues": [],
  "contextSummary": "完成AI功能需求定义，等待Sprint 3",
  "metrics": {
    "runtimeMinutes": 2,
    "tokensUsed": 15000,
    "filesCreated": 2
  },
  "lastUpdated": "2026-02-28T19:30:00Z"
}
```

### 3. 启动流程

```
启动 Sprint 3:
  1. 读取角色模板 (标准行为)
  2. 加载上轮状态 (上下文记忆)
  3. 生成启动提示词
  4. 代理开始工作 (有记忆的标准化执行)
```

### 4. 文件结构

```
.sprint/
├── templates/              # 角色模板（只读，标准定义）
│   ├── ProductOwner.md
│   ├── TechLead.md
│   ├── Developer.md
│   ├── QAEngineer.md
│   ├── CodeReviewer.md
│   ├── BugFixer.md
│   ├── DevOps.md
│   └── SprintMaster.md
├── agents/                 # 代理状态（每次结束自动保存）
│   ├── product-owner-state.json
│   ├── tech-lead-state.json
│   ├── developer-frontend-state.json
│   ├── developer-backend-state.json
│   ├── qa-engineer-state.json
│   ├── code-reviewer-state.json
│   └── sprint-master-state.json
├── sprints/                # Sprint历史
│   ├── sprint-1/
│   ├── sprint-2/
│   └── sprint-3/
└── registry.json           # 代理注册表
```

## 实现计划

### Step 1: 创建角色模板 (5分钟)
- 提取现有代理的共同行为
- 标准化为 SKILL.md 格式

### Step 2: 实现状态保存 (10分钟)
- 每次代理结束时自动保存状态
- 保存到 agents/{role}-state.json

### Step 3: 实现状态加载 (10分钟)
- 启动代理时自动读取上轮状态
- 注入到代理的 prompt 中

### Step 4: 创建启动脚本 (5分钟)
- start-sprint.sh "功能描述"
- 自动读取模板 + 加载状态 + 启动代理

## 效果

**Before (无状态):**
```
"启动 Sprint 3"
→ 代理从零开始
→ "我要做什么？"
```

**After (有状态):**
```
"启动 Sprint 3"
→ 读取模板 + 加载状态
→ "我是Product Owner，刚完成Sprint 2的AI功能，
    现在继续Sprint 3的自然语言输入功能..."
```

**这就是固定团队的效果！**
