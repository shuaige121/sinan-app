# 合影参考素材

这些文件由十张全身身份图机械拼接而成，没有重新生脸。当前使用 v2 比例，角色高度按 `BODY-SCALE.md` 换算，己·沃野以 190 cm／900 px 为标尺；v1 文件保留作历史对照。

## 文件结构

- `cast-10-standing-reference-v2.png`：当前十人站位板，上排甲丙戊庚壬，下排乙丁己辛癸。
- `relationship-contact-sheet-v2.png`：当前 14 组关系参考总览；第一行同部、第二行五合、第三行四冲。
- `scaled-cells-v2/`：当前统一画布、保留相对身高的十张合影单元。
- `same-element/`：木、火、土、金、水五组同部参考。
- `he-pairs/`：甲己、乙庚、丙辛、丁壬、戊癸五合参考。
- `chong-pairs/`：甲庚、乙辛、丙壬、丁癸四冲参考。

同部、五合与四冲目录里优先使用 `*-v2.png`。其中丙／丁的固定语法是“展开的凤凰状态／收拢的凤凰卵状态”：前者向外给予，后者护住最后火种；图生图不能把它误画成两套凤凰服装。

`same-element/fire-bing-ding-story-v1.png` 是火部关系母图：忘归处于向外的晨光与公共工坊，西窗处于明暗交界并护住卵形火种。它定义视觉方向，不代表凤凰已经孵化、城市已经平衡或故事已有结局。

## 图生图规则

将一个组合素材作为 identity reference，只在 prompt 中新增动作、背景和灯光：

```text
Preserve every person's face, haircut, apparent age, body type, relative height, clothing and signature detail independently.
Do not merge faces, swap outfits, change gender presentation, equalize body sizes, or recolor clothing by element.
Create only this interaction: [动作].
Place them in: [background-materials 中的场景].
Lighting: [光线]. Match face-study-a exactly.
```

五合不是默认恋爱；四冲不是善恶对决。动作必须从关系方向与具体故事事件中产生。

总览板只用于挑选组合；正式图生图优先输入对应的单组 PNG，减少身份串位。
