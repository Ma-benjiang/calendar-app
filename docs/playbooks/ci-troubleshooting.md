# CI/CD 问题排查手册

## 常见问题速查

### 1. Release Assets 过多/重复
**现象：** 安装包文件名错误或有重复

**原因：**
- dist 目录未清理，旧文件残留
- 多次构建产物混合

**解决：**
```yaml
# 在 build 步骤前添加
- name: Clean dist folder
  run: rm -rf apps/desktop/dist/*
```

**预防：** CI 已配置自动清理

---

### 2. 版本号不一致
**现象：** Release Tag v1.3.3，但安装包显示 1.0.0

**检查清单：**
- [ ] apps/desktop/package.json version
- [ ] apps/web/package.json version
- [ ] apps/mobile/package.json version
- [ ] packages/*/package.json version

**解决：** 统一修改所有 package.json 的版本号

---

### 3. CI 缺少 Lint/Test
**现象：** CI 直接构建，没有质量检查

**必须包含：**
```yaml
jobs:
  quality-check:
    steps:
      - run: pnpm lint
      - run: pnpm test
  
  build:
    needs: quality-check  # 依赖质量检查
```

---

### 4. Assets 命名错误
**现象：** `-1.0.0.dmg` 或 `Setup.exe`（缺少 Pie 前缀）

**原因：** electron-builder 配置中 productName 未设置

**解决：**
```json
{
  "build": {
    "productName": "Pie"
  }
}
```

---

## Release 发布前检查清单

- [ ] 所有 package.json 版本号一致
- [ ] CI 包含 lint 和 test
- [ ] electron-builder productName = "Pie"
- [ ] 本地构建测试通过
- [ ] 安装包命名正确

---

## 责任人
- **DevOps:** CI/CD 配置维护
- **Sprint Master:** 审批配置变更，审核检查清单
