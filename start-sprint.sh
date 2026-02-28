#!/bin/bash
# Sprint 启动脚本 - 结合角色模板 + 状态持久化

SPRINT_NAME="$1"
FEATURE="$2"

if [ -z "$SPRINT_NAME" ] || [ -z "$FEATURE" ]; then
  echo "用法: ./start-sprint.sh <sprint-name> <feature-description>"
  echo "示例: ./start-sprint.sh sprint-3 '自然语言输入功能'"
  exit 1
fi

echo "═══════════════════════════════════════════"
echo "🚀 Sprint 启动器 - 结合模板 + 状态持久化"
echo "═══════════════════════════════════════════"
echo "Sprint: $SPRINT_NAME"
echo "功能: $FEATURE"
echo "═══════════════════════════════════════════"
echo ""

# 创建Sprint目录
mkdir -p .sprint/sprints/$SPRINT_NAME
echo "✅ Sprint目录已创建: .sprint/sprints/$SPRINT_NAME"

# 保存Sprint状态
cat > .sprint/sprints/$SPRINT_NAME/meta.json << EOF
{
  "sprintId": "$SPRINT_NAME",
  "feature": "$FEATURE",
  "status": "init",
  "startTime": "$(date -Iseconds)",
  "phases": {
    "phase1": "pending",
    "phase2": "pending",
    "phase3": "pending",
    "phase4": "pending",
    "phase5": "pending"
  }
}
EOF
echo "✅ Sprint元数据已保存"
echo ""

# 显示各代理状态
echo "📋 代理团队状态:"
echo ""

for role in ProductOwner TechLead Developer QAEngineer CodeReviewer BugFixer DevOps SprintMaster; do
  STATE_FILE=".sprint/agents/${role}-state.json"
  if [ -f "$STATE_FILE" ]; then
    LAST_SPRINT=$(cat "$STATE_FILE" | grep -o '"sprintId": "[^"]*"' | cut -d'"' -f4)
    STATUS=$(cat "$STATE_FILE" | grep -o '"status": "[^"]*"' | cut -d'"' -f4)
    echo "  $role: 上次 $LAST_SPRINT ($STATUS)"
  else
    echo "  $role: 新代理 (无历史状态)"
  fi
done

echo ""
echo "═══════════════════════════════════════════"
echo "下一步: 启动 Sprint Master 代理"
echo "═══════════════════════════════════════════"
echo ""
echo "Sprint Master 将:"
echo "  1. 读取角色模板 (标准行为)"
echo "  2. 加载代理状态 (上下文记忆)"
echo "  3. 启动各Phase代理"
echo "  4. 协调整个Sprint流程"
echo ""
echo "启动命令:"
echo "  告诉 AI: '启动 $SPRINT_NAME，实现 $FEATURE'"
