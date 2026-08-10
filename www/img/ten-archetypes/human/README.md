# 常明城全人形 PNG 资产协议

App 已按以下固定路径接线。未来完成单人立绘后，只需要用同名文件放入本目录，不需要修改 HTML、CSS 或 JavaScript。

Web 版刷新后直接生效；打包 iOS / Android 前运行 `npx cap copy`，把同一批静态资源复制进原生壳即可。

## 十张单人立绘

- `jia-wood.png`：甲·青拓
- `yi-wood.png`：乙·青蔓
- `bing-fire.png`：丙·明曜
- `ding-fire.png`：丁·明微
- `wu-earth.png`：戊·厚岳
- `ji-earth.png`：己·厚禾
- `geng-metal.png`：庚·锐断
- `xin-metal.png`：辛·锐琢
- `ren-water.png`：壬·渊行
- `gui-water.png`：癸·渊润

建议规格：透明 PNG，1024 × 1536，人物完整入画，四周保留至少 6% 安全边距，不带文字、背景、投影或外发光。十张图的脚底基线、头身比例和光源方向保持一致。

## 可选十人合影

- `changming-ensemble.png`：最终十人合影，建议透明或完整场景 PNG。

合影不存在时，App 会自动用十张单人 PNG 合成常明城站位；合影文件导入后，App 自动切换为最终图。背景 `changming-city-hengshu.jpg` 已就位。

## 缺图行为

单人或合影 PNG 尚未导入时，页面显示中性人形 fallback，不会引用旧版元素怪物，也不会出现破图图标。
