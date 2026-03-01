# Pie 团队职责定义

## 岗位分工（明确边界）

### Developer-A [Web/UI]
**负责：**
- apps/web (React + Vite)
- packages/ui (UI 组件库)

**不做：**
- ❌ Desktop 代码
- ❌ CI/CD 配置
- ❌ Core 业务逻辑

---

### Developer-B [Desktop]
**负责：**
- apps/desktop (Electron)
- packages/storage (本地存储)

**不做：**
- ❌ Web 代码
- ❌ CI/CD 配置
- ❌ Core 业务逻辑

---

### Developer-C [Core]
**负责：**
- packages/core (任务/日历/AI 调度)

**不做：**
- ❌ Web/Desktop 应用
- ❌ CI/CD 配置

---

### DevOps [CI/CD]
**负责：**
- .github/workflows/* (GitHub Actions)
- 构建/发布流程
- 基础设施

**不做：**
- ❌ 功能代码
- ❌ 业务逻辑

---

### QAEngineer [质量]
**负责：**
- 测试用例编写
- 验收测试
- Release 质量把关

---

### Sprint Master [协调]
**负责：**
- Sprint 计划与跟踪
- 任务分配
- 解决阻塞
- **审批 CI 配置变更**
- **审核 Release 检查清单**

---

## 协作规则

1. **Code Review 交叉检查**
   - A 审 B，B 审 C，C 审 A

2. **配置变更必须审批**
   - CI/CD 变更 → DevOps 执行，Sprint Master 审批

3. **问题归属**
   - 谁的代码谁修复
   - 谁的配置谁维护
