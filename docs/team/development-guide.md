# 开发规范

## 代码规范

### TypeScript
- 严格类型检查开启
- 禁用 any（特殊情况需注释说明）
- 函数单一职责

### 命名规范
- 组件：PascalCase (e.g., `TaskList.tsx`)
- 函数/变量：camelCase (e.g., `createTask`)
- 常量：UPPER_SNAKE_CASE

### Git 提交
```
type(scope): subject

body
```

**type:**
- feat: 新功能
- fix: Bug 修复
- refactor: 重构
- docs: 文档
- chore: 杂项

**示例：**
```
feat(task): 添加任务优先级排序

- 实现 sortByPriority 方法
- 添加单元测试
- 更新类型定义
```

---

## 版本管理

### 版本号规则 (SemVer)
- MAJOR: 不兼容的 API 变更
- MINOR: 向下兼容的功能添加
- PATCH: 向下兼容的问题修复

### 发布流程
1. 更新所有 package.json 版本号
2. 本地验证构建
3. 提交并打 tag
4. 等待 CI 构建完成
5. 验证 Release Assets

---

## CI/CD 规范

### 必须包含的步骤
1. **Install** - 安装依赖
2. **Lint** - 代码检查
3. **Test** - 单元测试
4. **Build** - 构建应用
5. **Release** - 发布（tag 触发）

### 禁止
- 跳过 Lint/Test
- 手动修改已发布的 Assets
- 直接 push 到 master（需 PR）
