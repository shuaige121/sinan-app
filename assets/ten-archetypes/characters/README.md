# 常明城角色母版

这里是十位角色的独立资产源。脸部母版仍为 `v8H`，画风以 `face-study-a` 为准；当前全身图、背景与比例版本由 `manifest.json` 指定，旧版本不覆盖。

## 目录约定

每个角色文件夹包含：

- `portrait-v8h.png`：从当前十人母版无损裁出的单人图。
- `full-body-v*.png`：按设定身高、体重和体型生成的版本化全身身份图。
- `story-background-v*.png`：版本化无人物故事背景，可直接用于后续合成。
- `CHARACTER.md`：人物志、关系拓扑、视觉锁定和单人修改边界。
- `BASE-PROMPT.md`：可独立使用的基础生图 prompt，已写入年龄、身高、体重和身份锁定。

`manifest.json` 记录角色 ID、当前文件、十人表格坐标、视觉性别和体格数据。`BODY-SCALE.md` 是十人身高、体重、年龄与群像比例的总表。阴阳不是性别；视觉性别与体格是角色设计选择，不参与五行算法。

共享素材位于 `_shared/`：

- `background-materials/`：十张集中管理的无人物故事背景。
- `ensemble-materials/`：按设定身高比例整理的十人站位板、五组同部、五合与四冲合影参考。

## 修改单个角色

1. 使用目标角色当前确认的 `portrait-v8h.png` 或 `manifest.json` 指向的全身图作为 edit target。
2. `face-study-a` 只作为画风参考。
3. 直接使用目标文件夹的 `BASE-PROMPT.md`，再追加本次需要改变的动作、表情、背景和灯光。
4. 新图使用递增版本名，例如 `portrait-v8i.png`，不得覆盖已确认版本。
5. 确认单人图后再拼回十人表；不得重新生成其他九人。

## 合影与关系图

可以直接使用 `_shared/ensemble-materials/` 中已整理的组合参考；临时组合则用 `compose-reference.sh` 将需要出场的全身图并排，再把参考图送入 image edit / image generation，只让模型生成动作、场景与光线：

```bash
./compose-reference.sh /tmp/jia-geng-reference.png \
  01-jia-wood-guangmo/full-body-v2.png \
  07-geng-metal-yunjin/full-body-v1.png
```

合影 prompt 必须明确：逐人保持脸、发型、体型、服装和标志物；不得融合两人的五官、服装或元素颜色。`COMPOSITION.md` 提供完整流程。

丙／丁共享“火的循环”但不能长成同一种人：丙是凤凰展开、太阳与大火向外给予的状态；丁是凤凰卵收拢、守住最后火种与未来可能的状态。凤凰只通过动作、光和小型功能性细节表达，不作为服装 cosplay。

## 当前排列

十人表不是编号顺序，而是阳干在上、阴干在下：

- 上排：甲、丙、戊、庚、壬
- 下排：乙、丁、己、辛、癸

母版：[changming-character-v8-face-study-h-modular-cast.png](../concepts/changming-character-v8-face-study-h-modular-cast.png)
