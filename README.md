# 司南

司南是一个以古籍原文为依据的移动端研究与交互项目，包含指南针罗盘、典籍阁、八字结构展示与“常明城”十干人物创作。

产品不把“吉凶”当成简单的好坏判定；页面优先展示古籍出处、结构关系和可复核解释。

## 写给下一个改这个项目的人

三条从实际返工里换来的规矩：

1. **输入不可信时不要出结论。** 排盘表单曾把农历四格预填成一个具体生日并直接放行——用户一个字不输就能拿到一张不属于自己的命盘，而且自己发现不了。同类的还有：没有传感器读数时不要把 0° 当朝向，没有定位时不要在别人的屋顶上出风水断语。宁可降级呈现或拒绝出结论，也不要用默认值静默补齐。
2. **失败要说出口。** 「点了没反应」是最糟的状态。`disabled` 的按钮收不到 click，用户永远得不到反馈；用 `aria-disabled` 保留点击并说明缺什么。拒绝授权后不要把功能藏掉，留一个可以再点的入口。
3. **解释层建好了还要接线。** `www/js/plain-glossary.js` 有 240+ 条白话词条，但曾经有几处术语最密的地方从没读过它。新增术语时确认它在词条表里，并且渲染处真的调了 `renderTerm()`。

最近一次全面可用性审计与修复记录：[docs/UX-FIXES-2026-08-13.md](docs/UX-FIXES-2026-08-13.md)。

## 主要目录

- `www/`：Web/PWA 源码，也是 Capacitor 的 Web 入口。
- `www/dian/`：典籍阁阅读器、数据与译注。
- `assets/ten-archetypes/`：常明城人物、故事、PDF、设计源文件与过程资产。
- `android/`、`ios/`：Capacitor 原生工程。

## 本地运行

```bash
npm install
python3 -m http.server 8766 --directory www
```

原生工程同步：

```bash
npx cap sync
```

## 部署

Web 版发布到 Cloudflare Pages 项目 `xuanji-daoshi`（绑 dao.leonardchow.work）。它是 **direct upload，不绑 Git —— `git push` 不会触发任何部署**，必须手动直传：

```bash
cd ~/sinan-app
CLOUDFLARE_API_TOKEN=$CF_API_TOKEN \
NODE_OPTIONS=--dns-result-order=ipv4first \
npx -y wrangler@latest pages deploy www \
  --project-name xuanji-daoshi --branch main --commit-dirty=true
```

几个必须知道的点：

- **`--branch main` 不能省**。生产分支是 `main`；用别的分支名会被当成 preview，不上生产域名。
- **改了 `www/js/*` 或 `www/css/*` 要同步 bump `www/index.html` 里的 `?v=` 戳**，否则客户端会继续用旧文件。典籍阁另有自己的戳（`www/dian/index.html`）和 Service Worker 缓存版本（`www/dian/sw.js` 的 `CACHE`），两处要一起改。
- token 会过期。发之前先验：
  `curl -s https://api.cloudflare.com/client/v4/user/tokens/verify -H "Authorization: Bearer $TOKEN"`
- 整包替换：`pages deploy www` 会用本地 `www/` 覆盖线上全部内容，发之前确认工作区就是你想要的状态。

## 部署后怎么核验（别只看状态码）

站点开了 SPA fallback：**任何不存在的路径都返回 `200` + `text/html`**，内容就是 `index.html`。只 curl 状态码会 100% 被骗过——曾经据此以为人物立绘已上线，实际上一张都没发出去。

可信的判据是三件一起看：

```bash
# 1. content-type 对不对  2. 字节数和本地一不一致  3. 阴性对照返回什么
curl -sL -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" \
  https://dao.leonardchow.work/img/ten-archetypes/human/v8/full-body/gui-water.png
curl -sL -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" \
  https://dao.leonardchow.work/img/ten-archetypes/human/v8/full-body/NOPE-99999.png
```

对照组和「真实资源」返回同样的字节数，就说明那个资源根本不在线上。

比对 JS/CSS 时**加 cache-buster**（`?cb=$RANDOM`），否则会取到 CF 边缘缓存的旧副本，误判成"没部署成功"。

## 前端验证

改完界面别只看代码，用真浏览器跑一遍：

```bash
python3 -m http.server 8766 --directory www          # 本地
export NODE_PATH=$(npm root -g)                      # playwright 装在全局
```

几条踩过的坑：

- 开屏 `#opening` 是全屏遮罩，**必须先点掉**，否则所有点击都被它吃掉。
- **不要用 Playwright 的 `locator.screenshot()` 截超出视口的高元素**：它会滚动拼接，把 `position:fixed` 的 tabbar 混进去，拼出现实中不存在的画面。判断"用户看不看得见"一律用 `page.screenshot()`。
- 光看 `getComputedStyle` 不够。曾经出现过属性全对、但人物被上层不透明渐变盖掉的情况；反过来也有过截图看着不对、其实是截图工具的假象。两种证据都要。
- 界面有分支就逐个验（五行各自最少 / 五行等量 / 中英文），只验一种会漏掉整类问题。

## 授权不是“一刀切”

罗盘和典籍阁的指定代码以 MIT License 开放；动画人物、角色视觉与故事世界观保留全部艺术与创作权利。古籍原文和第三方材料继续遵守各自来源许可。完整边界见 [LICENSE.md](LICENSE.md)。

欢迎对学术原文、翻译、注释和引用位置提出有来源的指正，格式见 [CONTRIBUTING.md](CONTRIBUTING.md)。

