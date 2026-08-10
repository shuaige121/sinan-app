#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
司南 · 语料溯源门禁（provenance）
================================================================
背景：rules.v1.json 的 corpus_manifest 用「整份 annotated 文件 sha256」，任何 bai/gloss
注释层编辑都会让它失配（实测 22 本中 19 本失配）——看似溯源已坏，实则 514 条规则的原文引用
全部完好。本工具把溯源从「整文件 hash」升级为「只绑定 {book,ch,i,NFC(orig)} 的语义 hash」，
于是：注释层随便改不误报，只有真正动了原文才会红。语义 hash 实现与 translate_tool 同源。

子命令：
  verify   断言 ① 514 条规则 quote⊆orig ② 每本 annotated 坐标 (ch,i) 唯一
                ③ 语义 manifest 与 rules.v1.json 存的一致（若已 rehash）。任一失败 exit 1。
  rehash   计算每本 annotated 语义 hash，写入 rules.v1.json（corpus_manifest_semantic，
           旧整文件 manifest 存为 corpus_manifest_legacy）与 skips.v1.json（corpus_hash_semantic，
           旧存为 corpus_hash_legacy）。幂等。
"""
import sys, os, json, hashlib, unicodedata, glob

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
from translate_tool import (ANNOT, RULES, book_semantic_hash, iter_sentences,  # noqa: E402
                            load_annot)

SKIPS = os.path.join(os.path.dirname(RULES), "skips.v1.json")
NFC = lambda s: unicodedata.normalize("NFC", s or "")


def orig_index(annot):
    """{(ch,i): NFC(orig)}；同时返回重复坐标列表（应为空）。"""
    idx, dup = {}, []
    for cid, i, orig in iter_sentences(annot):
        if (cid, i) in idx:
            dup.append((cid, i))
        idx[(cid, i)] = NFC(orig)
    return idx, dup


def _annot_books():
    return sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(ANNOT, "*.json")))


def semantic_manifest():
    """{'<book>.json': 'sha256:...'}，覆盖全部 annotated。"""
    out = {}
    for book in _annot_books():
        out[book + ".json"] = book_semantic_hash(load_annot(book))
    return out


# ------------------------------------------------------------------ verify
def cmd_verify():
    rules = json.load(open(RULES, encoding="utf-8"))
    rule_list = rules.get("rules", [])
    cache, errs = {}, []

    # ① quote ⊆ orig
    missing_coord = quote_miss = 0
    for r in rule_list:
        s = r.get("src") or {}
        b, c, i = s.get("book"), s.get("ch"), s.get("i")
        q = NFC(r.get("quote", ""))
        if not b or c is None or i is None or not q:
            continue
        if b not in cache:
            try:
                cache[b] = orig_index(load_annot(b))[0]
            except SystemExit:
                cache[b] = {}
        orig = cache[b].get((c, i))
        if orig is None:
            missing_coord += 1
            errs.append(f"[coord] 规则 {r.get('id')} 指向 {b}/{c}/{i} 无对应句")
        elif q not in orig:
            quote_miss += 1
            errs.append(f"[quote] 规则 {r.get('id')} quote 不在 {b}/{c}/{i} 的 orig 内")

    # ② 坐标唯一性
    dup_total = 0
    for book in _annot_books():
        _, dup = orig_index(load_annot(book))
        if dup:
            dup_total += len(dup)
            errs.append(f"[dup] {book} 坐标重复: {dup[:5]}")

    # ③ 语义 manifest 一致性（若已 rehash）
    stored = rules.get("meta", {}).get("corpus_manifest_semantic")
    drift = 0
    if stored:
        live = semantic_manifest()
        for k, v in live.items():
            if stored.get(k) != v:
                drift += 1
                errs.append(f"[manifest] {k} 语义 hash 漂移（原文已改？）")

    print(f"provenance verify：规则 {len(rule_list)} 条")
    print(f"  ① quote⊆orig：缺坐标 {missing_coord}，quote 失配 {quote_miss}"
          f"  → {'✓' if missing_coord == 0 and quote_miss == 0 else '✗'}")
    print(f"  ② 坐标唯一：重复 {dup_total}  → {'✓' if dup_total == 0 else '✗'}")
    print(f"  ③ 语义 manifest：{'未 rehash（跳过）' if not stored else f'漂移 {drift} → ' + ('✓' if drift == 0 else '✗')}")
    for e in errs[:20]:
        print("    " + e)
    ok = (missing_coord == 0 and quote_miss == 0 and dup_total == 0 and drift == 0)
    return 0 if ok else 1


# ------------------------------------------------------------------ rehash
def _dump(path, obj, indent):
    json.dump(obj, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=indent)


def cmd_rehash():
    man = semantic_manifest()
    overall = "sha256:" + hashlib.sha256(
        json.dumps(man, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()

    # rules.v1.json（indent=1）
    rules = json.load(open(RULES, encoding="utf-8"))
    m = rules.setdefault("meta", {})
    if "corpus_manifest" in m and "corpus_manifest_legacy" not in m:
        m["corpus_manifest_legacy"] = m["corpus_manifest"]
    if "corpus_hash" in m and "corpus_hash_legacy" not in m:
        m["corpus_hash_legacy"] = m["corpus_hash"]
    m["corpus_manifest_semantic"] = man
    m["corpus_hash_semantic"] = overall
    m["provenance_note"] = ("语义 hash = canonical JSON of [{book,ch,i,NFC(orig)}] 的 sha256；"
                            "只绑原文，注释层(bai/gloss)编辑不影响。verify: provenance_tool.py verify。"
                            "旧整文件 hash 存于 *_legacy 仅作存档。")
    _dump(RULES, rules, 1)

    # skips.v1.json（indent=2）
    if os.path.exists(SKIPS):
        sk = json.load(open(SKIPS, encoding="utf-8"))
        sm = sk.setdefault("meta", {})
        if "corpus_hash" in sm and "corpus_hash_legacy" not in sm:
            sm["corpus_hash_legacy"] = sm["corpus_hash"]
        sm["corpus_hash_semantic"] = overall
        _dump(SKIPS, sk, 2)

    print(f"rehash 完成：{len(man)} 本语义 hash 写入 rules.v1.json + skips.v1.json")
    print(f"  overall semantic corpus hash: {overall}")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "verify":
        sys.exit(cmd_verify())
    elif cmd == "rehash":
        cmd_rehash()
    else:
        print("用法: provenance_tool.py {verify|rehash}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
