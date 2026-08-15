# 角色组合与合影工作流

## 原则

角色身份与场景生成分成两步：先确定“谁在场”，再生成“他们正在做什么”。不要把整张十人表当成通用 reference，也不要为了修改一人重跑十人。

## A + B 合影

1. 从 `manifest.json` 读取各角色当前确认的 `full_body` 文件。
2. 优先使用 `_shared/ensemble-materials/` 中已按身高缩放的组合参考；新组合再使用 `compose-reference.sh`。
3. 将参考图作为 identity reference，prompt 只描述动作、相对位置、背景和灯光。
4. 生成后逐人检查：脸、发型、体型、服装、标志物、视觉性别。
5. 不合格时只指出一个漂移点迭代，不重新解释整套画风。

推荐 prompt 骨架：

```text
Input image is an identity reference containing [角色 A] and [角色 B].
Preserve each person's face, haircut, apparent age, body type, clothing and signature detail independently.
Do not merge identities, swap clothing, change gender presentation, or mechanically recolor them by element.
Create only this scene: [动作与关系].
Background: [地点]. Lighting: [光线]. Camera: [构图].
Match face-study-a exactly; do not reinterpret or enhance the drawing style.
```

## 十人合影

十人合影分两轮：

1. 以 `_shared/ensemble-materials/cast-10-standing-reference-v2.png` 为当前身份板确定站位。
2. 从 `_shared/background-materials/` 选择场景，再图生图生成共同动作与无属性环境光。

十人共同目标必须表现为“十种力量在不同位置完成各自不可替代的一段”，不画永久完成的结局。白光只在五行动态均衡时出现；失衡状态应显示相应色差，而不是默认白光。

同部火组的动作不能只是并排站立：忘归的线条向外展开、把光分给环境；西窗的线条向内合拢、把最后一点火种护在两手之间。两者构成同一股火从“卵”到“凤凰”再回到火种的开放循环，但画面不得锁定孵化或复燃已经完成。

## 版本规则

- 已确认图不覆盖，使用 `portrait-v8i.png`、`portrait-v8j.png` 递增。
- `manifest.json` 的 `portrait` 指向当前确认版。
- 十人表使用新版本名拼回，例如 `face-study-i`。
- 角色文件夹保存身份资产；`concepts/` 保存十人表与探索稿；`ensemble/` 保存正式合影。
