# 全自动敏捷开发流水线 v2.0

## 架构设计

### 核心：Sprint Master（流程引擎）
- 唯一入口，负责整个 Sprint 的编排
- 管理所有子代理的生命周期
- 处理代理间消息传递
- 决策流程流转

### 子代理角色

| 角色 | 数量 | 职责 |
|------|------|------|
| **Product Owner** | 1 | 需求分析、优先级排序、验收标准 |
| **Researcher** | 1 | 市场调研、竞品分析、技术调研 |
| **Tech Lead** | 1 | 架构设计、模块拆分、技术选型 |
| **Developer** | 2-4 | 并行开发不同模块 |
| **QA Engineer** | 1 | 测试用例设计、验收测试、Bug报告 |
| **Bug Fixer** | 动态 | Bug修复专用（按需启动） |
| **Code Reviewer** | 1 | 代码审查、质量把关 |
| **DevOps** | 1 | CI/CD、版本管理、发布 |
| **Daily Reporter** | 1 | 进度汇总、阻塞上报 |

---

## 自动化流程

### Phase 1: Sprint 启动 (5-10分钟)

```
用户输入需求 → Sprint Master 启动
    ↓
┌─────────────────┐
│ Researcher      │ 并行执行
│ Product Owner   │
│ Tech Lead       │
└────────┬────────┘
         ↓
    产出合并
    ↓
Sprint Backlog + 技术方案 + 模块拆分
```

### Phase 2: 测试先行 (5分钟)

```
QA Engineer 根据需求写测试用例
    ↓
产出: 验收标准 + 测试用例文件
```

### Phase 3: 并行开发 (并行执行)

```
Tech Lead 拆分为 N 个模块
    ↓
Developer A ──┐
Developer B ──┼── 同时开发
Developer C ──┤
Developer D ──┘
    ↓
模块完成 → Code Reviewer 审查
    ↓
通过 → 标记完成
```

### Phase 4: 持续集成

```
每个模块完成 → CI 自动运行
    ├─ 单元测试
    ├─ 类型检查
    ├─ 代码质量检查
    └─ 集成测试
    ↓
失败 → 自动通知 Developer 修复
成功 → 继续
```

### Phase 5: 集成测试

```
所有模块完成 → QA Engineer 执行验收测试
    ├─ 功能测试
    ├─ 集成测试
    └─ 性能测试
    ↓
发现 Bug → 启动 Bug Fixer
    ├─ Bug Fixer 修复
    ├─ 重新运行相关测试
    └─ 通过 → 继续
    ↓
全部通过 → Phase 6
```

### Phase 6: 发布

```
DevOps 执行:
    ├─ 更新版本号
    ├─ 生成 CHANGELOG
    ├─ git commit + tag
    ├─ push to GitHub
    └─ 创建 Release
    ↓
Sprint Master 汇总报告
```

---

## 关键技术机制

### 1. 代理间通信协议

```typescript
// 消息格式
interface AgentMessage {
  from: string;        // 发送代理ID
  to: string;          // 目标代理ID | "broadcast" | "master"
  type: "task" | "result" | "blocker" | "question" | "bug";
  payload: any;
  timestamp: number;
}
```

### 2. 状态机管理

```
Sprint 状态:
    INIT → PLANNING → DEVELOPING → TESTING → REVIEWING → RELEASING → DONE
              ↑_________↓              ↑________↓
              (迭代/修复)              (Bug修复循环)
```

### 3. 自动 Bug 修复循环

```
QA 发现 Bug
    ↓
创建 Bug 报告 (包含: 重现步骤、期望结果、相关代码位置)
    ↓
Sprint Master 启动 Bug Fixer
    ↓
Bug Fixer 修复 → 提交修复
    ↓
CI 自动验证
    ├─ 失败 → 重新分配修复
    └─ 成功 → QA 确认 → 关闭 Bug
```

### 4. 并行开发协调

```
模块 A ──→ PR A ──→ CR ──→ Merge ──┐
                                    ├──→ Integration Branch
模块 B ──→ PR B ──→ CR ──→ Merge ──┤
                                    │
模块 C ──→ PR C ──→ CR ──→ Merge ──┘
```

---

## 文件输出规范

每个代理产出必须写入指定位置：

```
calendar-app/
├── .sprint/                    # Sprint 运行时数据
│   ├── current/               # 当前 Sprint
│   │   ├── backlog.json       # 任务清单
│   │   ├── status.json        # 实时状态
│   │   ├── messages/          # 代理间消息
│   │   └── reports/           # 进度报告
│   └── history/               # 历史 Sprint
├── docs/
│   ├── PRD.md                 # 产品需求
│   ├── RESEARCH.md            # 调研报告
│   ├── TECH-SPEC.md           # 技术方案
│   ├── TEST-PLAN.md           # 测试计划
│   └── CHANGELOG.md           # 版本日志
└── src/                       # 源代码
```

---

## 触发方式

### 方式1: 单次 Sprint
```bash
# 用户输入
"实现日历与任务集成功能"
    ↓
Sprint Master 全自动执行
    ↓
输出: 完成的代码 + GitHub Release
```

### 方式2: 持续迭代 (推荐)
```bash
# 设置定时任务
cron: 每天检查 backlog
    ↓
有任务 → 自动启动 Sprint
    ↓
完成 → 等待下一个任务
```

### 方式3: 事件驱动
```bash
# GitHub Issue 标记为 "sprint-ready"
    ↓
Webhook 触发 Sprint Master
    ↓
自动分析 Issue → 启动 Sprint
```

---

## 监控面板

Sprint Master 实时输出:

```
═══════════════════════════════════════
🚀 Sprint #42: 任务与待办集成
═══════════════════════════════════════

进度: ████████░░ 80%

Phase: TESTING (Bug修复中)

活跃代理:
  ✅ Researcher      完成    4m
  ✅ Product Owner   完成    2m
  ✅ Tech Lead       完成    3m
  ✅ Developer A     完成    8m    [模块: Task数据层]
  🔄 Developer B     修复中  2m    [模块: UI组件, Bug: 1]
  ✅ Developer C     完成    7m    [模块: 事件关联]
  ✅ Code Reviewer   完成    2m
  🔄 QA Engineer     测试中  5m    [进度: 18/20 用例通过]
  ⏳ DevOps          等待    -

阻塞项:
  ⚠️  Bug #3: 拖拽事件在Firefox不工作
      → 分配给 Developer B 修复中

预计完成: 15分钟后
═══════════════════════════════════════
```

---

## 实施计划

### Step 1: 基础设施 (这次完成)
- [x] 建立代理协作规范
- [x] 创建输出目录结构
- [x] 编写 Sprint Master 核心逻辑

### Step 2: 流程固化 (下次 Sprint)
- [ ] 实现 Phase 1-2 自动化
- [ ] 建立消息传递机制
- [ ] 创建状态监控

### Step 3: 完全自动化 (第三次)
- [ ] 实现 Bug 修复闭环
- [ ] 并行开发协调
- [ ] CI/CD 集成

### Step 4: 智能化 (未来)
- [ ] 根据历史数据估算时间
- [ ] 自动分配任务给最合适的代理
- [ ] 预测风险提前介入

---

## 使用示例

```
用户: "启动 Sprint，实现自然语言创建事件功能"

Sprint Master:
"收到！启动 Sprint #43: 自然语言事件创建

正在初始化代理团队...
  [Researcher]      启动 → 调研NLP方案
  [Product Owner]   启动 → 分析需求边界
  [Tech Lead]       启动 → 设计架构

预计 30 分钟后交付可工作的代码。
我将实时汇报进度，无需您介入。"
```
