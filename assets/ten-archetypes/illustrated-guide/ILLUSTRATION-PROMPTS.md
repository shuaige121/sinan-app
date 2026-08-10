# 《常明城·十干角色图鉴》插画生成记录

生成日期：2026-08-09  
修订：V2 · 衡枢设定  
模式：OpenAI built-in `image_gen`  
角色与画风参考：`../concepts/changming-character-calibration-v3.png`

## 统一画风

```text
Match the reference image's warm handmade-paper texture, slightly wobbly ink line,
flat matte gouache colors, charming simplified Japanese storybook drawing, and
deliberately low-detail finish. The image is an environmental plate for an A4
landscape illustrated character guide. Leave calm negative space for typesetting.
Do not include characters, people, text, labels, symbols, watermark, glossy 3D,
photorealism, ornate fantasy architecture, neon magic, or excessive detail.
```

## 常明城全景

```text
An elevated three-quarter panoramic view of 常明城, a circular five-part city
organized around a low, open, element-neutral convergence court called 衡枢.
Show connected districts transitioning into an outer blue-green forest, a
vermilion fire district, ochre dikes and terraced fields, silver-gray mines and
workshops, and dark navy canals, wells and rain-fed waterways. Five restrained
luminous streams in green, red, ochre, pale silver and navy meet at the exact
center and overlap into material-less white light with a hairline spectral fringe.
The center is only a synchronization point: no furnace, chimney, flame, smoke,
orange core, palace, crystal, white building or sixth-element symbol. Keep the
five districts equal in area and visual authority. Dusk and generous calm sky for
the cover title.
```

## 木部背景

```text
A northern forest grown on cold earth, mixing tall straight dark blue-green trunks
with flexible pale vines that reinforce simple wooden structures. Show one older
cleared patch with quiet stumps and a younger living grove beyond it, expressing
growth, sacrifice and recovery. Leave an open warm-paper clearing for layout.
```

## 火部背景

```text
The fire district: one broad open daytime furnace court connected to a
narrow night patrol walkway lined with small protective lamp niches. The central
district furnace gives light and heat locally, but its walls visibly require careful control. Express
both indiscriminate daylight and one tiny focused lamp. Furnace orange only inside
the fire district's furnace and one lamp niche; never use it as the city-center color.
```

## 土部背景

```text
A massive ochre dike and foundation crossing terraced fields, with an ink-line
survey reel near one exact boundary. The same wall protects the city and closes an
old outward road. Small healthy crops and unwanted weeds grow together, expressing
protection, nurture and blurred boundaries.
```

## 金部背景

```text
One practical mine-and-forge yard meets one quiet precise jade workshop. Show a
plain downward-resting axe near rough ore and an unfinished pale jade piece on a
clean workbench. The contrast is usefulness versus perfection, not violence versus
luxury. Cold silver-gray, charcoal and a tiny pale jade accent.
```

## 水部背景

```text
A dark navy river enters through a cut in the mountains, becomes wells and branching
canals, then leaves the city as fine rain and narrow roads that visually loop back.
Include one closed travel bag beside a milestone and barefoot wet footprints that
fade before reaching the edge, expressing travel, return and invisible influence.
```

## PDF 资产说明

- 十人角色图由校准板拆分为 RGBA PNG，没有重新设计角色。
- 五种关系动作采用 `../concepts/changming-relation-grammar-v2.png`。
- 排版源文件：`build/guide.html`。
- 角色拆分脚本：`build/extract_characters.py`。
- PDF 背景优化脚本：`build/prepare_pdf_images.py`。
- 衡枢全景：`backgrounds/changming-city-panorama-v2-hengshu.png`。
- 最终传阅版：`常明城-十干角色图鉴-衡枢修订版-v2.pdf`。
