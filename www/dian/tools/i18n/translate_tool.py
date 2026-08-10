#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
司南 · 古籍英译层（Layer B）工具
================================================================
把 Fable 提出的「逐句 origHash 钉定防过期」变成可执行断言，并按引擎实际引用面
排出翻译优先级。译文分片见 daos/data/translations/en/<book>.json（schema:
daos/data/schema/translation.en.schema.json）。

铁律（与架构一致）：
  - 原文永不落译文库：sidecar 只存 origHash（annotated 里 orig 的 sha256 前 8 位，NFC 归一）。
  - 不写回 annotated/*.json：那是 rules 编译器的 corpus_hash 锚定输入，动它作废规则溯源。
  - 缺译=诚实空白：渲染层只显 orig，不回落 bai。

子命令：
  hash    <book>       打印某书每句的 {ch,i,origHash,orig}（构造/更新译文分片用）
  surface [--top N]    从 rules.v1.json 的句级 src 指针推导「被引用面」，排翻译优先级
  validate [book]      校验 translations/en/*.json：结构 + 每句 origHash 是否仍匹配现原文
                       退出码非 0 表示有 stale/结构错误（可进 CI / pre-commit）
"""
import sys, os, json, hashlib, argparse, unicodedata, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))   # daos/
ANNOT = os.path.join(ROOT, "data", "annotated")
TRANS = os.path.join(ROOT, "data", "translations", "en")
RULES = os.path.join(ROOT, "data", "rules", "rules.v1.json")
SCHEMA = os.path.join(ROOT, "data", "schema", "translation.en.schema.json")
GLOSSARY = os.path.join(ROOT, "data", "glossary.json")


def orig_hash(orig: str) -> str:
    """句级短哈希：NFC 归一后 sha256 取前 8 位十六进制。原文一改即变，用于过期检测。"""
    norm = unicodedata.normalize("NFC", orig)
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()[:8]


def book_src_hash(path: str) -> str:
    """整书原始文件 sha256（legacy：注释层任何编辑都会变，故已弃用作 srcHash）。"""
    with open(path, "rb") as f:
        return "sha256:" + hashlib.sha256(f.read()).hexdigest()


def book_semantic_hash(annot: dict) -> str:
    """整书语义 hash：只绑定 {book,ch,i,NFC(orig)} 的 canonical JSON。
    与 provenance manifest 同源——bai/gloss/annotation 等注释层编辑不改变它，
    故编辑注释层不会 stale 译文 sidecar 或规则溯源（Codex S2 决议：canonical 序列化
    绑定坐标边界，而非裸 NFC 拼接）。"""
    book = annot.get("id", "")
    seq = [{"book": book, "ch": cid, "i": i, "orig": unicodedata.normalize("NFC", orig)}
           for cid, i, orig in iter_sentences(annot)]
    canon = json.dumps(seq, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return "sha256:" + hashlib.sha256(canon.encode("utf-8")).hexdigest()


def load_annot(book: str) -> dict:
    p = os.path.join(ANNOT, book + ".json")
    if not os.path.exists(p):
        raise SystemExit(f"✗ 无 annotated 文件：{p}")
    return json.load(open(p, encoding="utf-8"))


def iter_sentences(annot: dict):
    """产出 (ch_id, i, orig)。跳过 orig 为空或【待补】的桩句。"""
    for ch in annot.get("chapters", []):
        cid = ch.get("id")
        for idx, s in enumerate(ch.get("sentences", [])):
            orig = s.get("orig", "")
            if not orig or orig == "【待补】":
                continue
            i = s.get("i", idx)
            yield cid, i, orig


# ---------------------------------------------------------------- hash
def cmd_hash(args):
    annot = load_annot(args.book)
    out = [{"ch": cid, "i": i, "origHash": orig_hash(orig), "orig": orig}
           for cid, i, orig in iter_sentences(annot)]
    print(json.dumps({
        "book": args.book,
        "srcFile": f"annotated/{args.book}.json",
        "srcHash": book_semantic_hash(annot),
        "count": len(out),
        "sentences": out,
    }, ensure_ascii=False, indent=2))


# ---------------------------------------------------------------- prep
def _book_title(annot: dict):
    """从 glossary.json bookTitles 按书名查 en/pinyin（种子；查不到留空）。"""
    title = annot.get("title", "")
    if not os.path.exists(GLOSSARY):
        return "", ""
    g = json.load(open(GLOSSARY, encoding="utf-8"))
    for b in g.get("bookTitles", []):
        if b.get("hanzi") == title:
            return b.get("en", ""), b.get("pinyin", "")
    return "", ""


def cmd_prep(args):
    """确定性地把一部书的翻译输入喂给流水线：每句 orig(逐字)+bai(帮助理解)+origHash(工具算，
    LLM 不碰)。译者只回 en 等字段，流水线再按 (ch,i) 贴回 origHash。"""
    annot = load_annot(args.book)
    bai = {}
    for ch in annot.get("chapters", []):
        cid = ch.get("id")
        for idx, s in enumerate(ch.get("sentences", [])):
            bai[(cid, s.get("i", idx))] = s.get("bai", "")
    sents = [{"ch": cid, "i": i, "origHash": orig_hash(orig), "orig": orig,
              "bai": bai.get((cid, i), "")}
             for cid, i, orig in iter_sentences(annot)]
    if getattr(args, "only_cited", False):
        _, pairs = cited_pairs()
        want = {(b, c, i) for (b, c, i) in pairs if b == args.book}
        sents = [s for s in sents if (args.book, s["ch"], s["i"]) in want]
    te, tp = _book_title(annot)
    print(json.dumps({
        "book": args.book,
        "srcFile": f"annotated/{args.book}.json",
        "srcHash": book_semantic_hash(annot),
        "titleEn": te, "titlePinyin": tp,
        "count": len(sents),
        "sentences": sents,
    }, ensure_ascii=False))


# ---------------------------------------------------------------- surface
def cited_pairs():
    """真实被引用面：只读 rules[].src 的结构化 {book,ch,i}，按句址去重。
    （不要递归全 JSON——那会把结构化 src 与形如 book/ch/i 的规则 id 重复计数，
    虚高 3 倍：旧实现报 919，实为 272。）"""
    if not os.path.exists(RULES):
        raise SystemExit(f"✗ 无 rules 文件：{RULES}")
    rules = json.load(open(RULES, encoding="utf-8")).get("rules", [])
    from collections import OrderedDict
    pairs = OrderedDict()
    for r in rules:
        s = r.get("src") or {}
        if all(k in s for k in ("book", "ch", "i")):
            pairs[(s["book"], s["ch"], s["i"])] = pairs.get((s["book"], s["ch"], s["i"]), 0) + 1
    return rules, pairs


def cmd_surface():
    rules, pairs = cited_pairs()
    from collections import Counter
    perbook = Counter(k[0] for k in pairs)
    print(json.dumps({
        "note": "真实被引用面：rules[].src 去重后的 (book,ch,i) 句址（翻译优先级：先译被引用面）",
        "ruleRows": len(rules),
        "distinctSentences": len(pairs),
        "perBook": [{"book": b, "sentences": n} for b, n in perbook.most_common()],
    }, ensure_ascii=False, indent=2))


# ---------------------------------------------------------------- validate
def _load_schema_validator():
    try:
        import jsonschema  # type: ignore
        schema = json.load(open(SCHEMA, encoding="utf-8"))
        return lambda obj: jsonschema.Draft7Validator(schema).iter_errors(obj)
    except Exception:
        return None


def _structural_check(obj):
    """jsonschema 不可用时的最小结构校验。"""
    errs = []
    for k in ("book", "srcFile", "srcHash", "sentences"):
        if k not in obj:
            errs.append(f"缺顶层字段 {k}")
    for j, s in enumerate(obj.get("sentences", [])):
        for k in ("ch", "i", "origHash", "en"):
            if k not in s:
                errs.append(f"sentences[{j}] 缺 {k}")
        if s.get("en", "x") in ("", "TBD", "待确认", "[FIELD]"):
            errs.append(f"sentences[{j}] en 为空/占位（禁止）")
    return errs


def cmd_validate(args):
    files = ([os.path.join(TRANS, args.book + ".json")] if args.book
             else sorted(glob.glob(os.path.join(TRANS, "*.json"))))
    if not files:
        print("（translations/en/ 为空——尚无译文分片，视为通过）")
        return 0
    validator = _load_schema_validator()
    total_stale = total_err = 0
    for fp in files:
        if not os.path.exists(fp):
            print(f"✗ {fp} 不存在"); total_err += 1; continue
        obj = json.load(open(fp, encoding="utf-8"))
        book = obj.get("book", os.path.basename(fp)[:-5])
        # 结构
        if validator:
            serrs = [f"{list(e.path)}: {e.message}" for e in validator(obj)]
        else:
            serrs = _structural_check(obj)
        # origHash 现值比对
        annot = load_annot(book)
        live = {(cid, i): orig_hash(orig) for cid, i, orig in iter_sentences(annot)}
        stale = []
        for s in obj.get("sentences", []):
            key = (s.get("ch"), s.get("i"))
            cur = live.get(key)
            if cur is None:
                stale.append(f"{key} 原文已不存在（章/句被删或改序）")
            elif cur != s.get("origHash"):
                stale.append(f"{key} origHash {s.get('origHash')} != 现 {cur}（原文已改，译文过期）")
        n = len(obj.get("sentences", []))
        tag = "✓" if not serrs and not stale else "✗"
        print(f"{tag} {book}: {n} 句译文；结构错 {len(serrs)}；过期 {len(stale)}")
        for e in serrs[:8]:
            print(f"    [schema] {e}")
        for e in stale[:8]:
            print(f"    [stale ] {e}")
        total_err += len(serrs); total_stale += len(stale)
    print(f"\n合计：结构错 {total_err}，过期 {total_stale}")
    return 1 if (total_err or total_stale) else 0


def main():
    ap = argparse.ArgumentParser(description="司南 古籍英译层工具")
    sub = ap.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("hash"); h.add_argument("book")
    pp = sub.add_parser("prep"); pp.add_argument("book")
    pp.add_argument("--only-cited", action="store_true", dest="only_cited",
                    help="只出被 rules[].src 引用的句子（翻译优先级：先译被引用面）")
    sub.add_parser("surface")
    v = sub.add_parser("validate"); v.add_argument("book", nargs="?")
    args = ap.parse_args()
    if args.cmd == "hash":
        cmd_hash(args)
    elif args.cmd == "prep":
        cmd_prep(args)
    elif args.cmd == "surface":
        cmd_surface()
    elif args.cmd == "validate":
        sys.exit(cmd_validate(args))


if __name__ == "__main__":
    main()
