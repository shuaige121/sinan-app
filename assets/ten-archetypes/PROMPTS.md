# 司南十象生成说明

> 已停止沿用：本文件记录的是上一版精致 anime 立绘方案，仅供追溯，不得继续生成或接入产品。当前母本与落地规则见 `CHANGMING-DESIGN-SYSTEM.md`。

生成日期：2026-08-08

## 模式

- OpenAI built-in `image_gen`
- 原图尺寸：1024 × 1536
- 透明处理：flat chroma-key + `remove_chroma_key.py`
- 最终格式：RGBA PNG

## 统一风格提示

Original Japanese hand-drawn 2D anime character concept art; variable-width graphite-and-ink linework; slightly imperfect human strokes; restrained watercolor/gouache texture; hand-painted cel shading; subtle paper grain; mature fantasy proportions; antique Chinese-inspired layered clothing; full-body mobile result-card composition; no text, watermark, scenery, 3D rendering, glossy skin, chibi proportions, excessive particles, or franchise imitation.

## 角色提示集

- 甲木 · 苍松守卫：pine-tree silhouette, dark ink green, annual-ring motifs, living-wood staff, upright protection.
- 乙木 · 灵藤旅者：willow silhouette, moss and celadon, vine sash, seed satchel, adaptable connection.
- 丙火 · 赤阳行者：open triangular silhouette, vermilion and charcoal, sun-ray motifs, radiant charm.
- 丁火 · 灯灵守夜人：candle-flame silhouette, burgundy and smoky indigo, antique hand lantern, intimate warmth.
- 戊土 · 山岳镇守：broad square silhouette, ochre and umber, stratified-rock motifs, ceremonial earth tablet.
- 己土 · 谷地育灵：soft rounded silhouette, terracotta and rice-paper cream, terrace-field motifs, covered seed basket.
- 庚金 · 白刃侠客：sharp diagonal silhouette, silver white and charcoal, forged-metal motifs, straight sheathed sword.
- 辛金 · 月华匠师：narrow crescent silhouette, pearl white and smoky lavender, filigree, hand mirror and jeweler stylus.
- 壬水 · 玄潮航者：wide wave silhouette, midnight blue and deep teal, current motifs, navigation ring.
- 癸水 · 夜雨观星者：descending-rain silhouette, ink indigo and mist blue, rain/constellation motifs, closed umbrella and star-chart disk.

每位角色以甲木透明图作为画风参考，仅继承线条、材质、比例和服装系统，不复制脸、发型、姿态或道具。
