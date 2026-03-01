# Release 发布检查清单

## 发布前（手动检查）

- [ ] **版本号检查**
  - [ ] root package.json
  - [ ] apps/desktop/package.json
  - [ ] apps/web/package.json
  - [ ] apps/mobile/package.json
  - [ ] packages/*/package.json

- [ ] **CI 配置检查**
  - [ ] 包含 Lint 步骤
  - [ ] 包含 Test 步骤
  - [ ] 构建依赖质量检查

- [ ] **本地验证**
  - [ ] pnpm lint 通过
  - [ ] pnpm test 通过
  - [ ] pnpm build:web 成功
  - [ ] 本地 Desktop 构建成功

---

## 发布后（自动 + 验证）

- [ ] **GitHub Actions 状态**
  - [ ] 所有任务绿色通过
  - [ ] 无构建错误

- [ ] **Release Assets 验证**
  - [ ] 文件数量 = 3（macOS/Win/Linux）
  - [ ] 文件名包含 "Pie"
  - [ ] 版本号正确（如 Pie-1.3.3）
  - [ ] 文件大小合理（> 10MB）

- [ ] **功能验证（抽样）**
  - [ ] 安装包可正常安装
  - [ ] 应用可正常启动
  - [ ] 核心功能正常

---

## 问题处理

如果检查失败：
1. **不要重复发布同版本 tag**
2. 修复问题 → 测试 → 打新 tag（如 v1.3.4）
3. 记录问题到 docs/playbooks/

---

**责任人：** Sprint Master 最终审核
**执行人：** DevOps 执行发布流程
