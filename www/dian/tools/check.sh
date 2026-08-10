#!/usr/bin/env bash
# 司南 · 语料/i18n 门禁总入口
# ---------------------------------------------------------------------------
# 打包：provenance verify（原文溯源）+ 译文 validate（结构/过期）+ surface 口径 sanity
#      + glossary lint（禁语/声调/三源对比，当前 advisory）。
# 用法：bash daos/tools/check.sh
# CI（.github/workflows/corpus-check.yml）与本地 pre-commit 均调此脚本 —— 单一门禁真源。
# 任一硬检失败 → exit 1。
# ---------------------------------------------------------------------------
set -uo pipefail
D="$(cd "$(dirname "$0")/.." && pwd)"   # → daos/
FAIL=0

echo "▶ provenance verify（514 规则 quote⊆orig + 坐标唯一 + 语义 manifest）"
python3 "$D/tools/i18n/provenance_tool.py" verify || FAIL=1

echo "▶ translations validate（sidecar 结构 + 逐句 origHash 过期）"
python3 "$D/tools/i18n/translate_tool.py" validate || FAIL=1

echo "▶ surface sanity（规则被引用面期望 distinctSentences=272）"
if python3 "$D/tools/i18n/translate_tool.py" surface | grep -q '"distinctSentences": 272'; then
  echo "  ✓ 272"
else
  echo "  ✗ surface 口径变了（rules 引用面变动，需人工确认后更新期望值）"; FAIL=1
fi

echo "▶ glossary lint（禁语/声调/三源对比，advisory）"
python3 "$D/tools/i18n/glossary_lint.py" || echo "  (lint 报告了问题；当前 advisory 不阻断 check，放量翻译前转 enforce)"

echo
if [ "$FAIL" = 0 ]; then echo "✓ check 全绿"; else echo "✗ check 有失败（见上）"; fi
exit $FAIL
