#!/bin/bash
# 常明城十人改名：mascot 代号 → 古籍典故名
# 用法：bash rename.sh            执行
#       bash rename.sh --dry      只统计不改
#       bash rename.sh --revert   回滚
#
# 旧名新名均为两字，1:1 替换。天干（甲乙丙丁…）是命理计算层，一律不动。

set -euo pipefail
ROOT="/Users/leonardchow/sinan-app/assets/ten-archetypes"

# 干 : 旧名 : 新名 : 出处
MAP=(
  "甲:青拓:广莫:《庄子·逍遥游》无何有之乡，广莫之野"
  "乙:青蔓:南枝:《古诗十九首·行行重行行》越鸟巢南枝"
  "丙:明曜:忘归:《楚辞·九歌·东君》观者憺兮忘归"
  "丁:明微:西窗:李商隐《夜雨寄北》何当共剪西窗烛"
  "戊:厚岳:不周:《山海经·大荒西经》有山而不合，名曰不周"
  "己:厚禾:守拙:陶渊明《归园田居·其一》守拙归园田"
  "庚:锐断:运斤:《庄子·徐无鬼》匠石运斤成风"
  "辛:锐琢:有瑕:《史记·廉颇蔺相如列传》璧有瑕，请指示王"
  "壬:渊行:既望:苏轼《前赤壁赋》壬戌之秋，七月既望"
  "癸:渊润:雪泥:苏轼《和子由渑池怀旧》应似飞鸿踏雪泥"
)

TARGETS=(
  "$ROOT/stories/_parts"/*.md
  "$ROOT/stories/OUTLINE-MASTER.md"
  "$ROOT/CHANGMING-STORY-BIBLE-v2.md"
  "$ROOT/CHANGMING-WORLD-v2.md"
  "$ROOT/CHANGMING-DESIGN-SYSTEM.md"
)

MODE="${1:-run}"

if [ "$MODE" = "--dry" ]; then
  echo "=== 改名统计（不写盘）==="
  for e in "${MAP[@]}"; do
    IFS=':' read -r gan old new src <<< "$e"
    n=$(grep -oh "$old" "${TARGETS[@]}" 2>/dev/null | wc -l | tr -d ' ')
    printf "%s  %s → %-4s  %5s 处   %s\n" "$gan" "$old" "$new" "$n" "$src"
  done
  # 反向检查：新名是否已在正文里当普通词用过，用过就会被误伤
  echo
  echo "=== 新名撞词检查（非零需人工看）==="
  for e in "${MAP[@]}"; do
    IFS=':' read -r gan old new src <<< "$e"
    n=$(grep -oh "$new" "${TARGETS[@]}" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$n" != "0" ]; then printf "  !! %s 已出现 %s 处，替换后会与人名混淆\n" "$new" "$n"; fi
  done
  echo "（无输出＝无撞词）"
  exit 0
fi

if [ "$MODE" = "--revert" ]; then
  echo "=== 回滚 ==="
  for f in "${TARGETS[@]}"; do
    if [ -f "$f.bak" ]; then mv "$f.bak" "$f" && echo "  ← $(basename "$f")"; fi
  done
  exit 0
fi

echo "=== 执行改名（原文件备份为 .bak）==="
for f in "${TARGETS[@]}"; do
  [ -f "$f" ] || continue
  cp "$f" "$f.bak"
  for e in "${MAP[@]}"; do
    IFS=':' read -r gan old new src <<< "$e"
    perl -i -pe "s/\Q$old\E/$new/g" "$f"
  done
  echo "  ✓ $(basename "$f")"
done

echo
echo "=== 残留检查（应全部为 0）==="
for e in "${MAP[@]}"; do
  IFS=':' read -r gan old new src <<< "$e"
  n=$(grep -oh "$old" "${TARGETS[@]}" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$n" != "0" ]; then printf "  !! %s 仍残留 %s 处\n" "$old" "$n"; fi
done
echo "完成。回滚：bash rename.sh --revert"
