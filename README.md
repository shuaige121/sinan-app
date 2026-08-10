# 司南

司南是一个以古籍原文为依据的移动端研究与交互项目，包含指南针罗盘、典籍阁、八字结构展示与“常明城”十干人物创作。

产品不把“吉凶”当成简单的好坏判定；页面优先展示古籍出处、结构关系和可复核解释。

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

## 授权不是“一刀切”

罗盘和典籍阁的指定代码以 MIT License 开放；动画人物、角色视觉与故事世界观保留全部艺术与创作权利。古籍原文和第三方材料继续遵守各自来源许可。完整边界见 [LICENSE.md](LICENSE.md)。

欢迎对学术原文、翻译、注释和引用位置提出有来源的指正，格式见 [CONTRIBUTING.md](CONTRIBUTING.md)。

