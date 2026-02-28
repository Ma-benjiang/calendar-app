#!/bin/bash
# Sprint Master 启动脚本
# 用法: ./start-sprint.sh "功能描述"

SPRINT_ID=$(date +%s)
FEATURE="$1"

echo "═══════════════════════════════════════"
echo "🚀 Sprint Master - 全自动敏捷开发 v2.0"
echo "═══════════════════════════════════════"
echo "Sprint ID: $SPRINT_ID"
echo "功能: $FEATURE"
echo "═══════════════════════════════════════"
echo ""

# 创建 Sprint 工作目录
mkdir -p .sprint/current/$SPRINT_ID/{messages,reports,artifacts}
echo "{\"sprintId\": $SPRINT_ID, \"feature\": \"$FEATURE\", \"status\": \"INIT\", \"startTime\": $(date +%s), \"agents\": {}, \"backlog\": []}" > .sprint/current/$SPRINT_ID/status.json

echo "✅ Sprint 工作目录已创建"
echo ""
echo "下一步：启动 Sprint Master 代理协调所有子代理"
echo ""
echo "代理团队配置:"
echo "  📝 Product Owner   - 需求分析"
echo "  🔍 Researcher      - 市场调研"
echo "  🏗️  Tech Lead       - 架构设计"
echo "  👨‍💻 Developer x3    - 并行开发"
echo "  🧪 QA Engineer     - 测试验收"
echo "  🔍 Code Reviewer   - 代码审查"
echo "  🐛 Bug Fixer       - 自动修复"
echo "  🚀 DevOps          - 发布部署"
echo ""
echo "预计完成时间: 30-45 分钟"
