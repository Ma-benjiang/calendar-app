# Pie 项目 - Claude Code 配置

## 项目简介

Pie 是一个日历管理应用，使用自主 Agent 系统驱动开发。CEO 只需自然语言指令，Agent 自动完成从需求分析到发布部署的全流程。

---

## CEO 接口（自然语言）

CEO 无需记忆命令，用任意自然语言与系统交互：

| CEO 说 | 意图 | Agent 行为 |
|--------|------|-----------|
| "做个新功能" / "启动 sprint" / "开始" | **完全自主** | Researcher 分析产品现状 → 识别优先级功能 → 自动执行 Sprint |
| "做周视图" / "加上自然语言输入" / "实现拖拽功能" | **指定功能** | 跳过调研，直接启动该功能的 Sprint |
| "调研一下" / "看看竞品" / "分析下产品" | **仅调研** | Researcher 输出产品路线图 `docs/roadmap.md`，不启动 Sprint |
| "进度怎么样" / "现在什么情况" / "看看进展" | **查看状态** | 列出所有进行中的 Sprint 及当前阶段 |
| "接下来做什么好" / "有什么建议" | **寻求建议** | Researcher 分析现状，推荐下一个功能 |

### 使用示例

```
CEO: 做个新功能
→ Agent: 分析发现缺周视图 → 自动启动 Sprint

CEO: 做自然语言创建事件
→ Agent: 直接启动该功能 Sprint

CEO: 调研一下
→ Agent: 输出竞品分析 + 产品路线图

CEO: 怎么样了
→ Agent: 显示 Sprint 状态看板
```

---

## Agent 组织架构

```
                    CEO
                     │ 自然语言输入
                     │ "做个X" / "调研" / "进度"
                     ▼
        ┌─────────────────────────────┐
        │   主对话 Claude Code         │
        │   ─────────────────         │
        │   意图识别器                │
        │   - 识别 CEO 意图           │
        │   - 路由到对应 Agent        │
        └─────────────┬───────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
    自主模式       指定模式        调研模式       查看状态
        │             │             │             │
        ▼             │             ▼             ▼
   ┌─────────┐        │        ┌─────────┐   ┌─────────┐
   │Researcher│        │        │Researcher│   │TaskList │
   │分析+推荐│        │        │仅调研    │   │查询状态 │
   └────┬────┘        │        └─────────┘   └─────────┘
        │             │
        │             ▼
        │        ┌─────────────┐
        │        │SprintMaster │
        │        │直接启动指定 │
        │        │功能的 Sprint│
        │        └──────┬──────┘
        │               │
        └───────────────┘
              │
              ▼
       ┌─────────────┐
       │ SprintMaster │
       │ 执行编排器   │
       │ - 创建 Task  │
       │ - 阶段调度   │
       │ - 自动流转   │
       └──────┬──────┘
              │
    ┌─────────┼─────────┬─────────┐
    ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Product│ │QA     │ │Developer│ │DevOps │
│Owner  │ │Engineer│ + Code   │        │
│       │ │        │ Reviewer │        │
└───────┘ └───────┘ └───────┘ └───────┘
```

### Agent 职责

| Agent | 职责 | 触发条件 |
|-------|------|----------|
| **主对话 Claude Code** | 意图识别、命令路由、任务管理 | CEO 每次输入 |
| **Researcher** | 产品调研、竞品分析、功能推荐 | 自主模式启动时 / `/research` |
| **SprintMaster** | Task 创建、阶段调度、进度跟踪 | Sprint 启动时 |
| **ProductOwner** | PRD 编写、需求澄清 | Phase 1 |
| **QAEngineer** | 测试计划、测试执行 | Phase 2, 4 |
| **Developer** | 编码实现、单元测试 | Phase 3 |
| **CodeReviewer** | 代码审查、质量把控 | Phase 3 (并行) |
| **BugFixer** | Bug 修复、问题修复 | Phase 4 (按需) |
| **DevOps** | 版本管理、发布部署 | Phase 5 |

---

## 完整开发流程

### 场景 1: 完全自主模式

```
CEO: 做个新功能
    │
    ▼
┌────────────────────────────────────────────────┐
│ 主对话 Claude Code 识别意图：完全自主模式         │
└────────────────────┬───────────────────────────┘
                     ▼
┌────────────────────────────────────────────────┐
│ 1. Researcher 启动                              │
│    - 分析 src/ 现有功能清单                      │
│    - 竞品分析 (Notion Calendar, Cron, Amie...)   │
│    - 识别差异化机会                              │
│    - 更新 docs/roadmap.md                        │
│    - 推荐: "周视图功能" (P0 优先级)              │
│    - 通知 CEO: "建议做周视图功能，是否启动？"     │
└────────────────────┬───────────────────────────┘
                     │
        CEO: 好的 / 可以 / 直接开始
                     │
                     ▼
┌────────────────────────────────────────────────┐
│ 2. SprintMaster 创建 Task 链                     │
│    Task 1: [Sprint] 周视图功能                    │
│    Task 2: Phase 1 - PRD (blockedBy: 1)         │
│    Task 3: Phase 2 - 测试计划 (blockedBy: 2)     │
│    Task 4: Phase 3 - 编码 (blockedBy: 3)         │
│    Task 5: Phase 3 - 审查 (blockedBy: 4)         │
│    Task 6: Phase 4 - 集成测试 (blockedBy: 4,5)   │
│    Task 7: Phase 5 - 发布 (blockedBy: 6)         │
└────────────────────┬───────────────────────────┘
                     ▼
┌────────────────────────────────────────────────┐
│ 3. 自动阶段流转（CEO 无需介入）                    │
│                                                │
│    Phase 1 → ProductOwner                       │
│             → 输出 docs/prd/PRD-week-view.md   │
│             → 检查点：PRD 含可测试验收标准        │
│                                                │
│    Phase 2 → QAEngineer                         │
│             → 输出 docs/test/TEST-PLAN-week-view.md │
│             → 检查点：测试用例覆盖 PRD           │
│                                                │
│    Phase 3 → Developer                          │
│             → 编码 + 单元测试（覆盖率≥80%）      │
│             → 创建 PR → CodeReviewer 审查        │
│             → 检查点：审查通过，无阻塞性问题      │
│                                                │
│    Phase 4 → QAEngineer + BugFixer              │
│             → 集成测试 + Bug 修复循环            │
│             → 检查点：无 P0/P1 Bug              │
│                                                │
│    Phase 5 → DevOps                             │
│             → 发布部署                          │
│             → 通知 CEO: "周视图功能已就绪，是否发布？" │
└────────────────────────────────────────────────┘
```

### 场景 2: 指定功能模式

```
CEO: 做自然语言创建事件功能
    │
    ▼
┌────────────────────────────────────────────────┐
│ 主对话 Claude Code 识别意图：指定功能模式         │
│ 提取功能名：自然语言创建事件                      │
└────────────────────┬───────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────┐
│ 1. 跳过 Researcher                              │
│    - CEO 已明确指定功能                          │
│    - 直接使用该功能名创建 Sprint                 │
└────────────────────┬───────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────┐
│ 2. SprintMaster 立即创建 Task 链                 │
│    (功能名固定为"自然语言创建事件")               │
└────────────────────┬───────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────┐
│ 3. 标准阶段流转（同自主模式）                     │
│    Phase 1 → 2 → 3 → 4 → 5                     │
│    自动执行，Phase 5 通知 CEO "发布就绪"         │
└────────────────────────────────────────────────┘
```

### 场景 3: 仅调研模式

```
CEO: 调研一下
    │
    ▼
┌────────────────────────────────────────────────┐
│ 主对话 Claude Code 识别意图：仅调研模式           │
└────────────────────┬───────────────────────────┘
                     ▼
┌────────────────────────────────────────────────┐
│ Researcher 执行                                  │
│ - 产品现状分析                                   │
│ - 竞品对比 (Notion, Cron, Amie...)              │
│ - 识别机会点                                     │
│ - 输出 docs/roadmap.md                          │
│                                                │
│ 路线图中建议的优先级：                            │
│ P0: 周视图功能                                   │
│ P1: 事件提醒                                     │
│ P2: 自然语言输入                                 │
└────────────────────┬───────────────────────────┘
                     ▼
CEO 可选择：
    A) "启动 sprint" → 启动推荐的 P0 功能
    B) "做事件提醒" → 启动指定功能
    C) 不做任何操作，稍后决定
```

### 场景 4: 查看状态

```
CEO: 进度怎么样
    │
    ▼
┌────────────────────────────────────────────────┐
│ 主对话 Claude Code 识别意图：查看状态            │
└────────────────────┬───────────────────────────┘
                     ▼
┌────────────────────────────────────────────────┐
│ TaskList 查询所有 Sprint 状态                   │
└────────────────────┬───────────────────────────┘
                     ▼
输出示例：
┌────────────────────────────────────────┐
│ Pie Sprint 状态看板                     │
├────────────────────────────────────────┤
│ Sprint: 周视图功能 [Phase 3/5]          │
│ ├── Phase 1: PRD      ✓ completed      │
│ ├── Phase 2: 测试计划  ✓ completed      │
│ ├── Phase 3: 编码     ▶ in_progress    │
│ ├── Phase 3: 代码审查 ○ pending         │
│ ├── Phase 4: 集成测试 ○ pending         │
│ └── Phase 5: 发布     ○ pending         │
├────────────────────────────────────────┤
│ Sprint: 事件提醒 [Phase 1/5]            │
│ └── Phase 1: PRD     ▶ in_progress     │
└────────────────────────────────────────┘
```

---

## 阶段转换检查点

SprintMaster 自动验证检查点，无需 CEO 介入：

| 转换点 | 自动检查项 | 不通过处理 |
|--------|-----------|-----------|
| Phase 1 → 2 | PRD 包含明确的功能描述和可测试的验收标准 | 退回 ProductOwner 补充 |
| Phase 2 → 3 | 测试用例与 PRD 需求一一对应 | 退回 QAEngineer 补充 |
| Phase 3 → 4 | 代码审查通过且覆盖率≥80% | 退回 Developer 修复 |
| Phase 4 → 5 | 所有测试通过，无 P0/P1 Bug | 启动 BugFixer 修复循环 |
| Phase 5 → 结束 | **通知 CEO 确认发布** | 等待 CEO: 确认/暂缓 |

---

## Task 系统管理

### Task 状态流转

```
pending → in_progress → completed
              ↓
          deleted (取消)
```

### Sprint Task 结构

```
Task 1: [Sprint] 周视图功能 (in_progress)
├── Task 2: Phase 1 - PRD编写 (completed)
│       owner: product-owner
│       output: docs/prd/PRD-week-view.md
├── Task 3: Phase 2 - 测试计划 (completed)
│       owner: qa-engineer
│       blockedBy: Task 2
│       output: docs/test/TEST-PLAN-week-view.md
├── Task 4: Phase 3 - 编码实现 (in_progress)
│       owner: developer
│       blockedBy: Task 3
├── Task 5: Phase 3 - 代码审查 (pending)
│       owner: code-reviewer
│       blockedBy: Task 4
├── Task 6: Phase 4 - 集成测试 (pending)
│       owner: qa-engineer
│       blockedBy: Task 4, Task 5
└── Task 7: Phase 5 - 发布部署 (pending)
        owner: devops
        blockedBy: Task 6
        action: 完成后通知 CEO "发布就绪"
```

---

## 文档目录结构

```
docs/
├── roadmap.md              # Researcher 输出：产品路线图
├── prd/
│   └── PRD-{feature}.md    # ProductOwner 输出
├── test/
│   ├── TEST-PLAN-{feature}.md  # QAEngineer 输出
│   └── TEST-REPORT.md      # QAEngineer 输出
├── review/
│   └── CODE-REVIEW-{module}.md  # CodeReviewer 输出
├── bugfix/
│   └── BUGFIX-{issue}.md   # BugFixer 输出
└── release/
    └── RELEASE-v{x.y.z}.md # DevOps 输出

.sprint/
└── SPRINT-REPORT.md        # SprintMaster 输出：Sprint 总结
```

### 文档命名规范

| 文件类型 | 命名格式 | 存放位置 | 创建者 |
|----------|----------|----------|--------|
| 产品路线图 | `roadmap.md` | `docs/` | Researcher |
| PRD | `PRD-{feature}.md` | `docs/prd/` | ProductOwner |
| 测试计划 | `TEST-PLAN-{feature}.md` | `docs/test/` | QAEngineer |
| 测试报告 | `TEST-REPORT.md` | `docs/test/` | QAEngineer |
| 代码审查 | `CODE-REVIEW-{module}.md` | `docs/review/` | CodeReviewer |
| Bug修复 | `BUGFIX-{issue}.md` | `docs/bugfix/` | BugFixer |
| 发布记录 | `RELEASE-v{x.y.z}.md` | `docs/release/` | DevOps |
| Sprint报告 | `SPRINT-REPORT.md` | `.sprint/` | SprintMaster |

---

## CEO 决策矩阵

基于德鲁克管理学原理，明确 Agent 自主执行与 CEO 决策的边界：

| 决策场景 | 责任主体 | 触发条件 | CEO 需关注程度 |
|---------|---------|---------|--------------|
| **功能选择** | Agent 自主 | CEO 说"做个新功能"（无指定） | 低 - Researcher 自动分析决定 |
| **Sprint 启动** | Agent 自主 | 调研完成后 / CEO 指定功能时 | 低 - 系统自动执行 |
| **需求范围变更** | CEO 决策 | 影响里程碑或资源投入时 | 高 - 需明确批准 |
| **技术方案选择** | Agent 自主 | 标准技术选型 | 低 - Agent 自行决定 |
| **代码审查不通过** | Agent 自主 | 质量门禁自动管控 | 低 - 系统自动修复循环 |
| **测试不通过** | Agent 自主 | BugFixer 自动修复 | 低 - 系统自动处理 |
| **发布时机** | **CEO 决策** | DevOps 报告就绪后 | **中 - 接收通知，确认发布** |
| **阻塞性 Bug/技术债务** | CEO 知情 | BugFixer 无法自动修复 | 中 - 接收报告，决定策略 |
| **Sprint 中止** | CEO 决策 | 遇到重大技术/资源障碍 | 高 - 需评估后决策 |
| **产品方向调整** | CEO 决策 | 战略级需求变更 | 高 - 重新规划路线图 |

### CEO 介入触发条件

Agent 系统仅在以下情况主动请示 CEO：

1. **发布相关**
   - 功能开发完成，等待 CEO 最终确认发布
   - 需要解释发布延期原因

2. **风险相关**
   - BugFixer 无法自动修复的阻塞性问题
   - 连续 2 个 Sprint 未达成目标

3. **预算/资源相关**
   - 需要额外开发资源（外包、增加 Agent 实例）
   - 超出既定时间/成本预算

4. **战略方向相关**
   - 需求变更影响产品路线图
   - 技术方案涉及架构重大调整

### 冲突升级流程

当 Agent 间出现意见不一致时：

1. **协商阶段**（Agent 间，5分钟内）
   - Developer 与 CodeReviewer 通过文档评论讨论
   - 尝试达成一致意见

2. **仲裁阶段**（SprintMaster 介入，10分钟内）
   - 无法快速达成一致 → 升级至 SprintMaster
   - SprintMaster 基于「代码质量 > 开发速度」原则裁决
   - 记录裁决理由到对应 Task 的 metadata

3. **CEO 请示阶段**（需人工决策时）
   - **触发条件**：
     - 涉及架构重大变更，影响产品长期演进
     - 技术债务 vs 交付时间的权衡（影响 > 1 个 Sprint）
     - 连续 2 次 SprintMaster 仲裁无法解决
   - **CEO 接收信息**：
     - 冲突背景和双方观点
     - SprintMaster 建议方案
     - 不同选择的预期影响
   - **CEO 决策方式**：
     - 回复「同意方案A」或「同意方案B」
     - 或提出新方案
   - **响应时间**：24小时内（非阻塞性问题）/ 4小时内（阻塞性问题）

---

## 开发规范

### 代码规范

- **TypeScript** - 严格类型检查，禁用 any（特殊情况需注释）
- **函数** - 单一职责
- **命名** - 组件 PascalCase，函数 camelCase，常量 UPPER_SNAKE_CASE

### Git 工作流

**禁止直接 push master**，所有代码必须通过 PR 合并。

#### 工作流程

```
1. 创建功能分支
   git checkout -b feature/xxx

2. 开发 + 本地验证
   pnpm lint
   pnpm test
   pnpm build:web

3. 提交到分支
   git commit -m "feat: xxx"
   git push origin feature/xxx

4. 创建 Pull Request
   → CodeReviewer 自动审查
   → 审查通过 → 合并到 master

5. 发布时打 tag
   git tag v1.x.x
   git push origin v1.x.x
```

#### 分支命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 功能 | `feature/{name}` | `feature/week-view` |
| 修复 | `fix/{issue}` | `fix/ci-warning` |
| 文档 | `docs/{topic}` | `docs/api-guide` |

### Git 提交规范

```
type(scope): subject

body
```

**type:** feat, fix, refactor, docs, chore

**示例:**
```
feat(task): 添加任务优先级排序

- 实现 sortByPriority 方法
- 添加单元测试
- 更新类型定义
```

### 质量标准

- TypeScript 严格类型
- 单元测试覆盖率 > 80%
- 代码审查必须通过才能合并
- 所有测试通过才能发布

---

## 发布检查清单

### 发布前

- [ ] **版本号检查** - root/apps/packages 所有 package.json
- [ ] **CI配置检查** - 包含 Lint、Test 步骤
- [ ] **本地验证** - pnpm lint/test/build 通过

### 发布后验证

- [ ] **GitHub Actions** - 所有任务绿色
- [ ] **Release Assets** - 3个文件(macOS/Win/Linux)，文件名含"Pie"
- [ ] **功能验证** - 安装包可正常安装启动

### 问题处理

1. **不要重复发布同版本 tag**
2. 修复问题 → 测试 → 打新 tag（如 v1.3.4）
3. 记录问题到 `docs/playbooks/`
